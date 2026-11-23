// render.js — everything the player sees. Dark navy bank floors, warm
// gold loot, amber guard cones that heat up through orange to red as
// suspicion rises, teal camera cones: danger, cover and loot must read
// at a glance, even in a small screenshot.

import { TILE, COLS, ROWS, HUD_H } from './levels.js';
import { conePolygon } from './vision.js';
import { GUARD_CONE_HALF, GUARD_CONE_RANGE } from './guards.js';
import { CAMERA_CONE_HALF } from './cameras.js';

const W = COLS * TILE;
const H = ROWS * TILE;

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------- tiles
function drawTiles(ctx, game) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const c = game.grid[ty][tx];
      const x = tx * TILE;
      const y = ty * TILE;
      if (c === '#') {
        ctx.fillStyle = '#26355c';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#31477a';
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = '#1a2542';
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
        continue;
      }
      // floor: deep navy marble with a subtle checker + grout lines
      ctx.fillStyle = (tx + ty) % 2 === 0 ? '#0d1526' : '#0b1220';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(70, 100, 160, 0.13)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      if (c === 'F') {
        // furniture / pillar: solid cover with a lighter top face
        ctx.fillStyle = '#4a3b2a';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = '#6b5636';
        ctx.fillRect(x + 3, y + 3, TILE - 6, 8);
        ctx.strokeStyle = '#2c2115';
        ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
      } else if (c === 'V') {
        ctx.fillStyle = '#131a2a';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#2e425f';
        for (let i = 0; i < 4; i++) ctx.fillRect(x + 7, y + 8 + i * 7, TILE - 14, 3);
      } else if (c === 'D') {
        ctx.fillStyle = '#12203c';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = '#7a5c22';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.lineWidth = 1;
      } else if (c === 'L') {
        ctx.fillStyle = '#3d4c68';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#54678c';
        ctx.fillRect(x + 2, y + 2, TILE - 4, 6);
        ctx.fillStyle = '#ff4747';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2 + 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // the getaway dock
  const ex = game.exit.x;
  const ey = game.exit.y;
  ctx.fillStyle = 'rgba(46, 204, 113, 0.10)';
  ctx.fillRect(ex - TILE / 2, ey - TILE / 2, TILE, TILE);
  ctx.strokeStyle = 'rgba(46, 204, 113, 0.5)';
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(ex - TILE / 2 + 1, ey - TILE / 2 + 1, TILE - 2, TILE - 2);
  ctx.setLineDash([]);
  drawVan(ctx, ex, ey);
}

function drawVan(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#17263f';
  roundRect(ctx, -36, -15, 52, 30, 5);
  ctx.fill();
  ctx.fillStyle = '#1f3355';
  roundRect(ctx, 12, -12, 22, 24, 4);
  ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  ctx.fillRect(24, -9, 8, 7);
  ctx.fillRect(24, 2, 8, 7);
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(-36, -3, 70, 4);
  ctx.fillStyle = '#0a0a0a';
  for (const [wx, wy] of [[-24, -16], [20, -16], [-24, 13], [20, 13]]) {
    ctx.beginPath();
    ctx.arc(wx, wy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 7px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY', -10, 3);
  ctx.restore();
}

// ---------------------------------------------------------------- loot
function drawLootItem(ctx, l, t) {
  if (l.taken) return;
  const { x, y } = l;
  const pulse = 0.75 + 0.25 * Math.sin(t * 3 + x);
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 26);
  glow.addColorStop(0, `rgba(255, 197, 66, ${0.35 * pulse})`);
  glow.addColorStop(1, 'rgba(255, 197, 66, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 26, y - 26, 52, 52);
  ctx.save();
  ctx.translate(x, y);
  if (l.kind === 'stack') {
    ctx.fillStyle = '#2e9e5b';
    ctx.fillRect(-10, -6, 20, 12);
    ctx.fillStyle = '#57c47e';
    ctx.fillRect(-10, -6, 20, 4);
    ctx.fillStyle = '#f5eeda';
    ctx.fillRect(-2, -6, 4, 12);
  } else if (l.kind === 'bag') {
    ctx.fillStyle = '#c9a35c';
    ctx.beginPath();
    ctx.arc(0, 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3, -11, 6, 5);
    ctx.fillStyle = '#5c4517';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 6);
  } else if (l.kind === 'gold') {
    ctx.fillStyle = '#e8b62a';
    ctx.fillRect(-11, -1, 14, 6);
    ctx.fillRect(3, -1, 14, 6);
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(-8, -8, 16, 6);
  } else if (l.kind === 'painting') {
    ctx.fillStyle = '#7a4b21';
    ctx.fillRect(-11, -13, 22, 26);
    ctx.fillStyle = '#33506e';
    ctx.fillRect(-8, -10, 16, 20);
    ctx.fillStyle = '#87b5d9';
    ctx.beginPath();
    ctx.arc(-2, -3, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#274b34';
    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.lineTo(-1, 0);
    ctx.lineTo(4, 10);
    ctx.closePath();
    ctx.fill();
  } else if (l.kind === 'gem') {
    ctx.fillStyle = '#39d5e8';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, -3);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.stroke();
  } else if (l.kind === 'diamond') {
    ctx.fillStyle = '#bdf3ff';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(11, -4);
    ctx.lineTo(0, 15);
    ctx.lineTo(-11, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(57, 213, 232, 0.8)';
    ctx.beginPath();
    ctx.moveTo(-11, -4);
    ctx.lineTo(11, -4);
    ctx.moveTo(0, -15);
    ctx.lineTo(0, 15);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦', -13, -10);
    ctx.fillText('✦', 14, 8);
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 233, 168, 0.9)';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`$${l.value}`, x, y + 24);
}

// ---------------------------------------------------------------- cones
function drawCone(ctx, x, y, angle, half, range, isSolidPx, fill, edge) {
  const pts = conePolygon(x, y, angle, half, range, isSolidPx);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.stroke();
}

function guardConeColors(g, alarm) {
  if (g.state === 'chase') return ['rgba(255, 52, 32, 0.22)', 'rgba(255, 52, 32, 0.45)'];
  if (g.suspicion > 72) return ['rgba(255, 84, 30, 0.20)', 'rgba(255, 84, 30, 0.42)'];
  if (g.suspicion > 38) return ['rgba(255, 140, 0, 0.18)', 'rgba(255, 140, 0, 0.38)'];
  return ['rgba(255, 190, 40, 0.13)', 'rgba(255, 190, 40, 0.30)'];
}

function cameraConeColors(c, alarm) {
  if (c.detecting && alarm > 70) return ['rgba(255, 52, 32, 0.20)', 'rgba(255, 52, 32, 0.42)'];
  if (c.detecting) return ['rgba(255, 140, 0, 0.18)', 'rgba(255, 140, 0, 0.38)'];
  return ['rgba(0, 220, 255, 0.11)', 'rgba(0, 220, 255, 0.28)'];
}

// ---------------------------------------------------------------- actors
function drawGuard(ctx, g) {
  const [fill, edge] = guardConeColors(g);
  drawCone(ctx, g.x, g.y, g.angle, GUARD_CONE_HALF, GUARD_CONE_RANGE,
    (x, y) => currentGame.isSolidPx(x, y), fill, edge);
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = '#0c0f16';
  ctx.beginPath();
  ctx.arc(1.5, 2, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e4470';
  ctx.beginPath();
  ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(g.angle);
  ctx.fillStyle = '#1b2a49';
  ctx.beginPath();
  ctx.arc(3, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.fillRect(6, -6, 4, 3);
  ctx.fillRect(6, 3, 4, 3);
  ctx.restore();
  // suspicion readout
  if (g.suspicion > 4 || g.state !== 'patrol') {
    const w = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(g.x - w / 2, g.y - 30, w, 5);
    ctx.fillStyle = g.state === 'chase' ? '#ff3520' : g.suspicion > 60 ? '#ff8c1e' : '#ffd23e';
    ctx.fillRect(g.x - w / 2, g.y - 30, (w * g.suspicion) / 100, 5);
  }
  if (g.state === 'chase') {
    ctx.fillStyle = '#ff3520';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 34);
  } else if (g.state === 'investigate' || g.suspicion > 45) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', g.x, g.y - 34);
  }
}

function drawCamera(ctx, c, t) {
  if (c.live) {
    const [fill, edge] = cameraConeColors(c, currentGame.alarm);
    drawCone(ctx, c.x, c.y, c.angle, CAMERA_CONE_HALF, c.range,
      (x, y) => currentGame.isSolidPx(x, y), fill, edge);
  }
  ctx.save();
  ctx.translate(c.mx, c.my);
  ctx.fillStyle = '#10151f';
  roundRect(ctx, -10, -8, 20, 16, 3);
  ctx.fill();
  ctx.strokeStyle = '#54678c';
  ctx.stroke();
  ctx.rotate(c.angle);
  const lens = c.cut ? '#333' : c.live ? (c.detecting ? '#ff8c1e' : '#37e0ff') : '#7a4b00';
  ctx.fillStyle = lens;
  ctx.beginPath();
  ctx.arc(6, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (c.cut) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CUT', c.mx, c.my - 13);
  } else if (!c.live) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EMP', c.mx, c.my - 13);
  }
}

function drawPlayer(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(1.5, 2.5, 12, 0, Math.PI * 2);
  ctx.fill();
  // loot sack on the back grows with the haul — drawn as a gold-tinted pack
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  ctx.fillStyle = '#39424f';
  ctx.fillRect(-9, -6, 8, 12); // backpack
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(-8, -4, 2.5, 8);
  ctx.fillStyle = '#d9e4ee';
  ctx.beginPath();
  ctx.arc(3.5, 0, 7, 0, Math.PI * 2); // hood / head
  ctx.fill();
  ctx.fillStyle = '#10151f';
  ctx.beginPath();
  ctx.arc(5.5, 0, 4.6, 0, Math.PI * 2); // hood shadow (the mask)
  ctx.fill();
  ctx.restore();
}

function drawLasers(ctx, game) {
  for (const beam of game.lasers) {
    const active = game.laserActive(beam, game.time);
    const phase = (game.time + beam.phase) % beam.period;
    const aboutToFire = !active && beam.period - phase < 0.35;
    // emitters on the walls above and below the corridor
    for (const ey of [beam.y1 - 8, beam.y2 + 8]) {
      ctx.fillStyle = '#10151f';
      roundRect(ctx, beam.x - 8, ey - 6, 16, 12, 2);
      ctx.fill();
      ctx.fillStyle = active || aboutToFire ? '#ff3520' : '#5c2a2a';
      ctx.beginPath();
      ctx.arc(beam.x, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (active) {
      ctx.strokeStyle = 'rgba(255, 53, 32, 0.28)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y1);
      ctx.lineTo(beam.x, beam.y2);
      ctx.stroke();
      ctx.strokeStyle = '#ff5142';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y1);
      ctx.lineTo(beam.x, beam.y2);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else if (aboutToFire) {
      ctx.strokeStyle = 'rgba(255, 53, 32, 0.4)';
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y1);
      ctx.lineTo(beam.x, beam.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawCoin(ctx, game) {
  const c = game.coin;
  if (!c) return;
  if (c.landed) {
    const a = Math.max(0, 1 - c.age / 1.6);
    ctx.strokeStyle = `rgba(255, 217, 77, ${a * 0.8})`;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6 + c.age * 46, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a87e14';
  ctx.stroke();
}

// ---------------------------------------------------------------- HUD
function drawHUD(ctx, game) {
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = '#1b2a49';
  ctx.fillRect(0, HUD_H - 2, W, 2);

  // left: where we are
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8eef7';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(game.def.name, 16, 30);
  ctx.fillStyle = '#7f93b3';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(game.def.objective, 16, 52);
  ctx.fillStyle = '#54678c';
  ctx.fillText(`Time ${fmtTime(game.levelTime)} · par ${fmtTime(game.def.par)}`, 16, 70);

  // centre: THE ALARM METER
  const mx = 452;
  const mw = 376;
  ctx.textAlign = 'center';
  ctx.fillStyle = game.alarm > 70 ? '#ff5142' : game.alarm > 35 ? '#ffb03a' : '#c8d2e0';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('⚠ ALARM', mx + mw / 2, 24);
  ctx.fillStyle = '#131c30';
  roundRect(ctx, mx, 32, mw, 24, 5);
  ctx.fill();
  const frac = game.alarm / 100;
  if (frac > 0) {
    const grad = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    grad.addColorStop(0, '#2ecc71');
    grad.addColorStop(0.55, '#f5c542');
    grad.addColorStop(0.85, '#ff8c1e');
    grad.addColorStop(1, '#ff3520');
    ctx.fillStyle = grad;
    roundRect(ctx, mx, 32, Math.max(10, mw * frac), 24, 5);
    ctx.fill();
  }
  ctx.strokeStyle = game.alarm > 70 && Math.sin(game.time * 10) > 0 ? '#ff3520' : '#31477a';
  roundRect(ctx, mx, 32, mw, 24, 5);
  ctx.stroke();
  ctx.fillStyle = '#e8eef7';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`${Math.floor(game.alarm)}%`, mx + mw / 2, 49);
  ctx.fillStyle = '#54678c';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(game.seenNow ? '— SPOTTED —' : 'unseen', mx + mw / 2, 70);

  // right: the haul and the tools
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f5c542';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(`LOOT $${game.lootValue}`, W - 16, 31);
  // While a floor is live the score includes its in-progress haul; once
  // the floor is banked into runScore, showing both would double-count.
  const live = game.state === 'play' || game.state === 'busted';
  const shownScore = game.runScore + (live ? game.lootValue - game.toolCost : 0);
  ctx.fillStyle = '#c8d2e0';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Score ${shownScore}`, W - 16, 52);
  ctx.fillStyle = '#7f93b3';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`● coins ×${game.coins} (SPACE)    ⚡ EMP ×${game.emps} (Q)`, W - 16, 70);

  // transient message, bottom centre of the bank floor
  if (game.messageT > 0 && game.message) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    const wText = ctx.measureText(game.message).width + 28;
    ctx.fillStyle = 'rgba(5, 8, 15, 0.82)';
    roundRect(ctx, (W - wText) / 2, H - 44, wText, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(game.message, W / 2, H - 25);
  }
}

// ---------------------------------------------------------------- screens
function panel(ctx, title, titleColor, lines, footer) {
  ctx.fillStyle = 'rgba(3, 5, 10, 0.78)';
  ctx.fillRect(0, 0, W, H + HUD_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(title, W / 2, 190);
  ctx.font = '16px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillStyle = line.color || '#c8d2e0';
    ctx.font = line.bold ? 'bold 17px system-ui, sans-serif' : '15px system-ui, sans-serif';
    ctx.fillText(line.text, W / 2, 248 + i * 27);
  });
  if (footer) {
    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(footer, W / 2, 248 + lines.length * 27 + 26);
  }
}

// --- day-7 polish: loot sparkles and a fading thief trail ----------------
function drawLootSparkles(ctx, game) {
  const t = game.time;
  for (const l of game.loot) {
    if (l.taken) continue;
    const cx = (l.tx + 0.5) * TILE, cy = (l.ty + 0.5) * TILE;
    for (let k = 0; k < 3; k++) {
      const ph = t * 1.7 + (l.tx * 7 + l.ty * 13 + k * 2.1);
      const a = 0.35 + 0.3 * Math.sin(ph);
      const r = 3 + 2 * Math.sin(ph * 1.3);
      const ox = Math.sin(ph * 0.9 + k) * 13, oy = Math.cos(ph * 1.1 + k * 2) * 11;
      ctx.save();
      ctx.translate(cx + ox, cy + oy);
      ctx.rotate(ph * 0.6);
      ctx.fillStyle = `rgba(255, 226, 130, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(0, -r * 2); ctx.quadraticCurveTo(0, 0, r * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, r * 2); ctx.quadraticCurveTo(0, 0, -r * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

const thiefTrail = [];
function drawThiefTrail(ctx, game) {
  const p = game.player;
  const last = thiefTrail[thiefTrail.length - 1];
  if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 7) {
    thiefTrail.push({ x: p.x, y: p.y });
    if (thiefTrail.length > 26) thiefTrail.shift();
  }
  for (let i = 0; i < thiefTrail.length; i++) {
    const d = thiefTrail[i];
    const f = i / thiefTrail.length;
    ctx.fillStyle = `rgba(120, 220, 255, ${(f * 0.20).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 4 + f * 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

let currentGame = null;

export function draw(ctx, game) {
  currentGame = game;
  ctx.clearRect(0, 0, W, H + HUD_H);
  ctx.save();
  ctx.translate(0, HUD_H);
  drawTiles(ctx, game);
  for (const l of game.loot) drawLootItem(ctx, l, game.time);
  drawLootSparkles(ctx, game);
  drawLasers(ctx, game);
  for (const c of game.cameras) drawCamera(ctx, c, game.time);
  for (const g of game.guards) drawGuard(ctx, g);
  drawCoin(ctx, game);
  if (game.state !== 'title') { drawThiefTrail(ctx, game); drawPlayer(ctx, game.player, game.time); }
  // lockpick progress ring on the door being worked
  if (game.picking) {
    const cx = (game.picking.tx + 0.5) * TILE;
    const cy = (game.picking.ty + 0.5) * TILE;
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + game.picking.progress * Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.restore();
  drawHUD(ctx, game);

  if (game.state === 'title') {
    panel(ctx, 'VAULTBREAK', '#f5c542', [
      { text: 'One Night at Meridian Bank', bold: true, color: '#e8eef7' },
      { text: ' ' },
      { text: 'Cross the floors, strip the loot, reach the van — unseen, ideally.' },
      { text: 'Guard cones are amber, heating to red. Camera cones are teal and feed the ALARM.' },
      { text: 'Furniture and pillars are cover. Vents are yours alone.' },
      { text: ' ' },
      { text: 'WASD / arrows — move      SHIFT — sneak      E — grab · cut wire · hold to pick a lock' },
      { text: 'SPACE — throw a coin decoy      Q — EMP: cameras dark 6 s, −$150' },
      { text: ' ' },
      { text: 'Fill the alarm or get grabbed and the night ends. Finish clean for the GHOST bonus.' },
    ], 'Press ENTER to start the job');
  } else if (game.state === 'levelclear') {
    const r = game.levelResults[game.levelResults.length - 1];
    panel(ctx, 'FLOOR CLEARED', '#2ecc71', [
      { text: r.name, bold: true, color: '#e8eef7' },
      { text: ' ' },
      { text: `Loot carried out ............ $${r.loot}` },
      { text: `Tools spent ................. −$${r.toolCost}` },
      { text: `Time bonus (${fmtTime(r.time)}) ......... +$${r.timeBonus}` },
      { text: r.ghostBonus ? 'GHOST — never fully spotted .. +$1000' : 'Ghost bonus ................. $0 (spotted)', color: r.ghostBonus ? '#7fe7c4' : '#7f93b3' },
      { text: ' ' },
      { text: `Floor total: $${r.total}      Running score: $${game.runScore}`, bold: true, color: '#f5c542' },
    ], game.levelIndex >= 2 ? 'Press ENTER for the final tally' : 'Press ENTER for the next floor');
  } else if (game.state === 'busted') {
    panel(ctx, 'BUSTED', '#ff5142', [
      { text: game.bustReason || 'Caught.', bold: true, color: '#e8eef7' },
      { text: ' ' },
      { text: `You were carrying $${game.lootValue} of Meridian Bank's money.` },
      { text: 'The floor resets — the loot, the locks and the patrols are all back.' },
    ], 'Press R to try this floor again');
  } else if (game.state === 'final') {
    const lines = [
      { text: 'THE NIGHT IS DONE — THE VAN IS GONE BEFORE THE SIRENS', bold: true, color: '#e8eef7' },
      { text: ' ' },
      ...game.levelResults.map((r) => ({
        text: `${r.name}: $${r.total}${r.ghostBonus ? '  (GHOST)' : ''}`,
      })),
      { text: ' ' },
      { text: `FINAL SCORE: $${game.runScore}`, bold: true, color: '#f5c542' },
    ];
    panel(ctx, 'CLEAN GETAWAY', '#2ecc71', lines, 'Press ENTER to plan another night');
  }
}
