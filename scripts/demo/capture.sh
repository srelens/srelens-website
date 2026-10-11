#!/usr/bin/env bash
# Runs inside an ubuntu:24.04 container on the "kind" Docker network.
# Installs srectl at the pinned version (with /work/install.sh, the repo copy of the
# upstream installer), opens the pods view in tmux and writes the colored screen to /work/pods.ansi.
#   JUMP=<n> moves the selection down n rows before capturing.
set -euo pipefail
VERSION="${VERSION:-0.16.0}"
JUMP="${JUMP:-0}"
export DEBIAN_FRONTEND=noninteractive TERM=xterm-256color COLORTERM=truecolor
apt-get update -qq && apt-get install -y -qq tmux curl ca-certificates >/dev/null
sh /work/install.sh --version "$VERSION"
export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
srectl version

tmux new-session -d -s cap -x 120 -y 32 "srectl -A"
sleep 8
tmux send-keys -t cap ':' ; sleep 0.5
tmux send-keys -t cap 'pods' Enter ; sleep 4
for _ in $(seq 1 "$JUMP"); do tmux send-keys -t cap 'j'; sleep 0.15; done
sleep 1
tmux capture-pane -p -e -t cap > /work/pods.ansi
tmux kill-session -t cap
echo "wrote /work/pods.ansi ($(wc -l < /work/pods.ansi) lines)"
