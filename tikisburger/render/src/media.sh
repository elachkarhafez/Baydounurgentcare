#!/usr/bin/env bash
set -e
F=/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/fx
V=/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/posts/vid
M=/home/user/Baydounurgentcare/.claude/worktrees/agent-aa806fbc77814f6d0/tikisburger/media
mkdir -p "$M"
sq() { convert "$F/$1.jpg" -crop 720x720+0+$2 +repage -resize 640x640 -quality 80 "$M/$3.webp"; }
sq build_done 300 zinger
sq held_cheese 230 cheese
sq held_bbq 180 bbq
sq held_crispy 180 crispy-burger
sq hotdog 240 hotdog
sq fries_pour 330 fries
sq build_mozz 200 mozz-patty
sq build_sauce 300 sauce
sq tray_top 360 tray
convert "$F/chef_tray.jpg" -crop 720x540+0+740 +repage -resize 900x -quality 80 "$M/hero.webp"
convert "$F/box_offer.jpg" -crop 720x900+0+60 +repage -resize 640x -quality 80 "$M/box.webp"
convert "$F/chef_sign.jpg" -crop 720x430+0+0 +repage -resize 900x -quality 82 "$M/sign.webp"
convert /tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/menu/tikizzinger.jpg -resize 640x640 -quality 82 "$M/zinger-ad.webp"
enc() { ffmpeg -loglevel error -y "$@" -an -c:v libx264 -preset slow -crf 33 -pix_fmt yuv420p -movflags +faststart; }
# the build: sauce, crispy, mozzarella patty, cheddar + bbq (sped up)
enc -i "$V/DgItyZwNCq_.mp4" -filter_complex "[0:v]trim=6:9,setpts=PTS-STARTPTS[a];[0:v]trim=20.5:24,setpts=PTS-STARTPTS[b];[0:v]trim=29:33,setpts=PTS-STARTPTS[c];[0:v]trim=42:47,setpts=PTS-STARTPTS[d];[a][b][c][d]concat=n=4:v=1[v];[v]setpts=PTS/1.6,scale=360:640,fps=30[o]" -map "[o]" "$M/build.mp4"
enc -ss 18.5 -t 5 -i "$V/DfsDSCPtBa9.mp4" -vf "scale=360:640,fps=30" "$M/fries.mp4"
enc -ss 0 -t 6 -i "$V/DfiGsWfNjNO.mp4" -vf "scale=360:640,fps=30" "$M/boxes.mp4"
for c in build fries boxes; do ffmpeg -loglevel error -y -ss 0.4 -i "$M/$c.mp4" -frames:v 1 -q:v 3 "/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/p_$c.jpg"; convert "/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/p_$c.jpg" -quality 70 "$M/$c-poster.webp"; done
ls -la "$M"; du -sh "$M"
