import './style.css';
import { CONFIG } from './config.js';
import { loadAssets, url } from './assets.js';
import { Game } from './game.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
const pad = (n, l = 2) => String(n).padStart(l, '0');

async function boot() {
  const A = await loadAssets();
  const game = new Game($('game'), A);
  window.__beast = game; // debug / test hook
  window.__beastConfig = CONFIG;

  // ---------------------------------------------------------- stage scaling
  const stage = $('stage');
  const fit = () => {
    const s = Math.min(window.innerWidth / CONFIG.stage.width, window.innerHeight / CONFIG.stage.height);
    stage.style.transform = `scale(${s})`;
    stage.style.margin = `${-(CONFIG.stage.height * (1 - s)) / 2}px ${-(CONFIG.stage.width * (1 - s)) / 2}px`;
  };
  window.addEventListener('resize', fit);
  fit();

  // ------------------------------------------------------------------ splash
  const frames = $('frames');
  const frameEls = {};
  const xs = [418, 894];
  A.characters.forEach((ch, i) => {
    const b = document.createElement('button');
    b.className = 'frame';
    b.style.left = (xs[i] ?? 418 + i * 476) + 'px';
    b.dataset.key = ch.key;
    b.innerHTML = `<div class="inner">
        <img class="bgsplash" src="${url('assets/ui/splash_green_' + (i === 0 ? 2 : 3) + '.png')}" alt="" />
        <div class="portrait" style="background-image:url(${url(ch.sprite)})"></div>
      </div><span class="sel-mark">&#9660;</span><span class="pill">BEAST #<span class="cid">${ch.id}</span></span>`;
    b.addEventListener('click', () => {
      sfx.unlock();
      if (game.charKey === ch.key && b.classList.contains('sel') && b.dataset.armed === '1') startGame();
      select(ch.key);
      b.dataset.armed = '1';
    });
    frames.appendChild(b);
    frameEls[ch.key] = b;
  });

  function select(key) {
    game.charKey = key;
    for (const [k, el] of Object.entries(frameEls)) {
      el.classList.toggle('sel', k === key);
      if (k !== key) el.dataset.armed = '0';
    }
    applyCharacterToHud();
  }

  function applyCharacterToHud() {
    const ch = game.char;
    $('hud-id').textContent = '#' + ch.id;
    const lives = $('hud-lives');
    lives.innerHTML = '';
    for (let i = 0; i < CONFIG.player.lives; i++) {
      const im = document.createElement('img');
      im.src = url(ch.head);
      im.alt = 'life';
      lives.appendChild(im);
    }
    cache.lives = -1;
  }

  // ---------------------------------------------------------- static HUD bits
  $('ico-can').src = url(CONFIG.collectibles.gold_can.sprite);
  $('ico-mask').src = url(CONFIG.collectibles.gold_mask.sprite);
  const sprayed = $('hud-sprayed');
  sprayed.innerHTML = '<span class="lbl">SPRAYED:</span>&nbsp;' + CONFIG.hudKillOrder.map((k, i) =>
    `${i ? '<span class="sep">|</span>' : ''}<span class="stat"><b>${CONFIG.enemies[k].label}${k === 'fents' ? ':' : ''}</b><em id="k-${k}">00</em></span>`).join('');
  const hb = $('hud-health');
  for (let i = 0; i < CONFIG.player.maxHealth / 10; i++) { const d = document.createElement('div'); d.className = 'seg on'; hb.appendChild(d); }
  const segs = [...hb.children];

  const cache = {};
  function setText(key, el, val) { if (cache[key] !== val) { cache[key] = val; el.textContent = val; } }
  const kEls = Object.fromEntries(CONFIG.hudKillOrder.map((k) => [k, $('k-' + k)]));

  function updateHud() {
    setText('score', $('hud-score'), pad(game.score, 6));
    setText('wave', $('hud-wave'), pad(game.wave));
    setText('can', $('hud-can'), pad(game.gold.gold_can));
    setText('mask', $('hud-mask'), pad(game.gold.gold_mask));
    for (const k of CONFIG.hudKillOrder) setText('k' + k, kEls[k], pad(game.kills[k]));
    const on = Math.ceil(game.health / 10);
    if (cache.hp !== on) {
      cache.hp = on;
      segs.forEach((s, i) => s.classList.toggle('on', i < on));
      hb.classList.toggle('low', on <= 3);
    }
    if (cache.lives !== game.lives) {
      cache.lives = game.lives;
      [...$('hud-lives').children].forEach((im, i) => im.classList.toggle('lost', i >= game.lives));
    }
  }

  // ------------------------------------------------------------ mode changes
  function showMode() {
    const m = game.mode;
    $('splash').classList.toggle('hidden', m !== 'menu');
    $('hud').classList.toggle('hidden', m === 'menu');
    $('gameover').classList.toggle('hidden', m !== 'gameover');
    $('touch').classList.toggle('hidden', !(m === 'playing' && touchActive));
  }

  function startGame() {
    sfx.unlock();
    sfx.start();
    game.start(game.charKey);
    applyCharacterToHud();
    showMode();
  }

  function replay() {
    sfx.unlock();
    game.restart();
    applyCharacterToHud();
    showMode();
    document.activeElement && document.activeElement.blur();
  }

  function toMenu() {
    game.toMenu();
    showMode();
  }

  $('btn-start').addEventListener('click', startGame);
  $('btn-replay').addEventListener('click', replay);
  $('btn-restart').addEventListener('click', replay);
  $('btn-menu').addEventListener('click', toMenu);

  // ------------------------------------------------------------------- input
  const down = new Set();
  const syncInput = () => {
    game.input.left = down.has('ArrowLeft') || down.has('KeyA') || touch.left;
    game.input.right = down.has('ArrowRight') || down.has('KeyD') || touch.right;
    game.input.spray = down.has('Digit1') || down.has('Numpad1') || down.has('Space') || touch.spray;
  };
  const touch = { left: false, right: false, spray: false };
  let touchActive = false;

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const code = e.code;
    const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Digit1', 'Numpad1', 'Enter'];
    if (gameKeys.includes(code)) e.preventDefault();
    sfx.unlock();
    if (code === 'KeyM') { sfx.toggle(); return; }
    if (game.mode === 'menu') {
      if (e.repeat) return;
      const idx = A.characters.findIndex((c) => c.key === game.charKey);
      if (code === 'ArrowLeft') select(A.characters[Math.max(0, idx - 1)].key);
      else if (code === 'ArrowRight') select(A.characters[Math.min(A.characters.length - 1, idx + 1)].key);
      else if (code === 'Enter' || code === 'Space') startGame();
      return;
    }
    if (game.mode === 'gameover') {
      if (code === 'Enter' || code === 'KeyR') replay();
      return;
    }
    if (code === 'KeyP' || code === 'Escape') { game.setPaused(game.mode === 'playing'); return; }
    if (code === 'KeyR' && !e.repeat) { replay(); return; }
    down.add(code);
    syncInput();
  });
  window.addEventListener('keyup', (e) => { down.delete(e.code); syncInput(); });
  window.addEventListener('blur', () => { down.clear(); touch.left = touch.right = touch.spray = false; syncInput(); if (game.mode === 'playing') game.setPaused(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'playing') game.setPaused(true); });

  const bindTouch = (id, key) => {
    const el = $(id);
    const on = (v) => (ev) => { ev.preventDefault(); touch[key] = v; syncInput(); };
    el.addEventListener('pointerdown', on(true));
    el.addEventListener('pointerup', on(false));
    el.addEventListener('pointercancel', on(false));
    el.addEventListener('pointerleave', on(false));
  };
  bindTouch('t-left', 'left');
  bindTouch('t-right', 'right');
  bindTouch('t-spray', 'spray');
  const enableTouch = () => { touchActive = true; showMode(); };
  if (window.matchMedia('(pointer: coarse)').matches) touchActive = true;
  window.addEventListener('touchstart', enableTouch, { once: true, passive: true });

  // ---------------------------------------------------------------- main loop
  let last = performance.now();
  let prevMode = game.mode;
  let goTimer = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    if (game.mode !== 'menu') updateHud();
    if (game.mode !== prevMode) {
      if (game.mode === 'gameover') goTimer = 0.9;
      else showMode();
      prevMode = game.mode;
    }
    if (goTimer > 0) {
      goTimer -= dt;
      if (goTimer <= 0 && game.mode === 'gameover') fillGameOver();
    }
    requestAnimationFrame(frame);
  }

  function fillGameOver() {
    const s = game.summary;
    $('go-score').textContent = pad(s.score, 6);
    $('go-stats').innerHTML = CONFIG.hudKillOrder.map((k) => `${CONFIG.enemies[k].label} <b>${pad(s.kills[k])}</b>`).join(' &nbsp;|&nbsp; ')
      + `<br/>GOLD CANS <b>${pad(s.gold.gold_can)}</b> &nbsp;|&nbsp; MASKS <b>${pad(s.gold.gold_mask)}</b> &nbsp;|&nbsp; WAVE <b>${pad(s.wave)}</b>`;
    showMode();
  }

  select(game.charKey);
  applyCharacterToHud();
  showMode();
  $('loading').classList.add('hidden');
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  const l = document.getElementById('loading');
  if (l) l.textContent = 'FAILED TO LOAD: ' + err.message;
});
