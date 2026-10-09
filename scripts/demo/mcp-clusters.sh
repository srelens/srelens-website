#!/usr/bin/env bash
# Create (default) or delete the three throwaway kind clusters for the homepage MCP demo.
# All three live in their own kubeconfig; ~/.kube/config is never read or written.
#   scripts/demo/mcp-clusters.sh [create|delete]
set -euo pipefail
cd "$(dirname "$0")/../.."
KC=.superpowers/capture/kubeconfig-mcp-host
CLUSTERS=(demo-eu demo-us demo-ap)
mkdir -p .superpowers/capture
if [[ "${1:-create}" == delete ]]; then
  for c in "${CLUSTERS[@]}"; do kind delete cluster --name "$c" --kubeconfig "$KC"; done
  exit 0
fi
for c in "${CLUSTERS[@]}"; do kind create cluster --name "$c" --kubeconfig "$KC" --wait 120s; done
for c in "${CLUSTERS[@]}"; do
  k="kubectl --kubeconfig $KC --context kind-$c -n default"
  $k apply -f scripts/demo/mcp/storefront.yaml -f scripts/demo/mcp/checkout.yaml
  $k rollout status deploy/storefront --timeout=180s
  $k rollout status deploy/checkout --timeout=180s
done
kubectl --kubeconfig "$KC" --context kind-demo-us -n default apply -f scripts/demo/mcp/ledger.yaml
kubectl --kubeconfig "$KC" --context kind-demo-ap -n default apply -f scripts/demo/mcp/checkout-stuck.yaml
# The container reaches the clusters by their internal addresses on the kind network.
for c in "${CLUSTERS[@]}"; do kind get kubeconfig --name "$c" --internal > ".superpowers/capture/kubeconfig-$c"; done
KUBECONFIG=".superpowers/capture/kubeconfig-demo-eu:.superpowers/capture/kubeconfig-demo-us:.superpowers/capture/kubeconfig-demo-ap" \
  kubectl config view --flatten > .superpowers/capture/kubeconfig-mcp
echo "clusters ready; container kubeconfig at .superpowers/capture/kubeconfig-mcp"
