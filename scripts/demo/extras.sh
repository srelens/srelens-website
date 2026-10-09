#!/usr/bin/env bash
# Add a Helm release with history, Argo CD with an Application, and MetalLB in BGP mode
# peering with an FRR router container, to the srelens-demo kind cluster.
#   bash scripts/demo/extras.sh   (from the repo root; needs kind, kubectl, docker)
# Uses an isolated kubeconfig (.superpowers/capture/kubeconfig-host); never ~/.kube/config.
set -euo pipefail
CAP=.superpowers/capture
mkdir -p "$CAP"
[ -f "$CAP/kubeconfig-host" ] || kind get kubeconfig --name srelens-demo > "$CAP/kubeconfig-host"
K="kubectl --kubeconfig $CAP/kubeconfig-host --context kind-srelens-demo"
kind get kubeconfig --name srelens-demo --internal > "$CAP/kubeconfig"
HOSTDIR="$(pwd -W 2>/dev/null || pwd)"
helm() { MSYS_NO_PATHCONV=1 docker run --rm --network kind -v "$HOSTDIR/$CAP:/work" -e KUBECONFIG=/work/kubeconfig alpine/helm:3.16.2 "$@"; }

# Helm: one release, two revisions (skipped when revision 2 exists, so a re-run adds no history)
if ! $K -n checkout get secret sh.helm.release.v1.podinfo.v2 >/dev/null 2>&1; then
  helm upgrade --install podinfo oci://ghcr.io/stefanprodan/charts/podinfo --version 6.7.1 -n checkout --create-namespace --set replicaCount=1
  helm upgrade podinfo oci://ghcr.io/stefanprodan/charts/podinfo --version 6.7.1 -n checkout --set replicaCount=2 --set ui.message="srelens demo"
fi

# Argo CD + guestbook
$K create namespace argocd --dry-run=client -o yaml | $K apply -f -
$K apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.2/manifests/install.yaml
$K -n argocd rollout status deploy/argocd-repo-server --timeout=300s
$K apply -f scripts/demo/extras/argo-app.yaml

# BGP: FRR router on the kind network, MetalLB peering with it
docker rm -f srelens-demo-frr >/dev/null 2>&1 || true
NODES=$(docker ps --filter name=srelens-demo- --format '{{.Names}}' | grep -v frr)
{
  echo "frr defaults traditional"
  echo "router bgp 64512"
  echo " no bgp ebgp-requires-policy"
  for n in $NODES; do echo " neighbor $(docker inspect -f '{{.NetworkSettings.Networks.kind.IPAddress}}' "$n") remote-as 64513"; done
} > "$CAP/frr.conf"
MSYS_NO_PATHCONV=1 docker run -d --name srelens-demo-frr --network kind --privileged \
  -v "$HOSTDIR/$CAP/frr.conf:/etc/frr/frr.conf" -v "$HOSTDIR/scripts/demo/extras/frr/daemons:/etc/frr/daemons" \
  quay.io/frrouting/frr:9.1.0 >/dev/null   # Docker Hub frrouting/frr stops at v8.4.1; FRR 9.x is on quay.io
FRR_IP=$(docker inspect -f '{{.NetworkSettings.Networks.kind.IPAddress}}' srelens-demo-frr)
# The kind network lists an IPv6 subnet first on some hosts; take the IPv4 one.
SUBNET=$(docker network inspect kind -f '{{range .IPAM.Config}}{{println .Subnet}}{{end}}' | tr -d '\r' | grep -v : | head -n 1)
POOL="${SUBNET%.*.*}.255.200-${SUBNET%.*.*}.255.220"
$K apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml
$K -n metallb-system rollout status deploy/controller --timeout=300s
# Kubernetes 1.36 rejects every BGPPeer: the CRD pairs `format: int32` with `maximum: 4294967295`
# on the ASN fields (still the case in MetalLB v0.15.3). int64 is the correct format for that range.
P=/spec/versions S=schema/openAPIV3Schema/properties/spec/properties
$K patch crd bgppeers.metallb.io --type=json -p "[
  {\"op\":\"replace\",\"path\":\"$P/0/$S/myASN/format\",\"value\":\"int64\"},
  {\"op\":\"replace\",\"path\":\"$P/0/$S/peerASN/format\",\"value\":\"int64\"},
  {\"op\":\"replace\",\"path\":\"$P/1/$S/myASN/format\",\"value\":\"int64\"},
  {\"op\":\"replace\",\"path\":\"$P/1/$S/peerASN/format\",\"value\":\"int64\"}]"
sed -e "s/@FRR_IP@/$FRR_IP/" -e "s/@POOL@/$POOL/" scripts/demo/extras/metallb.yaml.tmpl | $K apply -f -
echo "FRR $FRR_IP, pool $POOL"
