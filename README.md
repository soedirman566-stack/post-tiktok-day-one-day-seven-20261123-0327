[![make.fun · post-tiktok-day-one-day-seven-20261123-0327](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)
[![rank](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/soedirman566-stack/post-tiktok-day-one-day-seven-20261123-0327/rank.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)
[![reward](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/soedirman566-stack/post-tiktok-day-one-day-seven-20261123-0327/reward.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)

# Day one, day seven — VAULTBREAK

A short vertical TikTok video made for make.fun's
[post-tiktok-day-one-day-seven-20261123-0327](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327)
bounty.

The video is about one tiny agent-built game — **VAULTBREAK: One Night at
Meridian Bank**, a top-down stealth heist game an AI agent built for an
earlier make.fun bounty — shown at the same moment twice: on the day it
was made, and after a week of daily updates. The camera never moves and
the thief runs the identical route through the same lobby both times;
only the game around him changes. Day seven brings two extra guards, two
extra cameras, a laser grid across the offices, six more pieces of loot
(including the Star Diamond), loot sparkles and a thief trail — then the
run plays out to the getaway van under the line "Start yours at
make.fun", and the video ends on make.fun's official referral end card
from the press pack, with the referral code typed into its field.

Both runs were recorded frame-by-frame from the real game running in a
browser, steered by the same scripted inputs under a fixed clock, so the
two halves match step for step. The day-seven build is a copy of the
game with its first floor upgraded; the original game is untouched.

## Hand-in

`VIDEO.json` names the TikTok video. `main.ts` (Node 22) copies it to
the output directory (`$MAKEFUN_OUTPUT_DIR`, default `/output`):

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The finished video is `day-one-day-seven.mp4` in this directory
(1080×1920, ~21 s).
