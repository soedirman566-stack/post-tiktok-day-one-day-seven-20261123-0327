// vision.js — who can see what. Vision cones are clipped by walls with
// short-step raycasts, so furniture and pillars carve real shadows out of
// every cone: if a ray stops early, the floor behind it is safe cover.
//
// `isSolidPx(x, y)` is supplied by the engine and answers for a pixel:
// does this point sit inside a sight-blocking tile?

// March a ray from (x, y) along `angle` until it hits something solid or
// runs out of range. Returns the distance travelled.
export function rayDistance(x, y, angle, maxDist, isSolidPx) {
  const step = 3;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let px = x;
  let py = y;
  let travelled = 0;
  while (travelled < maxDist) {
    px += dx;
    py += dy;
    travelled += step;
    if (isSolidPx(px, py)) return travelled;
  }
  return maxDist;
}

// Straight-line sight between two points: true when the ray between them
// reaches (nearly) all the way.
export function lineOfSight(x1, y1, x2, y2, isSolidPx) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const angle = Math.atan2(dy, dx);
  return rayDistance(x1, y1, angle, dist, isSolidPx) >= dist - 3;
}

// Is (tx, ty) inside the cone rooted at (ox, oy)? Angle and range only —
// callers add lineOfSight for the occlusion test.
export function inCone(ox, oy, angle, halfAngle, range, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 26) return true; // point blank: no hiding in someone's face
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfAngle;
}

// The visible polygon of a cone: a fan of rays, each clipped by the first
// wall it meets. Used for drawing; the polygon IS the detection shape.
export function conePolygon(x, y, angle, halfAngle, range, isSolidPx, rays = 26) {
  const points = [[x, y]];
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = rayDistance(x, y, a, range, isSolidPx);
    points.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
  }
  return points;
}
