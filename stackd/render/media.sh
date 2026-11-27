#!/bin/bash
# Build stackd/media/*.webp from the real sources in render/srcimg (their posts and the reviewers' collab reels with @stackd_bars).
#   reel-hamzzz.mp4   = instagram.com/reel/DfXY_OaBGa-  (@big_hamzzzreviews x @stackd_bars, tagged Dearborn, Michigan)
#   reel-arena.mp4    = instagram.com/reel/Df_SB5qzjtf  (@halalfoodjunkie x @stackd_bars, at Little Caesars Arena)
#   post-hfj-*.jpg    = instagram.com/p/DgOgfhgFmKt     (@halalfoodjunkie x @stackd_bars carousel)
#   menu-flyer-1080.jpg = instagram.com/p/DfXpfx5Ppjr (their menu flyer)
# Frames are pulled at fixed times (picked by eye, then the sharpest frame within +-0.4 s).
# Usage: bash media.sh   (ffmpeg, ImageMagick, python3 with cv2)
set -e
cd "$(dirname "$0")"
M=../media; mkdir -p $M fr
grab() { /usr/bin/python3 -I sharp.py "$1" "$2" "$3" "$4" "$5" "$6" "$7" "fr/$8.jpg"; }
H=srcimg/reel-hamzzz.mp4; A=srcimg/reel-arena.mp4
# flavour photos (square, the bar itself)
grab $H 23.6 24.4 20 480 380 380 lotus
grab $H 38.6 39.4 0 720 420 420 strawberry
grab $H 55.6 56.4 30 640 360 360 oreo
grab $A 22.6 23.6 40 560 400 400 banana
grab $A 22.6 23.4 300 470 380 380 pumpkin
grab $A 25.6 26.4 10 640 400 400 apple
convert srcimg/menu-flyer-1080.jpg -crop 120x84+645+362 +repage -resize 400x280 fr/plain.jpg
for f in lotus strawberry oreo banana pumpkin apple; do convert fr/$f.jpg -resize 480x480 -unsharp 0x.6 -quality 80 $M/f-$f.webp; done
convert fr/plain.jpg -quality 82 $M/f-plain.webp
# box / tray photos (4:3)
grab $H 3.6 4.6 0 660 720 540 box
grab $A 23.0 24.0 0 330 720 540 tray

for f in box tray; do convert fr/$f.jpg -resize 720x540 -quality 80 $M/p-$f.webp; done
# reel frames (3:4) for the reviewer cards
grab $H 4.3 4.7 0 30 720 960 rh1
grab $H 9.8 10.2 0 260 720 960 rh2
grab $H 39.0 39.4 0 220 720 960 rh3
grab $A 0.6 1.2 0 120 720 960 ra1
grab $A 23.3 23.7 0 120 720 960 ra2
grab $A 61.0 62.0 0 160 720 960 ra3
convert srcimg/post-hfj-1.jpg fr/rf1.jpg
convert srcimg/post-hfj-2.jpg fr/rf2.jpg
for f in rh1 rh2 rh3 ra1 ra2 ra3 rf1 rf2; do convert fr/$f.jpg -resize 450x600 -quality 74 $M/r-$f.webp; done
ls -la $M
