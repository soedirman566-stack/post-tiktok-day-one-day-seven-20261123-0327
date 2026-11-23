// guards.js — the night watch. Each guard walks a waypoint loop with a
// vision cone; seeing the thief fills suspicion, full suspicion means a
// chase, and losing the trail cools everything back down. A coin landing
// nearby pulls a guard off patrol to investigate the noise.

import { inCone, lineOfSight } from './vision.js';

export const GUARD_CONE_HALF = 0.62; // ~35 degrees either side of facing
export const GUARD_CONE_RANGE = 198;

const SPEED = { patrol: 68, investigate: 112, chase: 170, return: 96 };

function angleLerp(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export class Guard {
  constructor(def, tileSize) {
    this.home = def.patrol.map(([tx, ty]) => [(tx + 0.5) * tileSize, (ty + 0.5) * tileSize]);
    this.x = this.home[0][0];
    this.y = this.home[0][1];
    this.angle = Math.PI / 2;
    this.wp = 1 % this.home.length;
    this.state = 'patrol'; // patrol | investigate | chase | return
    this.suspicion = 0;    // 0..100
    this.seeing = false;   // is the thief in my cone right now?
    this.lastSeen = null;  // {x, y} where the trail went cold
    this.target = null;    // investigation point (a coin, a glimpse)
    this.wait = 0;         // pause-and-scan timer at a waypoint / target
    this.loseTimer = 0;    // how long the chase has had no visual
    this.everChased = false;
  }

  // A noise at (x, y): drop everything short of a chase and go look.
  investigate(x, y) {
    if (this.state === 'chase') return;
    this.state = 'investigate';
    this.target = { x, y };
    this.wait = 0;
  }

  // Can I see the thief this instant? Cone + range + wall occlusion.
  // Sneaking in the open still shows, just registers more slowly (update).
  seesPlayer(px, py, isSolidPx) {
    if (!inCone(this.x, this.y, this.angle, GUARD_CONE_HALF, GUARD_CONE_RANGE, px, py)) return false;
    return lineOfSight(this.x, this.y, px, py, isSolidPx);
  }

  update(dt, ctx) {
    const { player, isSolidPx, move } = ctx;
    this.seeing = this.seesPlayer(player.x, player.y, isSolidPx);

    // --- suspicion bookkeeping -------------------------------------------
    if (this.seeing) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      const closeness = 1 - Math.min(1, dist / GUARD_CONE_RANGE); // 1 at the face
      let rate = 34 + 62 * closeness;                              // per second
      if (player.sneaking) rate *= 0.55;
      if (player.still) rate *= 0.8;
      this.suspicion = Math.min(100, this.suspicion + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseTimer = 0;
      if (this.suspicion >= 100) {
        this.state = 'chase';
        this.everChased = true;
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - 13 * dt);
      this.loseTimer += dt;
      // A strong glimpse is worth a walk over, even without a chase.
      if (this.state === 'patrol' && this.suspicion > 52 && this.lastSeen) {
        this.state = 'investigate';
        this.target = { ...this.lastSeen };
        this.wait = 0;
      }
    }

    // --- state machine ----------------------------------------------------
    if (this.state === 'chase') {
      const goal = this.seeing ? { x: player.x, y: player.y } : this.lastSeen;
      if (!this.seeing && this.loseTimer > 2.6) {
        this.state = 'investigate';
        this.target = { ...this.lastSeen };
        this.wait = 0;
        this.suspicion = 55;
      } else if (goal) {
        this.walkToward(goal.x, goal.y, SPEED.chase, dt, move);
      }
      return;
    }

    if (this.state === 'investigate') {
      if (this.wait > 0) {
        this.wait -= dt;
        this.angle += Math.sin(performance.now() / 340 + this.x) * 0.9 * dt; // look around
        if (this.wait <= 0) this.state = 'return';
        return;
      }
      if (this.target && this.walkToward(this.target.x, this.target.y, SPEED.investigate, dt, move)) {
        this.wait = 2.2; // arrived: scan the spot, then give up
      }
      return;
    }

    if (this.state === 'return') {
      const [hx, hy] = this.home[this.wp];
      if (this.walkToward(hx, hy, SPEED.return, dt, move)) this.state = 'patrol';
      return;
    }

    // patrol: stroll the loop, pausing at each post to scan.
    if (this.wait > 0) {
      this.wait -= dt;
      this.angle += Math.sin(performance.now() / 300 + this.y) * 0.7 * dt;
      return;
    }
    const [tx, ty] = this.home[this.wp];
    if (this.walkToward(tx, ty, SPEED.patrol, dt, move)) {
      this.wp = (this.wp + 1) % this.home.length;
      this.wait = 0.8;
    }
  }

  // Move toward a point; returns true on arrival. Facing follows motion.
  walkToward(tx, ty, speed, dt, move) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return true;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    move(this, vx * dt, vy * dt);
    this.angle = angleLerp(this.angle, Math.atan2(vy, vx), Math.min(1, dt * 10));
    return false;
  }
}
