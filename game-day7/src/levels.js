// levels.js — the three floors of Meridian Bank: room layouts, patrols,
// cameras, loot, locked doors and (on the top floor) the laser grid.
//
// Maps are 32 x 18 tiles of 40 px, drawn under an 80 px HUD strip.
// Legend:  # wall        . floor        D door (open)
//          L locked door (hold E beside it to pick, then it stays open)
//          F furniture / pillar — blocks movement AND sight: your cover
//          V vent duct — the thief fits, guards never enter, sight passes
//          P thief start                X getaway van (loading dock)
//
// Loot kinds carry their value here so render and engine agree on worth.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const HUD_H = 80;

export const LOOT_KINDS = {
  stack:   { value: 100,  label: 'cash stack' },
  bag:     { value: 250,  label: 'cash bag' },
  painting:{ value: 350,  label: 'painting' },
  gold:    { value: 400,  label: 'gold bar' },
  gem:     { value: 500,  label: 'cut gem' },
  diamond: { value: 2500, label: 'THE STAR DIAMOND' },
};

export const LEVELS = [
  {
    name: 'Level 1 — Lobby & Offices',
    objective: 'Strip the offices, then slip out to the van at the loading dock.',
    par: 75,
    coins: 5,
    emps: 2,
    map: [
      '################################',
      '#......#............#..........#',
      '#......#.....F......#....F.....#',
      '#......D............D..........#',
      '#......#............#..........#',
      '#......#.....FF.....#..........#',
      '#......#............#....F.....#',
      '#......#............#..........#',
      '########............############',
      '#......#............#..........#',
      '#......D.....F......D..........#',
      '#......#............#....F.....#',
      '#......#............#..........#',
      '#......#.....FF.....#..........#',
      '#......#............#..........#',
      '#..P...#............#..........#',
      '#......#............#.........X#',
      '################################',
    ],
    loot: [
      { kind: 'stack', tx: 2,  ty: 2 },
      { kind: 'bag',   tx: 5,  ty: 6 },
      { kind: 'stack', tx: 2,  ty: 11 },
      { kind: 'bag',   tx: 14, ty: 15 },
      { kind: 'gem',   tx: 28, ty: 2 },
      { kind: 'stack', tx: 22, ty: 6 },
      { kind: 'gold',  tx: 28, ty: 15 },
      { kind: 'stack', tx: 23, ty: 11 },
      { kind: 'painting', tx: 10, ty: 2 },
      { kind: 'gold',  tx: 16, ty: 13 },
      { kind: 'bag',   tx: 18, ty: 7 },
      { kind: 'stack', tx: 11, ty: 15 },
      { kind: 'gem',   tx: 24, ty: 14 },
      { kind: 'diamond', tx: 25, ty: 3 },
    ],
    guards: [
      { patrol: [[9, 3], [18, 3], [18, 15], [9, 15]] },
      { patrol: [[22, 3], [29, 3], [29, 5], [22, 5]] },
      { patrol: [[10, 12], [17, 12], [17, 14], [10, 14]] },
      { patrol: [[23, 6], [29, 6], [29, 8], [23, 8]] },
    ],
    cameras: [
      { tx: 14, ty: 0, base: Math.PI / 2, sweep: 0.65, speed: 0.55, range: 190 },
      { tx: 24, ty: 0, base: Math.PI / 2, sweep: 0.6, speed: 0.7, range: 200 },
      { tx: 20, ty: 17, base: -Math.PI / 2, sweep: 0.55, speed: 0.6, range: 185 },
    ],
    lasers: [
      { tx: 22, period: 2.4, duty: 0.55, phase: 0.0 },
      { tx: 25, period: 2.4, duty: 0.55, phase: 0.8 },
      { tx: 28, period: 2.4, duty: 0.55, phase: 1.6 },
    ],
  },
  {
    name: 'Level 2 — Corridor of Eyes',
    objective: 'The corridor is watched end to end. Pick a lock — or take the vents.',
    par: 110,
    coins: 3,
    emps: 2,
    map: [
      '################################',
      '#.....VVVVVVVVVVVVVVVVVVV......#',
      '#.....#........#........#......#',
      '#.....#........#........#......#',
      '#.....#...F....#....F...#..F...#',
      '#.....#........#........#......#',
      '#.....#........#........#......#',
      '##########D#########L####......#',
      '#........................#.....#',
      '#....F......F.......F....D.....#',
      '#........................#.....#',
      '#........................#.....#',
      '###D######D#########L#####.....#',
      '#.....#........#........#......#',
      '#.....#...F....#....F...L......#',
      '#.....#........#........#......#',
      '#..P..#........#........#.....X#',
      '################################',
    ],
    loot: [
      { kind: 'stack',   tx: 8,  ty: 2 },
      { kind: 'bag',     tx: 13, ty: 5 },
      { kind: 'gem',     tx: 22, ty: 3 },
      { kind: 'gold',    tx: 17, ty: 5 },
      { kind: 'stack',   tx: 8,  ty: 14 },
      { kind: 'painting',tx: 12, ty: 13 },
      { kind: 'gold',    tx: 21, ty: 15 },
      { kind: 'stack',   tx: 17, ty: 13 },
      { kind: 'painting',tx: 29, ty: 10 },
      { kind: 'bag',     tx: 27, ty: 15 },
      { kind: 'stack',   tx: 29, ty: 3 },
      { kind: 'stack',   tx: 2,  ty: 13 },
    ],
    guards: [
      { patrol: [[4, 9], [21, 9]] },
      { patrol: [[8, 3], [13, 3], [13, 5], [8, 5]] },
      { patrol: [[17, 13], [22, 13], [22, 16], [17, 16]] },
    ],
    cameras: [
      { tx: 8,  ty: 7,  base: Math.PI / 2,  sweep: 0.7,  speed: 0.7,  range: 185 },
      { tx: 18, ty: 12, base: -Math.PI / 2, sweep: 0.7,  speed: 0.6,  range: 185 },
      { tx: 25, ty: 8,  base: 0,            sweep: 0.5,  speed: 0.8,  range: 170 },
    ],
    lasers: [],
  },
  {
    name: 'Level 3 — The Vault',
    objective: 'Cross the laser grid, empty the vault, and run for the van.',
    par: 130,
    coins: 4,
    emps: 2,
    map: [
      '################################',
      '#..................#...........#',
      '#....F......F......#.....F.....#',
      '#..................#...........#',
      '#..................#...........#',
      '########D################L######',
      '#..................#...........#',
      '#..................D...........#',
      '#....F......F......#...........#',
      '#..................#############',
      '#..............................#',
      '#.....F......F.......F.........#',
      '#..............................#',
      '#..............................#',
      '#.....F......F.......F.........#',
      '#..............................#',
      '#.P...........................X#',
      '################################',
    ],
    loot: [
      { kind: 'gold',    tx: 2,  ty: 1 },
      { kind: 'stack',   tx: 17, ty: 1 },
      { kind: 'painting',tx: 9,  ty: 4 },
      { kind: 'bag',     tx: 2,  ty: 8 },
      { kind: 'stack',   tx: 17, ty: 6 },
      { kind: 'bag',     tx: 3,  ty: 13 },
      { kind: 'gold',    tx: 28, ty: 11 },
      { kind: 'stack',   tx: 12, ty: 15 },
      { kind: 'diamond', tx: 25, ty: 3 },
      { kind: 'gem',     tx: 21, ty: 1 },
      { kind: 'gem',     tx: 29, ty: 1 },
      { kind: 'gold',    tx: 22, ty: 4 },
      { kind: 'gold',    tx: 28, ty: 4 },
    ],
    guards: [
      { patrol: [[3, 3], [16, 3], [16, 4], [3, 4]] },
      { patrol: [[4, 7], [15, 7], [15, 10], [4, 10]] },
      { patrol: [[8, 12], [24, 12], [24, 15], [8, 15]] },
      { patrol: [[21, 6], [29, 6], [29, 8], [21, 8]] },
    ],
    cameras: [
      { tx: 10, ty: 0, base: Math.PI / 2,  sweep: 0.6,  speed: 0.6,  range: 185 },
      { tx: 25, ty: 9, base: -Math.PI / 2, sweep: 0.45, speed: 0.75, range: 175 },
      { tx: 15, ty: 17, base: -Math.PI / 2, sweep: 0.7, speed: 0.5,  range: 185 },
    ],
    // Vertical beams across the vault corridor (rows 6-8). Each beam is a
    // line in pixels, on for `duty` of every `period` seconds, staggered by
    // `phase` so a gap always opens somewhere.
    lasers: [
      { tx: 22, period: 2.4, duty: 0.55, phase: 0.0 },
      { tx: 25, period: 2.4, duty: 0.55, phase: 0.8 },
      { tx: 28, period: 2.4, duty: 0.55, phase: 1.6 },
    ],
  },
];
