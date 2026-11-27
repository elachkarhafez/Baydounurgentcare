#!/bin/bash
# Build holybaklava/media/*.webp from their own posts (render/srcimg) and the photos the first build pulled (media/*.jpg).
#   nutella-coffeetalks.jpg = instagram.com/p/DgQGWoUuXfh  ("Nutella Baklava to satisfy all your cravings", photo @_coffeetalks)
#   both-post.jpg           = instagram.com/p/C5d9Zq_rVRM  (Nutella row over Lotus row with a Lotus biscuit)
#   cookies-post.jpg        = instagram.com/p/C5d94HiLsjR  ("we are now offering cookies")
#   heart-reel-cover.jpg    = instagram.com/p/DCvBowmRkmP  ("What's your favorite?" reel cover); media/tray.mp4 is a clip of that reel
#   first-build/*.jpg       = the photos the Nov 7 build pulled from their posts (p-*, tray-poster = frames of the trays)
#   menu-post.jpg           = instagram.com/p/DfhfRuXRt5d  (Small Box 18 pcs $30 / Large Box 32 pcs $50 / +$10 mixed)
#   logo-post-1008.jpg      = instagram.com/p/DfcuIrnOjQc  (the new logo, by @jzsignsdesigns)
# Usage: bash render/media.sh   (ImageMagick)
set -e
R="$(cd "$(dirname "$0")" && pwd)"; M="$R/../media"; I="$R/srcimg"
q() { local out="${@: -1}"; convert "${@:1:$#-1}" -strip -quality 80 "$out"; }
# flavour plates (4:3)
q "$I/nutella-coffeetalks.jpg" -crop 720x540+0+590 +repage -resize 800x600 "$M/f-nutella.webp"
q "$I/both-post.jpg" -crop 1080x810+0+500 +repage -resize 800x600 "$M/f-lotus.webp"
# gallery (3:4)
q "$I/nutella-coffeetalks.jpg" -crop 720x960+0+320 +repage -resize 600x800 "$M/g-coffeetalks.webp"
q "$I/both-post.jpg" -crop 1080x1350+0+0 +repage -resize 600x750 -gravity center -extent 600x750 "$M/g-both.webp"
q "$I/cookies-post.jpg" -resize 600x749 "$M/g-cookies.webp"
q "$I/heart-reel-cover.jpg" -resize 600x600 "$M/g-heart.webp"
for f in p-both p-pan p-tray p-nutella; do q "$I/first-build/$f.jpg" -resize 600x800 "$M/g-${f#p-}.webp"; done
# cookies (round slots)
q "$I/cookies-post.jpg" -crop 440x440+210+560 +repage -resize 280x280 "$M/ck-biscoff.webp"
q "$I/cookies-post.jpg" -crop 300x300+610+270 +repage -resize 280x280 "$M/ck-brown.webp"
# review card poster + the reel clip stays as tray.mp4 (480x640)
q "$I/first-build/tray-poster.jpg" "$M/tray-poster.webp"
ls -la "$M"
