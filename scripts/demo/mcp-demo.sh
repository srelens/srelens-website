#!/usr/bin/env bash
# Runs inside ubuntu:24.04 on the "kind" Docker network: one real MCP stdio session against three kind clusters.
# Writes /work/out/mcp-rollouts.jsonl (every request and response, in order) and /work/out/mcp-rollouts.version.
set -euo pipefail
VERSION="${VERSION:-0.16.0}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq curl ca-certificates >/dev/null
sh /work/install.sh --version "$VERSION"
export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
export KUBECONFIG=/work/kubeconfig-mcp
mkdir -p /work/out
OUT=/work/out/mcp-rollouts.jsonl
: > "$OUT"
srectl version > /work/out/mcp-rollouts.version
mkfifo /tmp/mcp-in
srectl --mcp-stdio < /tmp/mcp-in > /tmp/mcp-out.jsonl 2> /tmp/mcp-err.log &
PID=$!
exec 3> /tmp/mcp-in
seen=0
flush() { local n; n=$(wc -l < /tmp/mcp-out.jsonl); if (( n > seen )); then sed -n "$((seen + 1)),${n}p" /tmp/mcp-out.jsonl >> "$OUT"; seen=$n; fi; }
send() { printf '%s\n' "$1" >&3; printf '%s\n' "$1" >> "$OUT"; sleep "${2:-3}"; flush; }
send '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"srelens-site-demo","version":"1"}}}'
send '{"jsonrpc":"2.0","method":"notifications/initialized"}' 1
send '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"k8s.listContexts","arguments":{}}}'
id=4
for ctx in kind-demo-eu kind-demo-us kind-demo-ap; do
  send "{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"tools/call\",\"params\":{\"name\":\"k8s.listDeployments\",\"arguments\":{\"context\":\"$ctx\",\"namespace\":\"default\"}}}" 6
  id=$((id + 1))
done
exec 3>&-
wait "$PID" || true
flush
echo "wrote $OUT ($(wc -l < "$OUT") lines)"
