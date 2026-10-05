#!/usr/bin/env bash
# After create_deployment: wait until the live page matches the local file, then check the AI-bot block and assets.
# usage: verify-live.sh <slug> <local-folder> [asset paths...]
set -u
U="https://$1.vercel.app"; F="$2/index.html"; shift 2
TMP=$(mktemp)
for i in $(seq 1 30); do curl -s -A "Mozilla/5.0 Chrome/128" "$U/" -o "$TMP"; cmp -s "$TMP" "$F" && { echo "LIVE-MATCH $U"; break; }; [ "$i" = 30 ] && echo "NOT MATCHING after 2 min"; sleep 4; done
echo "GPTBot → $(curl -s -o /dev/null -w '%{http_code}' -A 'GPTBot/1.2' "$U/") (want 403)"
for a in "$@"; do echo "$a → $(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Chrome/128' "$U/$a")"; done
rm -f "$TMP"
