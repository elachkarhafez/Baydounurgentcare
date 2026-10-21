#!/usr/bin/env bash
# frames → web video + posters.  usage: encode.sh <frames_dir> <site_media_dir>
set -e
F=$1; M=$2
ffmpeg -y -loglevel error -framerate 24 -i "$F/f_%04d.png" -vf "format=yuv420p" -c:v libx264 -preset slow -crf 19 -movflags +faststart -an "$M/bloom.mp4"
ffmpeg -y -loglevel error -framerate 24 -i "$F/f_%04d.png" -c:v libvpx-vp9 -b:v 0 -crf 30 -row-mt 1 -pix_fmt yuv420p -an "$M/bloom.webm"
first=$(ls "$F" | head -1); last=$(ls "$F" | tail -1)
python3 - "$F/$first" "$F/$last" "$M" <<'PY'
import sys
from PIL import Image
a, b, m = sys.argv[1:]
Image.open(a).convert('RGB').save(m + '/bloom-start.webp', quality=88)
Image.open(b).convert('RGB').save(m + '/bloom-end.webp', quality=90)
PY
ls -la "$M"
