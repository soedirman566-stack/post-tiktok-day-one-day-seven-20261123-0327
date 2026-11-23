// cameras.js — wall-mounted eyes. A camera sweeps its cone back and forth
// across the room it watches; standing in the beam feeds the alarm meter.
// Two ways to kill one: cut its wire up close (E, permanent) or fire the
// EMP (Q, every camera dark for six seconds, at a score cost).

import { inCone, lineOfSight } from './vision.js';

export const CAMERA_CONE_HALF = 0.5; // ~29 degrees either side

export class Camera {
  constructor(def, tileSize) {
    // The housing sits in the wall tile (mx, my); the lens — the cone's
    // origin — is pushed out to the wall's face, so the beam starts in
    // the room instead of inside the wall that mounts it.
    this.mx = (def.tx + 0.5) * tileSize;
    this.my = (def.ty + 0.5) * tileSize;
    this.x = this.mx + Math.cos(def.base) * (tileSize / 2 + 3);
    this.y = this.my + Math.sin(def.base) * (tileSize / 2 + 3);
    this.base = def.base;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.range = def.range;
    this.angle = def.base;
    this.phase = def.tx * 1.7 + def.ty * 0.9; // desynchronise the sweeps
    this.disabledFor = 0;  // seconds of EMP / rewiring left; Infinity = cut
    this.cut = false;
    this.detecting = false;
  }

  get live() {
    return !this.cut && this.disabledFor <= 0;
  }

  // Cut the wire: this camera never wakes again.
  cutWire() {
    this.cut = true;
    this.detecting = false;
  }

  // EMP pulse: dark for `seconds`.
  emp(seconds) {
    if (!this.cut) this.disabledFor = Math.max(this.disabledFor, seconds);
  }

  update(dt, tNow) {
    if (this.disabledFor > 0 && this.disabledFor !== Infinity) {
      this.disabledFor = Math.max(0, this.disabledFor - dt);
    }
    this.angle = this.base + Math.sin(tNow * this.speed + this.phase) * this.sweep;
  }

  // Is the thief standing in my beam, with nothing in the way?
  seesPlayer(px, py, isSolidPx) {
    if (!this.live) return false;
    if (!inCone(this.x, this.y, this.angle, CAMERA_CONE_HALF, this.range, px, py)) return false;
    return lineOfSight(this.x, this.y, px, py, isSolidPx);
  }
}
