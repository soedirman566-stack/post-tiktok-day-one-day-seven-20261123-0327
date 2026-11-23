// main.js — wires the keyboard and the clock to the engine and the
// renderer. Also reads the screenshot hook from the URL: the maker frames
// the game's screenshots with ?level=2&alarm=45&state=play&px=..&py=..
// (&freeze=1 parks the patrols). The hook changes nothing about the game
// itself; with no parameters this is simply VAULTBREAK.

import { Game } from './engine.js';
import { draw } from './render.js';
import { ensureAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function readHook() {
  const q = new URLSearchParams(location.search);
  const hook = {};
  if (q.has('level')) hook.level = parseInt(q.get('level'), 10);
  if (q.has('alarm')) hook.alarm = parseFloat(q.get('alarm'));
  if (q.has('state')) hook.state = q.get('state');
  if (q.has('px')) hook.px = parseFloat(q.get('px'));
  if (q.has('py')) hook.py = parseFloat(q.get('py'));
  if (q.has('susp')) hook.susp = parseFloat(q.get('susp'));
  if (q.has('freeze')) hook.freeze = parseInt(q.get('freeze'), 10);
  return hook;
}

const game = new Game(readHook());
window.__vaultbreak = game; // for the maker's play-tests

const held = new Set();
const pressed = new Set();
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  KeyE: 'interact',
  Space: 'coin',
  KeyQ: 'emp',
  Enter: 'confirm',
  KeyR: 'retry',
};

addEventListener('keydown', (e) => {
  ensureAudio();
  const name = KEYMAP[e.code];
  if (!name) return;
  e.preventDefault();
  if (!held.has(name)) pressed.add(name);
  held.add(name);
});
addEventListener('keyup', (e) => {
  const name = KEYMAP[e.code];
  if (!name) return;
  held.delete(name);
});
addEventListener('pointerdown', ensureAudio);

function readInput() {
  const input = {
    up: held.has('up'),
    down: held.has('down'),
    left: held.has('left'),
    right: held.has('right'),
    sneak: held.has('sneak'),
    interact: held.has('interact'),
    coin: pressed.has('coin'),
    emp: pressed.has('emp'),
    confirm: pressed.has('confirm'),
    retry: pressed.has('retry'),
  };
  pressed.clear();
  return input;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt, readInput());
  draw(ctx, game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
