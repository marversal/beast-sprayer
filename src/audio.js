import { CONFIG } from './config.js';

let ctx = null;
let enabled = CONFIG.audio.enabled;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep({ f = 440, f2 = f, t = 0.1, type = 'square', v = 1, delay = 0 }) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + delay;
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + t);
  g.gain.setValueAtTime(CONFIG.audio.volume * v, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + t + 0.02);
}

function noise(t = 0.12, v = 0.6) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * t), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = CONFIG.audio.volume * v;
  s.buffer = buf;
  s.connect(g).connect(c.destination);
  s.start();
}

export const sfx = {
  unlock: () => ac(),
  toggle() { enabled = !enabled; return enabled; },
  get enabled() { return enabled; },
  spray: () => noise(0.14, 0.5),
  hit: () => beep({ f: 520, f2: 180, t: 0.12, type: 'square', v: 0.8 }),
  kill: () => { beep({ f: 300, f2: 700, t: 0.14, type: 'triangle' }); noise(0.18, 0.5); },
  hurt: () => beep({ f: 160, f2: 60, t: 0.28, type: 'sawtooth', v: 1 }),
  can: () => { beep({ f: 880, t: 0.08 }); beep({ f: 1320, t: 0.14, delay: 0.08 }); },
  mask: () => { [660, 880, 1100, 1480].forEach((f, i) => beep({ f, t: 0.12, type: 'triangle', delay: i * 0.07 })); },
  start: () => { beep({ f: 440, t: 0.08 }); beep({ f: 660, t: 0.12, delay: 0.08 }); },
  wave: () => { beep({ f: 330, t: 0.1 }); beep({ f: 440, t: 0.1, delay: 0.1 }); beep({ f: 554, t: 0.18, delay: 0.2 }); },
  over: () => { [440, 330, 247, 165].forEach((f, i) => beep({ f, t: 0.25, type: 'sawtooth', delay: i * 0.2 })); },
};
