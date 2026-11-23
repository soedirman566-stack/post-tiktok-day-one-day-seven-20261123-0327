#!/bin/bash
# Assemble the five vertical segments from the captured frame sequences.
# Layout: dark blurred game backdrop, the game itself (still camera, full
# map) in a centred band, big DAY 1 / DAY 7 titles above, captions below.
set -e
cd ~/workspace/makefun/entry-tiktok
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
BASE="[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=40,eq=brightness=-0.18:saturation=0.65[bg];[b]scale=1080:675[fg];[bg][fg]overlay=0:560"
TITLE="drawtext=fontfile=$FONT:text='%s':fontsize=118:fontcolor=%s:borderw=3:bordercolor=black:x=(w-text_w)/2:y=270"
SUB="drawtext=fontfile=$FONT:textfile=txt/%s:fontsize=50:fontcolor=0xFFD23E:borderw=2:bordercolor=black:x=(w-text_w)/2:y=445"
LABEL="drawtext=fontfile=$FONT:text='%s':fontsize=66:fontcolor=%s:borderw=3:bordercolor=black:x=(w-text_w)/2:y=300"
BOT="drawtext=fontfile=$FONT:textfile=txt/%s:fontsize=52:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=1470"

seg () { # name framesdir start seconds extra-filter
  ffmpeg -y -v error -framerate 12 -start_number "$3" -i "$2/f%04d.jpg" \
    -filter_complex "$BASE,$5,fps=30,format=yuv420p[v]" -map "[v]" -t "$4" \
    -c:v libx264 -pix_fmt yuv420p -crf 19 "seg/$1.mp4"
}

seg s1 frames-day1 0 3.75 "$(printf "$TITLE" 'DAY 1' white),$(printf "$SUB" s1sub.txt)"
seg s2 frames-day7 0 3.75 "$(printf "$TITLE" 'DAY 7' 0xFF6EB5),$(printf "$SUB" s2sub.txt)"
seg s3 frames-day1 45 3.75 "$(printf "$LABEL" 'DAY 1' white),$(printf "$BOT" s3bot.txt)"
seg s4 frames-day7 45 3.75 "$(printf "$LABEL" 'DAY 7' 0xFF6EB5),$(printf "$BOT" s4bot.txt)"
seg s5 frames-day7 90 6.333 "$(printf "$LABEL" 'DAY 7' 0xFF6EB5),drawtext=fontfile=$FONT:textfile=txt/s5big.txt:fontsize=62:fontcolor=0xFFD23E:borderw=3:bordercolor=black:x=(w-text_w)/2:y=1420:enable='gte(t,0.8)'"

for f in seg/s1.mp4 seg/s2.mp4 seg/s3.mp4 seg/s4.mp4 seg/s5.mp4; do
  echo "$f $(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)s"
done
