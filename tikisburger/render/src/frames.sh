#!/usr/bin/env bash
# full-res frames + short clips from their public reels
V=/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/posts/vid
O=/tmp/claude-0/-home-user-Baydounurgentcare/d614465f-65b2-511b-9847-8ee0665a973e/scratchpad/tikiz/fx
mkdir -p "$O"
grab() { ffmpeg -loglevel error -y -ss "$2" -i "$V/$1.mp4" -frames:v 1 -q:v 2 "$O/$3.jpg"; }
grab Df49l8MtxyX 4.5 tray_close
grab Df49l8MtxyX 1.0 chef_sign
grab Df49l8MtxyX 14 chef_tray
grab DgLdUYUNTeW 0.8 tray_all
grab DgLdUYUNTeW 9 held_cheese
grab DgLdUYUNTeW 13 held_crispy
grab DgLdUYUNTeW 15 held_bbq
grab DgLdUYUNTeW 21 hotdog
grab DgItyZwNCq_ 1 build_done
grab DgItyZwNCq_ 3 build_done2
grab DgItyZwNCq_ 8 build_sauce
grab DgItyZwNCq_ 22 build_crispy
grab DgItyZwNCq_ 31 build_mozz
grab DgItyZwNCq_ 46 build_bbq
grab DfsDSCPtBa9 1 tray_top
grab DfsDSCPtBa9 21 fries_pour
grab DfsDSCPtBa9 25 tray_full
grab Dfm-9QyN_WM 7 box_offer
grab Dfm-9QyN_WM 17 box_burger
grab DfiGsWfNjNO 1 boxes
grab DfiGsWfNjNO 17 box_held
grab DfiGsWfNjNO 21 box_crispy
ls "$O" | wc -l
cd "$O" && montage -label '%t' *.jpg -geometry 220x391+2+2 -tile 11x ../fxsheet.jpg
