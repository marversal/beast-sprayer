import { CONFIG } from './config.js';

const base = import.meta.env.BASE_URL || './';
export const url = (p) => base + p;

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load ' + path));
    img.src = url(path);
  });
}

function makeTint(img, color) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/** y (0..1) of the thin nozzle tip at the left edge of a spray sprite */
function tipY(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, Math.min(14, img.width), img.height).data;
  let sum = 0, n = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < Math.min(14, img.width); x++) {
      if (d[(y * Math.min(14, img.width) + x) * 4 + 3] > 128) { sum += y; n++; }
    }
  }
  return n ? sum / n / img.height : 0.5;
}

export async function loadAssets() {
  let manifest = null;
  try {
    const r = await fetch(url('assets/manifest.json'), { cache: 'no-store' });
    if (r.ok) manifest = await r.json();
  } catch (e) { /* fall back to CONFIG.characters */ }
  const characters = (manifest && manifest.characters) || CONFIG.characters;

  const A = { characters, img: {}, tint: {}, sprayTip: {} };
  const jobs = [];
  const reg = (key, path) => jobs.push(loadImage(path).then((im) => { A.img[key] = im; }));

  reg('bg', 'assets/backgrounds/alley_clean.png');
  for (const ch of characters) { reg('player:' + ch.key, ch.sprite); reg('head:' + ch.key, ch.head); }
  for (const k of Object.keys(CONFIG.enemies)) reg('enemy:' + k, `assets/sprites/enemies/${k}.png`);
  for (const [k, v] of Object.entries(CONFIG.collectibles)) if (v && v.sprite) reg('col:' + k, v.sprite);
  const mBomb = manifest && Array.isArray(manifest.collectibles) && manifest.collectibles.find((c) => c.key === 'smart_bomb');
  const bombSprite = (mBomb && mBomb.sprite) || CONFIG.smartBomb.sprite;
  if (bombSprite) reg('col:smart_bomb', bombSprite);
  for (const t of CONFIG.spray.tiers) reg('spray:' + t.id, t.sprite);
  await Promise.all(jobs);

  for (const k of Object.keys(CONFIG.enemies)) {
    const im = A.img['enemy:' + k];
    A.tint['enemy:' + k + ':green'] = makeTint(im, '#8dff2e');
    A.tint['enemy:' + k + ':white'] = makeTint(im, '#ffffff');
    A.tint['enemy:' + k + ':red'] = makeTint(im, '#ff2a2a');
  }
  for (const t of CONFIG.spray.tiers) A.sprayTip[t.id] = tipY(A.img['spray:' + t.id]);
  return A;
}
