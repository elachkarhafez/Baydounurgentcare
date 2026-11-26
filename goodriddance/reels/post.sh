#!/usr/bin/env bash
# Good Riddance Junk Removal autoposter.
# Publishes the next reel from queue.json that isn't on the account yet, through the Instagram Graph API.
# The access token is never in this file: the session's network proxy adds it to requests to graph.facebook.com.
set -euo pipefail
IG=17841443138141505
G=https://graph.facebook.com/v21.0
BASE=${BASE:-https://goodriddancejunk.vercel.app/reels}
DRY=${DRY:-0}   # DRY=1: create and check the container, don't publish
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
curl -fsS "$BASE/queue.json" -o "$TMP/q.json"
curl -sS "$G/$IG/media?fields=caption&limit=100" -o "$TMP/m.json"
python3 -I - "$TMP" <<'PY'
import json,sys,os
d=sys.argv[1]; q=json.load(open(d+'/q.json')); m=json.load(open(d+'/m.json'))
if 'error' in m: print('GRAPH ERROR', m['error'].get('message')); sys.exit(2)
posted={(x.get('caption') or '').split('\n')[0].strip() for x in m.get('data',[])}
left=[x for x in q if x['caption'].split('\n')[0].strip() not in posted]
open(d+'/left','w').write(str(len(left)))
if left: json.dump(left[0],open(d+'/next.json','w'))
PY
LEFT=$(cat "$TMP/left")
if [ "$LEFT" = 0 ]; then echo "QUEUE EMPTY: every reel in queue.json is already posted"; exit 3; fi
ID=$(python3 -I -c 'import json,sys;print(json.load(open(sys.argv[1]))["id"])' "$TMP/next.json")
FILE=$(python3 -I -c 'import json,sys;print(json.load(open(sys.argv[1]))["file"])' "$TMP/next.json")
python3 -I -c 'import json,sys;print(json.load(open(sys.argv[1]))["caption"],end="")' "$TMP/next.json" > "$TMP/cap"
echo "next: $ID ($FILE), $LEFT unposted"
curl -sS -X POST "$G/$IG/media" --data-urlencode media_type=REELS --data-urlencode "video_url=$BASE/$FILE" \
  --data-urlencode "caption@$TMP/cap" --data-urlencode share_to_feed=true -o "$TMP/c.json"
CID=$(python3 -I -c 'import json,sys;j=json.load(open(sys.argv[1]));print(j.get("id",""));
import sys as s
"error" in j and print("CREATE ERROR",j["error"].get("message"),file=s.stderr)' "$TMP/c.json")
[ -n "$CID" ] || { cat "$TMP/c.json"; exit 4; }
for i in $(seq 1 40); do
  ST=$(curl -sS "$G/$CID?fields=status_code,status" | python3 -I -c 'import json,sys;j=json.load(sys.stdin);print(j.get("status_code","?"),j.get("status",""))')
  case "$ST" in FINISHED*) break;; ERROR*|EXPIRED*) echo "container failed: $ST"; exit 5;; esac
  sleep 8
done
case "$ST" in FINISHED*) ;; *) echo "container not ready after 5 min: $ST"; exit 6;; esac
if [ "$DRY" = 1 ]; then echo "DRY RUN OK: container $CID is ready, not published"; exit 0; fi
curl -sS -X POST "$G/$IG/media_publish" --data-urlencode "creation_id=$CID" -o "$TMP/p.json"
MID=$(python3 -I -c 'import json,sys;print(json.load(open(sys.argv[1])).get("id",""))' "$TMP/p.json")
[ -n "$MID" ] || { cat "$TMP/p.json"; exit 7; }
LINK=$(curl -sS "$G/$MID?fields=permalink" | python3 -I -c 'import json,sys;print(json.load(sys.stdin).get("permalink",""))')
echo "PUBLISHED $ID -> $LINK ($((LEFT-1)) left in the queue)"
