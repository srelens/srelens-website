#!/usr/bin/env bash
# Capture every TUI feature listed in /work/tui-captures.tsv with the published srelens-tui.
# Runs inside ubuntu:24.04 on the "kind" Docker network, like capture.sh.
#   ONLY=a,b  captures just those rows.   VERSION=0.15.0  is the release to install.
# Columns: name <TAB> srelens-tui arguments <TAB> key batches (tmux send-keys tokens, "|" splits batches 2 s apart).
set -euo pipefail
VERSION="${VERSION:-0.15.0}"
ONLY="${ONLY:-}"
export DEBIAN_FRONTEND=noninteractive TERM=xterm-256color COLORTERM=truecolor
apt-get update -qq && apt-get install -y -qq tmux curl ca-certificates >/dev/null
curl -fsSL https://srelens.com/install.sh | sh -s -- --version "$VERSION"
export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
srelens-tui version
mkdir -p /work/out
while IFS=$'\t' read -r name args keys; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  [[ -n "$ONLY" && ",$ONLY," != *",$name,"* ]] && continue
  # shellcheck disable=SC2086  # $args is a word list on purpose
  tmux new-session -d -s cap -x 120 -y 32 "srelens-tui $args"
  sleep 8
  IFS='|' read -ra batches <<< "${keys:-}"
  for batch in "${batches[@]}"; do
    # shellcheck disable=SC2086  # $batch is a list of tmux key tokens on purpose
    [[ -n "${batch// /}" ]] && tmux send-keys -t cap $batch
    sleep 2
  done
  tmux capture-pane -p -e -t cap > "/work/out/$name.ansi"
  tmux kill-session -t cap
  echo "captured $name"
done < /work/tui-captures.tsv
