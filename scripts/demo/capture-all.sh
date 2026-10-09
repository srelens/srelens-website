#!/usr/bin/env bash
# Capture every TUI feature listed in /work/tui-captures.tsv with the published srectl.
# Runs inside ubuntu:24.04 on the "kind" Docker network, like capture.sh; it installs with /work/install.sh, the repo copy of the upstream installer.
#   ONLY=a,b  captures just those rows.   VERSION=0.16.0  is the release to install.
# Columns: name <TAB> srectl arguments <TAB> key batches (tmux send-keys tokens, "|" splits batches 2 s apart)
#          <TAB> optional: seconds to wait after the keys before the screen is read (the assistant row waits for a model).
# The assistant row needs a key: pass ANTHROPIC_API_KEY (or OPENAI_API_KEY / GEMINI_API_KEY) with docker run -e NAME, no value.
# They reach srectl only through this container's environment; this script never prints, logs or writes them.
set -euo pipefail
VERSION="${VERSION:-0.16.0}"
ONLY="${ONLY:-}"
export DEBIAN_FRONTEND=noninteractive TERM=xterm-256color COLORTERM=truecolor
apt-get update -qq && apt-get install -y -qq tmux curl ca-certificates >/dev/null
( unset ANTHROPIC_API_KEY OPENAI_API_KEY GEMINI_API_KEY; sh /work/install.sh --version "$VERSION" )
# The capture is of $VERSION: without this, srectl adds "▲ Update: <newer release>" to every header (it asks api.github.com).
echo "127.0.0.1 api.github.com" >> /etc/hosts
export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
srectl version
mkdir -p /work/out
while IFS=$'\t' read -r name args keys wait; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  [[ -n "$ONLY" && ",$ONLY," != *",$name,"* ]] && continue
  # shellcheck disable=SC2086  # $args is a word list on purpose
  tmux new-session -d -s cap -x 120 -y 32 "srectl $args"
  sleep 8
  IFS='|' read -ra batches <<< "${keys:-}"
  for batch in "${batches[@]}"; do
    # shellcheck disable=SC2086  # $batch is a list of tmux key tokens on purpose
    [[ -n "${batch// /}" ]] && tmux send-keys -t cap $batch
    sleep 2
  done
  sleep "${wait:-0}"
  tmux capture-pane -p -e -t cap > "/work/out/$name.ansi"
  tmux kill-session -t cap
  echo "captured $name"
done < /work/tui-captures.tsv
