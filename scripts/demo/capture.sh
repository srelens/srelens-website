#!/usr/bin/env bash
# Runs inside an ubuntu:24.04 container on the "kind" Docker network.
# Installs srelens-tui at the pinned version, opens the pods view in tmux and
# writes the colored screen to /work/pods.ansi.
#   JUMP=<n> moves the selection down n rows before capturing.
set -euo pipefail
VERSION="${VERSION:-0.15.0}"
JUMP="${JUMP:-0}"
export DEBIAN_FRONTEND=noninteractive TERM=xterm-256color COLORTERM=truecolor
apt-get update -qq && apt-get install -y -qq tmux curl ca-certificates >/dev/null
curl -fsSL https://srelens.com/install.sh | sh -s -- --version "$VERSION"
export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
srelens-tui version

tmux new-session -d -s cap -x 120 -y 32 "srelens-tui -A"
sleep 8
tmux send-keys -t cap ':' ; sleep 0.5
tmux send-keys -t cap 'pods' Enter ; sleep 4
for _ in $(seq 1 "$JUMP"); do tmux send-keys -t cap 'j'; sleep 0.15; done
sleep 1
tmux capture-pane -p -e -t cap > /work/pods.ansi
tmux kill-session -t cap
echo "wrote /work/pods.ansi ($(wc -l < /work/pods.ansi) lines)"
