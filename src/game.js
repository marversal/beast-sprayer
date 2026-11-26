import { CONFIG } from './config.js';
import { sfx } from './audio.js';

const W = CONFIG.stage.width;
const H = CONFIG.stage.height;
const GREENS = ['#e4ff7a', '#b6ff2a', '#7cff2b', '#3fd01a', '#1f8f10'];
const GOLDS = ['#fff3a0', '#ffd23a', '#f5a300', '#b86b00'];
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Game {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.A = assets;
    this.mode = 'menu'; // menu | playing | paused | gameover
    this.input = { left: false, right: false, spray: false };
    this.charKey = assets.characters[0].key;
    this.time = 0;
    this.reset();
  }

  get char() { return this.A.characters.find((c) => c.key === this.charKey) || this.A.characters[0]; }

  /** Full session reset (used by start, REPLAY and game-over restart). */
  reset() {
    const P = CONFIG.player;
    this.score = 0;
    this.kills = Object.fromEntries(Object.keys(CONFIG.enemies).map((k) => [k, 0]));
    this.gold = { gold_can: 0, gold_mask: 0 };
    this.smartBombs = 0;
    this.bombCooldown = CONFIG.smartBomb.initialCooldownSeconds;
    this.bombHold = 0;
    this.waveClock = 0;
    this.bombThisWave = false;
    this.contactClock = 1e9;
    this.lives = P.lives;
    this.health = P.maxHealth;
    this.player = { x: W / 2, face: 1, vx: 0, invuln: 0, cooldown: 0, recoil: 0, walk: 0 };
    this.enemies = [];
    this.sprays = [];
    this.particles = [];
    this.texts = [];
    this.rings = [];
    this.pickups = [];
    this.wave = Math.max(0, CONFIG.waves.startWave - 1);
    this.toSpawn = 0;
    this.spawnTimer = 0;
    this.waveDelay = CONFIG.waves.firstWaveDelay;
    this.banner = 0;
    this.shake = 0;
    this.flash = { color: '#fff', a: 0 };
    this.aura = 0;
    this.pickupTimer = rand(...CONFIG.collectibles.spawnEverySeconds);
    this.summary = null;
  }

  start(charKey) {
    if (charKey) this.charKey = charKey;
    this.reset();
    this.mode = 'playing';
  }

  restart() { this.start(); }

  toMenu() { this.reset(); this.mode = 'menu'; }

  setPaused(p) {
    if (this.mode === 'playing' && p) this.mode = 'paused';
    else if (this.mode === 'paused' && !p) this.mode = 'playing';
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    this.time += dt;
    this.flash.a = Math.max(0, this.flash.a - dt * 1.8);
    if (this.mode !== 'playing') {
      this.updateEffects(dt);
      return;
    }
    this.shake = Math.max(0, this.shake - dt);
    this.updatePlayer(dt);
    this.updateWaves(dt);
    this.updateEnemies(dt);
    this.updateSprays(dt);
    this.updatePickups(dt);
    this.updateSmartBomb(dt);
    this.updateEffects(dt);
  }

  updatePlayer(dt) {
    const P = CONFIG.player;
    const p = this.player;
    const dir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    p.vx = dir * P.speed;
    p.x = clamp(p.x + p.vx * dt, P.minX, P.maxX);
    if (dir) { p.face = dir; p.walk += dt * 11; }
    p.invuln = Math.max(0, p.invuln - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.recoil = Math.max(0, p.recoil - dt * 6);
    this.aura = Math.max(0, this.aura - dt);
    if (this.input.spray && p.cooldown <= 0) this.fireSpray();
  }

  muzzle() {
    const p = this.player;
    const img = this.A.img['player:' + this.char.key];
    const s = CONFIG.player.scale;
    const [mx, my] = this.char.muzzle;
    const bob = this.bobOffset();
    return {
      x: p.x + p.face * (mx - img.width / 2) * s - p.face * p.recoil * 6,
      y: CONFIG.player.groundY - (img.height - my) * s + bob,
    };
  }

  bobOffset() {
    const p = this.player;
    return p.vx ? -Math.abs(Math.sin(p.walk)) * 6 : Math.sin(this.time * 3) * 1.5;
  }

  enemyBox(e) {
    const img = this.A.img['enemy:' + e.type];
    const w = img.width * e.def.scale;
    const h = img.height * e.def.scale;
    return { x: e.x, w: w * 0.62, h, top: e.y - h, bottom: e.y, cy: e.y - h * 0.5 };
  }

  fireSpray() {
    const S = CONFIG.spray;
    const p = this.player;
    const m = this.muzzle();
    let target = null;
    let best = Infinity;
    for (const e of this.enemies) {
      if (e.state !== 'alive') continue;
      const dx = (e.x - m.x) * p.face;
      if (dx < 10) continue;
      if (dx < best) { best = dx; target = e; }
    }
    let tier = 0;
    let angle = 0;
    if (target) {
      const dist = best;
      tier = dist <= S.tiers[0].range * 0.85 ? 0 : dist <= S.tiers[1].range * 0.85 ? 1 : 2;
      if (S.autoAim) {
        const b = this.enemyBox(target);
        const a = Math.atan2(m.y - b.cy, dist);
        const lim = (S.maxAimAngleDeg * Math.PI) / 180;
        angle = clamp(a, -lim, lim);
      }
    }
    const T = S.tiers[tier];
    p.cooldown = T.cooldown;
    p.recoil = 1;
    this.sprays.push({
      tier, T, ox: m.x, oy: m.y, face: p.face, ang: angle, travel: 0, alpha: 1,
      state: 'fly', pierce: T.pierce, hit: new Set(),
    });
    sfx.spray();
  }

  /** true when `wave` falls in the eased (gentler) part of the difficulty ramp */
  isEased(wave) {
    const E = CONFIG.waves.ease;
    return !!E && E.enabled && wave >= E.fromWave && wave <= E.toWave;
  }

  /** base + per-wave increments, using the eased increment for eased waves (wave 1 = base) */
  rampValue(base, key, easedKey, wave) {
    const Wv = CONFIG.waves;
    let v = base;
    for (let k = 2; k <= wave; k++) v += this.isEased(k) ? Wv.ease[easedKey] : Wv[key];
    return v;
  }

  enemiesForWave(wave) {
    return Math.round(this.rampValue(CONFIG.waves.baseCount, 'countPerWave', 'countPerWave', wave));
  }

  speedMulForWave(wave) {
    return Math.min(2.2, this.rampValue(1, 'speedRampPerWave', 'speedRampPerWave', wave));
  }

  spawnIntervalForWave(wave) {
    const Wv = CONFIG.waves;
    return Math.max(Wv.spawnIntervalMin, Wv.spawnIntervalStart - this.rampValue(0, 'spawnIntervalStep', 'spawnIntervalStep', wave));
  }

  maxAliveForWave(wave) {
    return this.isEased(wave) ? CONFIG.waves.ease.maxAlive : CONFIG.waves.maxAlive;
  }

  updateWaves(dt) {
    const Wv = CONFIG.waves;
    if (this.toSpawn <= 0 && this.enemies.length === 0) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        this.wave += 1;
        this.waveClock = 0;
        this.bombThisWave = false;
        this.toSpawn = this.enemiesForWave(this.wave);
        if (this.isEased(this.wave)) this.health = Math.min(CONFIG.player.maxHealth, this.health + Wv.ease.healOnWaveStart);
        this.spawnTimer = 0.4;
        this.waveDelay = Wv.betweenWaves;
        this.banner = 2.0;
        sfx.wave();
      }
    }
    if (this.banner > 0) this.banner -= dt;
    if (this.toSpawn > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemies.filter((e) => e.state === 'alive').length < this.maxAliveForWave(this.wave)) {
        this.spawnEnemy();
        this.toSpawn -= 1;
        this.spawnTimer = this.spawnIntervalForWave(this.wave) * rand(0.7, 1.3);
      }
    }
  }

  pickType() {
    const pool = Object.entries(CONFIG.enemies).filter(([, d]) => d.minWave <= this.wave);
    let total = pool.reduce((s, [, d]) => s + d.weight, 0);
    let r = Math.random() * total;
    for (const [k, d] of pool) { r -= d.weight; if (r <= 0) return k; }
    return pool[0][0];
  }

  /** public so tests / debug can force specific enemies */
  spawnEnemy(type = this.pickType(), x = null) {
    const def = CONFIG.enemies[type];
    const M = CONFIG.waves.spawnMargin;
    const fromLeft = x === null ? Math.random() < 0.5 : x < W / 2;
    const px = x === null ? (fromLeft ? -M : W + M) : x;
    const speedMul = this.speedMulForWave(this.wave);
    const e = {
      type, def, x: px, hp: def.hp, state: 'alive', t: 0, flash: 0, seed: Math.random() * 10,
      speed: def.speed * speedMul * rand(0.9, 1.1), face: 1, vaporT: 0,
    };
    if (def.flying) {
      e.baseY = rand(def.minAltitude, def.maxAltitude);
      e.y = e.baseY;
    } else {
      e.y = CONFIG.player.groundY + rand(-12, 12);
    }
    this.enemies.push(e);
    return e;
  }

  updateEnemies(dt) {
    const P = CONFIG.player;
    const p = this.player;
    for (const e of this.enemies) {
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.state === 'dying') {
        e.vaporT += dt / CONFIG.spray.vaporizeSeconds;
        e.y -= 40 * dt;
        continue;
      }
      const dx = p.x - e.x;
      const dir = Math.sign(dx) || 1;
      e.face = dir;
      if (e.def.flying) {
        const near = Math.abs(dx) < 330;
        const targetY = near ? P.groundY - P.bodyHeight * 0.6 : e.baseY + Math.sin(e.t * 3 + e.seed) * 22;
        e.x += dir * e.speed * dt * (near ? 0.8 : 1);
        const k = near ? 1.1 : 3;
        e.y += (targetY - e.y) * Math.min(1, k * dt) + (near ? Math.sign(targetY - e.y) * 40 * dt : 0);
        const hitDx = Math.abs(dx);
        const hitDy = Math.abs(e.y - (P.groundY - P.bodyHeight * 0.6));
        if (hitDx < P.contactRadius + 14 && hitDy < 70) this.enemyHitsPlayer(e);
      } else {
        if (Math.abs(dx) > P.contactRadius) e.x += dir * e.speed * dt;
        else this.enemyHitsPlayer(e);
      }
    }
    this.enemies = this.enemies.filter((e) => !(e.state === 'dying' && e.vaporT >= 1) && e.state !== 'gone');
  }

  enemyHitsPlayer(e) {
    e.state = 'gone';
    this.contactClock = 0;
    const b = this.enemyBox(e);
    this.burst(e.x, b.cy, 18, ['#ffffff', '#cfcfcf', '#8a8a8a'], 220, 0.45, 8, 0);
    this.hurtPlayer(e.def.damage, e.x);
  }

  hurtPlayer(dmg, fromX) {
    const p = this.player;
    if (p.invuln > 0 || this.mode !== 'playing') return;
    this.health = Math.max(0, this.health - dmg);
    p.invuln = CONFIG.player.hitInvulnSeconds;
    p.x = clamp(p.x - Math.sign(fromX - p.x) * 34, CONFIG.player.minX, CONFIG.player.maxX);
    this.shake = 0.3;
    this.flash = { color: '#ff1a1a', a: 0.45 };
    sfx.hurt();
    this.floatText(p.x, CONFIG.player.groundY - 250, `-${dmg}`, '#ff5555');
    if (this.health <= 0) this.loseLife();
  }

  loseLife() {
    const P = CONFIG.player;
    this.lives -= 1;
    if (this.lives <= 0) {
      this.lives = 0;
      this.gameOver();
      return;
    }
    this.health = P.maxHealth;
    this.player.invuln = P.respawnInvulnSeconds;
    // mercy: vaporise everything near the player (no points)
    for (const e of this.enemies) {
      if (e.state === 'alive' && Math.abs(e.x - this.player.x) < 420) this.killEnemy(e, false);
    }
    this.floatText(this.player.x, P.groundY - 280, 'LIFE LOST', '#ffee00');
  }

  gameOver() {
    this.mode = 'gameover';
    this.summary = { score: this.score, kills: { ...this.kills }, gold: { ...this.gold }, smartBombs: this.smartBombs, wave: this.wave };
    sfx.over();
  }

  updateSprays(dt) {
    for (const s of this.sprays) {
      const T = s.T;
      const len = this.A.img['spray:' + T.id].width;
      const vx = s.face * Math.cos(s.ang);
      const vy = -Math.sin(s.ang);
      if (s.state === 'fly') {
        s.travel = Math.min(T.range, s.travel + T.speed * dt);
        const hx = s.ox + vx * s.travel;
        const hy = s.oy + vy * s.travel;
        const tailD = Math.max(0, s.travel - len);
        const steps = Math.max(2, Math.ceil((s.travel - tailD) / 22));
        for (let i = 0; i <= steps && s.state === 'fly'; i++) {
          const d = tailD + ((s.travel - tailD) * i) / steps;
          this.sprayCollide(s, s.ox + vx * d, s.oy + vy * d);
        }
        s.hx = hx;
        s.hy = hy;
        if (s.travel >= T.range) s.state = 'fade';
        if (s.pierce <= 0) s.state = 'fade';
      } else {
        s.alpha -= dt * 5;
        s.travel = Math.min(T.range, s.travel + T.speed * dt * 0.25);
      }
    }
    this.sprays = this.sprays.filter((s) => s.alpha > 0);
  }

  sprayCollide(s, px, py) {
    for (const e of this.enemies) {
      if (e.state !== 'alive' || s.hit.has(e) || s.pierce <= 0) continue;
      const b = this.enemyBox(e);
      const r = s.T.hitRadius;
      if (Math.abs(px - e.x) < b.w / 2 + r && py > b.top - r && py < b.bottom + r) {
        s.hit.add(e);
        s.pierce -= 1;
        this.damageEnemy(e, s.T.damage, px, py);
      }
    }
  }

  damageEnemy(e, dmg, hx, hy) {
    e.hp -= dmg;
    e.flash = 0.1;
    this.burst(hx, hy, CONFIG.spray.particlesPerHit, GREENS, CONFIG.spray.particleSpeed, CONFIG.spray.particleLife, 9, CONFIG.spray.particleGravity);
    if (e.hp <= 0) {
      this.killEnemy(e, true);
    } else {
      sfx.hit();
    }
  }

  killEnemy(e, award, opts = {}) {
    e.state = 'dying';
    e.vaporT = 0;
    const b = this.enemyBox(e);
    this.burst(e.x, b.cy, CONFIG.spray.particlesOnDeath, GREENS, CONFIG.spray.particleSpeed * 1.4, CONFIG.spray.particleLife * 1.4, 12, CONFIG.spray.particleGravity);
    if (!award) return;
    this.score += e.def.points;
    this.kills[e.type] += 1;
    this.floatText(e.x, b.top, `+${e.def.points}`, '#b6ff2a');
    if (opts.silent) return;
    sfx.kill();
    if (Math.random() < CONFIG.collectibles.dropChanceOnKill) this.spawnPickup(null, e.x);
  }

  // ------------------------------------------------------------ collectibles
  spawnPickup(kind = null, x = null) {
    const C = CONFIG.collectibles;
    if (!kind) kind = Math.random() * (C.gold_can.weight + C.gold_mask.weight) < C.gold_can.weight ? 'gold_can' : 'gold_mask';
    if (x === null) {
      do { x = rand(CONFIG.player.minX + 40, CONFIG.player.maxX - 40); } while (Math.abs(x - this.player.x) < 260);
    }
    const pk = { kind, x: clamp(x, 120, W - 120), t: 0, life: kind === 'smart_bomb' ? CONFIG.smartBomb.lifetime : C.lifetime };
    this.pickups.push(pk);
    return pk;
  }

  updatePickups(dt) {
    const C = CONFIG.collectibles;
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0 && this.wave > 0) {
      this.spawnPickup();
      this.pickupTimer = rand(...C.spawnEverySeconds);
    }
    const p = this.player;
    for (const pk of this.pickups) {
      pk.t += dt;
      pk.life -= dt;
      const radius = pk.kind === 'smart_bomb' ? CONFIG.smartBomb.pickupRadius : C.pickupRadius;
      if (pk.life > 0 && Math.abs(pk.x - p.x) < radius) {
        pk.life = -1;
        this.collect(pk);
      }
    }
    this.pickups = this.pickups.filter((pk) => pk.life > 0);
  }

  collect(pk) {
    if (pk.kind === 'smart_bomb') { this.detonateSmartBomb(pk); return; }
    const def = CONFIG.collectibles[pk.kind];
    const y = CONFIG.player.groundY - 90;
    this.score += def.points;
    this.gold[pk.kind] += 1;
    this.floatText(pk.x, y - 100, `+${def.points}`, '#ffd23a', 1.3);
    this.burst(pk.x, y, 40, GOLDS, 380, 0.9, 10, 200);
    this.rings.push({ x: pk.x, y, r: 10, max: 160, a: 1, color: '#ffd23a' });
    if (pk.kind === 'gold_mask') {
      // special effect: triple golden shockwave, star burst, gold flash and a short aura
      this.rings.push({ x: pk.x, y, r: 0, max: 280, a: 1, color: '#fff3a0', delay: 0.08 });
      this.rings.push({ x: pk.x, y, r: 0, max: 420, a: 1, color: '#f5a300', delay: 0.18 });
      this.burst(pk.x, y, 70, GOLDS, 620, 1.1, 12, 0);
      this.flash = { color: '#ffd23a', a: 0.4 };
      this.aura = 1.6;
      sfx.mask();
    } else {
      sfx.can();
    }
  }

  // -------------------------------------------------------------- smart bomb
  /** "heavily surrounded": crowd nearby, close on both sides, or recent contact with a few more close */
  isSurrounded() {
    const B = CONFIG.smartBomb;
    const px = this.player.x;
    let near = 0;
    let left = 0;
    let right = 0;
    let contactNear = 0;
    for (const e of this.enemies) {
      if (e.state !== 'alive') continue;
      const dx = e.x - px;
      const ad = Math.abs(dx);
      if (ad <= B.surroundRadius) near += 1;
      if (ad <= B.contactNearRadius) contactNear += 1;
      if (ad <= B.bothSidesRadius) { if (dx < 0) left += 1; else right += 1; }
    }
    return near >= B.surroundCount
      || (left >= B.bothSidesCount && right >= B.bothSidesCount)
      || (this.contactClock <= B.contactWindowSeconds && contactNear >= B.contactNearCount);
  }

  smartBombAvailable() {
    return CONFIG.smartBomb.enabled && this.wave >= CONFIG.smartBomb.startWave;
  }

  updateSmartBomb(dt) {
    const B = CONFIG.smartBomb;
    this.bombCooldown = Math.max(0, this.bombCooldown - dt);
    this.contactClock += dt;
    this.waveClock += dt;
    if (!this.smartBombAvailable()) { this.bombHold = 0; return; }
    const onScreen = this.pickups.filter((pk) => pk.kind === 'smart_bomb').length;
    if (onScreen >= B.maxOnScreen) { this.bombHold = 0; return; }
    this.bombHold = this.isSurrounded() ? this.bombHold + dt : 0;
    if (this.bombHold >= B.holdSeconds && this.bombCooldown <= 0) {
      this.spawnSmartBomb();
      return;
    }
    if (!this.bombThisWave && this.waveClock >= B.fallbackSeconds
      && this.enemies.filter((e) => e.state === 'alive').length >= B.fallbackMinEnemies) {
      this.spawnSmartBomb();
    }
  }

  /** public so tests / debug can force one (ignores wave / cooldown / surround checks) */
  spawnSmartBomb(x = null) {
    const B = CONFIG.smartBomb;
    const P = CONFIG.player;
    const px = this.player.x;
    if (x === null) {
      let l = 0;
      let r = 0;
      for (const e of this.enemies) if (e.state === 'alive') { if (e.x < px) l += 1; else r += 1; }
      let side = l === r ? (Math.random() < 0.5 ? -1 : 1) : l < r ? -1 : 1;
      // keep it on the walkable pavement: flip sides if the chosen side has no room
      const off = rand(...B.spawnOffset);
      if (px + side * off < P.minX + 40 || px + side * off > P.maxX - 40) side = -side;
      x = clamp(px + side * off, P.minX + 40, P.maxX - 40);
    }
    const pk = this.spawnPickup('smart_bomb', x);
    this.bombCooldown = B.cooldownSeconds;
    this.bombHold = 0;
    this.bombThisWave = true;
    this.floatText(pk.x, CONFIG.player.groundY - 210, 'SMART BOMB!', '#ffe14a', 1.1);
    sfx.wave();
    return pk;
  }

  detonateSmartBomb(pk = null) {
    const B = CONFIG.smartBomb;
    const P = CONFIG.player;
    const cx = pk ? pk.x : this.player.x;
    const cy = P.groundY - 90;
    this.smartBombs += 1;
    let killed = 0;
    for (const e of this.enemies) {
      if (e.state !== 'alive') continue;
      if (B.onScreenOnly) {
        const img = this.A.img['enemy:' + e.type];
        const half = (img.width * e.def.scale) / 2;
        if (e.x + half < 0 || e.x - half > W) continue;
      }
      this.killEnemy(e, true, { silent: true });
      killed += 1;
    }
    this.pickups = this.pickups.filter((q) => q.kind !== 'smart_bomb');
    this.bombHold = 0;
    this.flash = { color: B.flashColor, a: B.flashAlpha };
    this.shake = B.shakeSeconds;
    this.aura = 0;
    this.rings.push({ x: cx, y: cy, r: 10, max: 700, a: 1, color: '#ffffff' });
    this.rings.push({ x: cx, y: cy, r: 0, max: 1000, a: 1, color: '#b6ff2a', delay: 0.06 });
    this.rings.push({ x: cx, y: cy, r: 0, max: 1400, a: 1, color: '#3fd01a', delay: 0.14 });
    this.burst(cx, cy, 90, GREENS, 900, 1.2, 14, -40);
    this.burst(cx, cy, 50, ['#ffffff', '#ffe14a', '#ff9a1a'], 700, 0.8, 12, 120);
    this.floatText(cx, P.groundY - 260, 'SMART BOMB!', '#b6ff2a', 1.6);
    sfx.bomb();
    return killed;
  }

  // ----------------------------------------------------------------- effects
  burst(x, y, n, colors, speed, life, size, grav) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * rand(0.2, 1);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.2,
        life: life * rand(0.6, 1), max: life, size: Math.round(rand(size * 0.5, size) / 2) * 2 || 4,
        color: colors[(Math.random() * colors.length) | 0], grav,
      });
    }
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  floatText(x, y, text, color, scale = 1) {
    this.texts.push({ x, y, text, color, life: 1, scale });
  }

  updateEffects(dt) {
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += pt.grav * dt;
      pt.vx *= 1 - 1.5 * dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    for (const t of this.texts) { t.life -= dt * 0.9; t.y -= 55 * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) {
      if (r.delay > 0) { r.delay -= dt; continue; }
      r.r += (r.max - r.r) * Math.min(1, dt * 5) + 40 * dt;
      r.a -= dt * 1.6;
    }
    this.rings = this.rings.filter((r) => r.a > 0);
  }

  // ------------------------------------------------------------------ render
  render() {
    const g = this.ctx;
    const A = this.A;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    g.save();
    if (this.shake > 0) g.translate(rand(-8, 8) * this.shake * 3, rand(-6, 6) * this.shake * 3);
    g.drawImage(A.img.bg, 0, 0, W, H);

    if (this.mode !== 'menu') {
      const items = [];
      for (const e of this.enemies) items.push({ y: e.y + (e.def.flying ? 400 : 0), draw: () => this.drawEnemy(g, e) });
      for (const pk of this.pickups) items.push({ y: CONFIG.player.groundY + (pk.kind === 'smart_bomb' ? 40 : -5), draw: () => this.drawPickup(g, pk) });
      items.push({ y: CONFIG.player.groundY, draw: () => this.drawPlayer(g) });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.draw();
      for (const s of this.sprays) this.drawSpray(g, s);
      this.drawParticles(g);
      this.drawRings(g);
      this.drawTexts(g);
    }
    g.restore();

    if (this.flash.a > 0) {
      g.globalAlpha = this.flash.a;
      g.fillStyle = this.flash.color;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    if (this.mode === 'playing' && this.banner > 0) this.drawBanner(g);
    if (this.mode === 'paused') this.drawPaused(g);
  }

  shadow(g, x, y, w) {
    g.fillStyle = 'rgba(0,0,0,0.38)';
    g.beginPath();
    g.ellipse(x, y - 2, w / 2, 11, 0, 0, Math.PI * 2);
    g.fill();
  }

  drawPlayer(g) {
    const p = this.player;
    const P = CONFIG.player;
    const img = this.A.img['player:' + this.char.key];
    const s = P.scale;
    const w = img.width * s;
    const h = img.height * s;
    if (p.invuln > 0 && Math.floor(this.time * 18) % 2 === 0 && this.mode === 'playing') return;
    this.shadow(g, p.x, P.groundY, w * 0.8);
    if (this.aura > 0) {
      const a = Math.min(1, this.aura);
      const grd = g.createRadialGradient(p.x, P.groundY - h / 2, 20, p.x, P.groundY - h / 2, 190);
      grd.addColorStop(0, `rgba(255,214,60,${0.5 * a})`);
      grd.addColorStop(1, 'rgba(255,214,60,0)');
      g.fillStyle = grd;
      g.fillRect(p.x - 200, P.groundY - h / 2 - 200, 400, 400);
    }
    g.save();
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.translate(p.x, P.groundY + this.bobOffset());
    g.scale(p.face, 1);
    g.rotate(p.vx ? Math.sin(p.walk) * 0.025 : 0);
    g.translate(-p.recoil * 4, 0);
    g.drawImage(img, -w / 2, -h, w, h);
    g.restore();
  }

  drawEnemy(g, e) {
    const A = this.A;
    const img = A.img['enemy:' + e.type];
    const w = img.width * e.def.scale;
    const h = img.height * e.def.scale;
    if (!e.def.flying) this.shadow(g, e.x, e.y, w * 0.75);
    else {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath();
      g.ellipse(e.x, CONFIG.player.groundY + 2, w * 0.3, 8, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.save();
    g.imageSmoothingEnabled = false;
    // sprites are drawn facing LEFT; flip when walking right
    const bob = e.state === 'alive' && !e.def.flying ? Math.abs(Math.sin(e.t * (e.speed / 14))) * -5 : 0;
    g.translate(e.x, e.y + bob);
    g.scale(e.face > 0 ? -1 : 1, 1);
    if (e.state === 'dying') {
      const t = Math.min(1, e.vaporT);
      const green = A.tint['enemy:' + e.type + ':green'];
      // pixel dissolve: horizontal bands drop out progressively, rest turns neon green
      const band = 8;
      for (let y = 0; y < img.height; y += band) {
        const hash = Math.abs(Math.sin((y + e.seed * 97) * 12.9898) * 43758.5453) % 1;
        if (hash < t * 1.1) continue;
        g.globalAlpha = 1 - t * 0.6;
        g.drawImage(green, 0, y, img.width, band, -w / 2, -h + y * e.def.scale, w, band * e.def.scale + 1);
      }
      g.globalAlpha = 1;
    } else {
      g.drawImage(img, -w / 2, -h, w, h);
      if (e.flash > 0) {
        g.globalAlpha = Math.min(1, e.flash * 8) * 0.8;
        g.drawImage(A.tint['enemy:' + e.type + ':green'], -w / 2, -h, w, h);
        g.globalAlpha = 1;
      }
    }
    g.restore();
  }

  drawSpray(g, s) {
    const A = this.A;
    const img = A.img['spray:' + s.T.id];
    const len = img.width;
    const vx = s.face * Math.cos(s.ang);
    const vy = -Math.sin(s.ang);
    const tailD = Math.max(0, s.travel - len);
    const tx = s.ox + vx * tailD;
    const ty = s.oy + vy * tailD;
    g.save();
    g.imageSmoothingEnabled = false;
    g.globalAlpha = clamp(s.alpha, 0, 1);
    g.translate(tx, ty);
    if (s.face < 0) g.scale(-1, 1);
    g.rotate(-s.ang);
    const tip = A.sprayTip[s.T.id] * img.height;
    g.drawImage(img, 0, -tip);
    g.restore();
  }

  drawPickup(g, pk) {
    const A = this.A;
    const isBomb = pk.kind === 'smart_bomb';
    const def = isBomb ? CONFIG.smartBomb : CONFIG.collectibles[pk.kind];
    const img = A.img['col:' + pk.kind];
    const w = img.width * def.scale;
    const h = img.height * def.scale;
    const bob = Math.sin(pk.t * 4) * 9;
    const y = CONFIG.player.groundY - 70 + bob;
    const warn = isBomb ? CONFIG.smartBomb.blinkSeconds : 2;
    if (pk.life < warn && Math.floor(pk.life * (isBomb ? 10 : 8)) % 2 === 0) return;
    this.shadow(g, pk.x, CONFIG.player.groundY, w * 0.9);
    const glow = g.createRadialGradient(pk.x, y - h / 2, 5, pk.x, y - h / 2, 90);
    glow.addColorStop(0, isBomb ? 'rgba(255,90,40,0.6)' : 'rgba(255,214,60,0.55)');
    glow.addColorStop(1, isBomb ? 'rgba(255,90,40,0)' : 'rgba(255,214,60,0)');
    g.fillStyle = glow;
    g.fillRect(pk.x - 100, y - h / 2 - 100, 200, 200);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, pk.x - w / 2, y - h, w, h);
    // twinkle
    const tw = (Math.sin(pk.t * 6) + 1) / 2;
    g.fillStyle = `rgba(255,255,220,${tw})`;
    g.fillRect(pk.x + w / 2 - 6, y - h + 4, 8, 8);
    if (isBomb) this.drawBombHint(g, pk, y - h, w);
  }

  /** pulsing label + bobbing arrow so the pickup is impossible to miss */
  drawBombHint(g, pk, topY, w) {
    const pulse = 1 + Math.sin(pk.t * 9) * 0.12;
    const ly = topY - 46 - Math.abs(Math.sin(pk.t * 5)) * 10;
    g.save();
    g.textAlign = 'center';
    g.translate(pk.x, ly);
    g.scale(pulse, pulse);
    g.font = '700 38px "Chakra Petch", sans-serif';
    g.lineWidth = 8;
    g.lineJoin = 'round';
    g.strokeStyle = '#08001a';
    g.strokeText('SMART BOMB!', 0, 0);
    g.fillStyle = Math.floor(pk.t * 6) % 2 ? '#ffe14a' : '#ff5a28';
    g.fillText('SMART BOMB!', 0, 0);
    g.restore();
    const ay = topY - 22 + Math.sin(pk.t * 8) * 6;
    g.fillStyle = '#ffe14a';
    g.strokeStyle = '#08001a';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(pk.x - 16, ay - 14);
    g.lineTo(pk.x + 16, ay - 14);
    g.lineTo(pk.x, ay + 8);
    g.closePath();
    g.stroke();
    g.fill();
  }

  drawParticles(g) {
    for (const pt of this.particles) {
      g.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      g.fillStyle = pt.color;
      g.fillRect(Math.round(pt.x / 2) * 2, Math.round(pt.y / 2) * 2, pt.size, pt.size);
    }
    g.globalAlpha = 1;
  }

  drawRings(g) {
    for (const r of this.rings) {
      if (r.delay > 0) continue;
      g.globalAlpha = clamp(r.a, 0, 1);
      g.strokeStyle = r.color;
      g.lineWidth = 8;
      g.beginPath();
      g.ellipse(r.x, r.y, r.r, r.r * 0.55, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  drawTexts(g) {
    g.textAlign = 'center';
    for (const t of this.texts) {
      g.globalAlpha = clamp(t.life * 1.5, 0, 1);
      g.font = `700 ${Math.round(40 * t.scale)}px "Chakra Petch", sans-serif`;
      g.lineWidth = 7;
      g.strokeStyle = '#08001a';
      g.strokeText(t.text, t.x, t.y);
      g.fillStyle = t.color;
      g.fillText(t.text, t.x, t.y);
    }
    g.globalAlpha = 1;
  }

  drawBanner(g) {
    const a = clamp(Math.min(this.banner, 2 - this.banner + 0.2) * 3, 0, 1);
    g.save();
    g.globalAlpha = a;
    g.textAlign = 'center';
    g.font = '400 150px "Permanent Marker", cursive';
    g.lineWidth = 16;
    g.strokeStyle = '#2a0050';
    g.lineJoin = 'round';
    const y = 330 - (1 - a) * 30;
    g.strokeText(`WAVE ${this.wave}`, W / 2, y);
    g.fillStyle = '#ff2fd6';
    g.fillText(`WAVE ${this.wave}`, W / 2, y);
    g.restore();
  }

  drawPaused(g) {
    g.fillStyle = 'rgba(5,0,20,0.55)';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffee00';
    g.textAlign = 'center';
    g.font = '700 110px "Chakra Petch", sans-serif';
    g.fillText('PAUSED', W / 2, H / 2 - 20);
    g.fillStyle = '#fff';
    g.font = '700 38px "Chakra Petch", sans-serif';
    g.fillText('PRESS P TO RESUME', W / 2, H / 2 + 50);
  }
}
