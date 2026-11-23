// engine.js — the rules of the night. Owns the game state machine
// (title -> play -> level clear / busted -> final score), the alarm meter,
// movement and collision, every interaction (loot, camera wires, locks),
// the coin decoy, the EMP, the laser grid and the scoring.
//
// The world is pixel space the size of the map (1280 x 720); the HUD is
// drawn over the top strip by render.js, so nothing here knows about it.

import { LEVELS, LOOT_KINDS, TILE, COLS, ROWS } from './levels.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';
import { sfx } from './audio.js';

export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

const PLAYER_R = 13;
const WALK_SPEED = 154;
const SNEAK_SPEED = 82;
const PICK_SECONDS = 1.6;
const EMP_SECONDS = 6;
export const EMP_COST = 150;

export class Game {
  constructor(hook = {}) {
    this.hook = hook;
    this.state = 'title'; // title | play | levelclear | busted | final
    this.levelIndex = 0;
    this.runScore = 0;
    this.levelResults = [];
    this.time = 0;
    this.loadLevel(0);
    if (hook.level) this.loadLevel(Math.min(2, Math.max(0, hook.level - 1)));
    if (hook.state === 'play') this.state = 'play';
  }

  // --- level setup --------------------------------------------------------
  loadLevel(index) {
    const def = LEVELS[index];
    this.levelIndex = index;
    this.def = def;
    this.grid = def.map.map((row) => [...row]);
    this.player = { x: 0, y: 0, angle: Math.PI / 2, sneaking: false, still: true };
    this.loot = def.loot.map((l) => ({
      kind: l.kind,
      value: LOOT_KINDS[l.kind].value,
      x: (l.tx + 0.5) * TILE,
      y: (l.ty + 0.5) * TILE,
      taken: false,
    }));
    this.guards = def.guards.map((g) => new Guard(g, TILE));
    this.cameras = def.cameras.map((c) => new Camera(c, TILE));
    this.lasers = def.lasers.map((l) => ({
      x: (l.tx + 0.5) * TILE,
      y1: 6 * TILE,
      y2: 9 * TILE,
      period: l.period,
      duty: l.duty,
      phase: l.phase,
      cooldown: 0,
    }));
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.grid[y][x] === 'P') {
          this.player.x = (x + 0.5) * TILE;
          this.player.y = (y + 0.5) * TILE;
          this.grid[y][x] = '.';
        }
        if (this.grid[y][x] === 'X') this.exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      }
    }
    this.alarm = 0;
    this.levelTime = 0;
    this.coins = def.coins;
    this.emps = def.emps;
    this.toolCost = 0;
    this.lootValue = 0;
    this.coin = null;       // flying / landed decoy {x, y, vx, vy, landed, age}
    this.picking = null;    // {tx, ty, progress}
    this.seenNow = false;   // anyone's eyes on the thief this frame
    this.tickTimer = 0;
    this.message = '';
    this.messageT = 0;
    if (this.hook.alarm !== undefined && index === (this.hook.level ?? 1) - 1) {
      this.alarm = this.hook.alarm;
    }
    if (this.hook.px !== undefined && index === (this.hook.level ?? 1) - 1) {
      this.player.x = (this.hook.px + 0.5) * TILE;
      this.player.y = (this.hook.py + 0.5) * TILE;
    }
    if (this.hook.susp !== undefined && this.guards[0] && index === (this.hook.level ?? 1) - 1) {
      this.guards[0].suspicion = this.hook.susp;
    }
  }

  startRun() {
    this.runScore = 0;
    this.levelResults = [];
    this.loadLevel(0);
    this.state = 'play';
  }

  nextLevel() {
    if (this.levelIndex >= LEVELS.length - 1) {
      this.state = 'final';
    } else {
      this.loadLevel(this.levelIndex + 1);
      this.state = 'play';
    }
  }

  retryLevel() {
    this.loadLevel(this.levelIndex);
    this.state = 'play';
  }

  // --- tile helpers ---------------------------------------------------------
  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
    return this.grid[ty][tx];
  }

  // Sight blockers: walls, furniture, and locked doors still shut.
  sightSolid(tx, ty) {
    const c = this.tileAt(tx, ty);
    return c === '#' || c === 'F' || c === 'L';
  }

  isSolidPx(x, y) {
    return this.sightSolid(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  // Movement blockers: sight blockers plus vents for guards (too small).
  moveSolid(tx, ty, forGuard) {
    const c = this.tileAt(tx, ty);
    if (c === '#' || c === 'F' || c === 'L') return true;
    if (forGuard && c === 'V') return true;
    return false;
  }

  // Axis-separated circle movement against the tile grid.
  moveCircle(e, dx, dy, forGuard = false) {
    const r = PLAYER_R;
    if (dx !== 0) {
      const nx = e.x + dx;
      const edge = dx > 0 ? nx + r : nx - r;
      const tx = Math.floor(edge / TILE);
      let blocked = false;
      for (const ty of [Math.floor((e.y - r + 2) / TILE), Math.floor((e.y + r - 2) / TILE)]) {
        if (this.moveSolid(tx, ty, forGuard)) blocked = true;
      }
      e.x = blocked ? e.x : nx;
    }
    if (dy !== 0) {
      const ny = e.y + dy;
      const edge = dy > 0 ? ny + r : ny - r;
      const ty = Math.floor(edge / TILE);
      let blocked = false;
      for (const tx of [Math.floor((e.x - r + 2) / TILE), Math.floor((e.x + r - 2) / TILE)]) {
        if (this.moveSolid(tx, ty, forGuard)) blocked = true;
      }
      e.y = blocked ? e.y : ny;
    }
    e.x = Math.max(r, Math.min(WORLD_W - r, e.x));
    e.y = Math.max(r, Math.min(WORLD_H - r, e.y));
  }

  // --- main update ----------------------------------------------------------
  update(dt, input) {
    this.time += dt;
    if (this.messageT > 0) this.messageT -= dt;

    if (this.state === 'title') {
      if (input.confirm) { sfx.click(); this.startRun(); }
      return;
    }
    if (this.state === 'levelclear') {
      if (input.confirm) { sfx.click(); this.nextLevel(); }
      return;
    }
    if (this.state === 'busted') {
      if (input.retry || input.confirm) { sfx.click(); this.retryLevel(); }
      return;
    }
    if (this.state === 'final') {
      if (input.confirm) { sfx.click(); this.state = 'title'; }
      return;
    }
    if (this.state !== 'play') return;

    this.levelTime += dt;
    const frozen = this.hook.freeze === 1;

    this.updatePlayer(dt, input);
    if (!frozen) {
      for (const g of this.guards) {
        const wasChase = g.state === 'chase';
        g.update(dt, {
          player: this.player,
          isSolidPx: (x, y) => this.isSolidPx(x, y),
          move: (e, dx, dy) => this.moveCircle(e, dx, dy, true),
        });
        if (g.state === 'chase' && !wasChase) sfx.spotted();
      }
      for (const c of this.cameras) c.update(dt, this.time);
    }
    this.updateCoin(dt);
    this.updateAlarm(dt);
    this.updateLasers(dt);
    this.updateInteract(dt, input);

    // Caught by hand?
    for (const g of this.guards) {
      if (g.state === 'chase' && Math.hypot(g.x - this.player.x, g.y - this.player.y) < 27) {
        this.bust('A guard got a hand on you.');
        return;
      }
    }
    // At the van?
    if (Math.hypot(this.exit.x - this.player.x, this.exit.y - this.player.y) < 26) {
      this.completeLevel();
    }
  }

  updatePlayer(dt, input) {
    const p = this.player;
    p.sneaking = !!input.sneak;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    p.still = mx === 0 && my === 0;
    if (!p.still) {
      const len = Math.hypot(mx, my);
      const speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
      this.moveCircle(p, (mx / len) * speed * dt, (my / len) * speed * dt, false);
      p.angle = Math.atan2(my, mx);
    }
    if (input.coin) this.throwCoin();
    if (input.emp) this.fireEmp();
  }

  throwCoin() {
    if (this.coins <= 0 || this.coin) {
      if (this.coins <= 0) this.showMessage('No coins left.');
      return;
    }
    this.coins--;
    const p = this.player;
    this.coin = {
      x: p.x, y: p.y,
      vx: Math.cos(p.angle) * 260,
      vy: Math.sin(p.angle) * 260,
      landed: false, age: 0,
    };
    sfx.coin();
  }

  updateCoin(dt) {
    const c = this.coin;
    if (!c) return;
    c.age += dt;
    if (!c.landed) {
      const nx = c.x + c.vx * dt;
      const ny = c.y + c.vy * dt;
      if (this.isSolidPx(nx, ny) || c.age > 0.55) {
        c.landed = true;
        c.age = 0;
        // Noise! Every guard in earshot comes to look.
        for (const g of this.guards) {
          if (Math.hypot(g.x - c.x, g.y - c.y) < 235) g.investigate(c.x, c.y);
        }
      } else {
        c.x = nx; c.y = ny;
      }
    } else if (c.age > 1.6) {
      this.coin = null;
    }
  }

  fireEmp() {
    if (this.emps <= 0) { this.showMessage('No EMP charges left.'); return; }
    this.emps--;
    this.toolCost += EMP_COST;
    for (const c of this.cameras) c.emp(EMP_SECONDS);
    sfx.emp();
    this.showMessage('EMP pulse — cameras dark for 6 s (−$150).');
  }

  updateAlarm(dt) {
    let feed = 0;
    let seen = false;
    for (const g of this.guards) {
      if (g.seeing) { feed += 30; seen = true; }
    }
    for (const c of this.cameras) {
      c.detecting = c.seesPlayer(this.player.x, this.player.y, (x, y) => this.isSolidPx(x, y));
      if (c.detecting) { feed += 17; seen = true; }
    }
    this.seenNow = seen;
    if (seen) {
      this.alarm = Math.min(100, this.alarm + feed * dt);
      this.tickTimer -= dt;
      if (this.tickTimer <= 0) { sfx.alarmTick(); this.tickTimer = 0.42; }
    } else {
      this.alarm = Math.max(0, this.alarm - 7.5 * dt);
    }
    if (this.alarm >= 100) this.bust('The alarm hit full — the bank locked down.');
  }

  laserActive(beam, t) {
    const phase = (t + beam.phase) % beam.period;
    return phase < beam.period * beam.duty;
  }

  updateLasers(dt) {
    for (const beam of this.lasers) {
      if (beam.cooldown > 0) beam.cooldown -= dt;
      if (!this.laserActive(beam, this.time)) continue;
      const p = this.player;
      if (Math.abs(p.x - beam.x) < 15 && p.y > beam.y1 && p.y < beam.y2 && beam.cooldown <= 0) {
        beam.cooldown = 0.9;
        this.alarm = Math.min(100, this.alarm + 35);
        sfx.spotted();
        this.showMessage('Laser grid tripped! Alarm spiking.');
        if (this.alarm >= 100) { this.bust('The laser grid gave you away.'); return; }
      }
    }
  }

  // E: grab loot / cut a camera wire / hold to pick a lock.
  updateInteract(dt, input) {
    const p = this.player;
    if (!input.interact) { this.picking = null; return; }

    // Loot first — it is why we are here.
    for (const l of this.loot) {
      if (!l.taken && Math.hypot(l.x - p.x, l.y - p.y) < 32) {
        l.taken = true;
        this.lootValue += l.value;
        if (l.kind === 'diamond') { sfx.bigPickup(); this.showMessage('THE STAR DIAMOND — $2,500!'); }
        else { sfx.pickup(); this.showMessage(`Took the ${l.kind} — $${l.value}.`); }
        return;
      }
    }
    // Then a camera wire, if we are under its mount.
    for (const c of this.cameras) {
      if (c.live && Math.hypot(c.x - p.x, c.y - p.y) < 42) {
        c.cutWire();
        sfx.cut();
        this.showMessage('Camera wire cut — that eye is closed for good.');
        return;
      }
    }
    // Otherwise, a locked door beside us gets picked.
    const ptx = Math.floor(p.x / TILE);
    const pty = Math.floor(p.y / TILE);
    let door = null;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (this.tileAt(ptx + dx, pty + dy) === 'L') door = { tx: ptx + dx, ty: pty + dy };
    }
    if (!door) { this.picking = null; return; }
    if (!this.picking || this.picking.tx !== door.tx || this.picking.ty !== door.ty) {
      this.picking = { ...door, progress: 0 };
    }
    this.picking.progress += dt / PICK_SECONDS;
    if (Math.random() < 0.3) sfx.pick();
    if (this.picking.progress >= 1) {
      this.grid[door.ty][door.tx] = 'D';
      this.picking = null;
      sfx.levelClear();
      this.showMessage('Lock picked — door open.');
    }
  }

  // --- outcomes ---------------------------------------------------------------
  get ghost() {
    return this.guards.every((g) => !g.everChased);
  }

  completeLevel() {
    const timeBonus = Math.max(0, Math.round((this.def.par - this.levelTime) * 10));
    const ghostBonus = this.ghost ? 1000 : 0;
    const total = this.lootValue - this.toolCost + timeBonus + ghostBonus;
    this.levelResults.push({
      name: this.def.name,
      loot: this.lootValue,
      toolCost: this.toolCost,
      timeBonus,
      ghostBonus,
      total,
      time: this.levelTime,
    });
    this.runScore += total;
    sfx.levelClear();
    this.state = 'levelclear';
  }

  bust(reason) {
    if (this.state !== 'play') return;
    this.bustReason = reason;
    sfx.busted();
    this.state = 'busted';
  }

  showMessage(text) {
    this.message = text;
    this.messageT = 2.6;
  }
}
