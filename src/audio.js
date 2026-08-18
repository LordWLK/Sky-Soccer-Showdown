// Sons synthétisés en WebAudio : aucun fichier audio.
let ctx = null;
let master = null;

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'sine', from = 440, to = from, dur = 0.2, vol = 0.5, delay = 0 }) {
  const c = ensure();
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// retour haptique sur mobile (silencieusement ignoré ailleurs)
function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* non supporté */ }
}

// souffle de vent en boucle, dont le volume suit la force du vent
let windGain = null;
function ensureWind() {
  if (windGain || !ctx) return;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 420;
  windGain = ctx.createGain();
  windGain.gain.value = 0;
  src.connect(filt).connect(windGain).connect(master);
  src.start();
}

function noise({ dur = 0.15, vol = 0.4, freq = 1200, delay = 0 }) {
  const c = ensure();
  const t0 = c.currentTime + delay;
  const len = Math.max(1, (dur * c.sampleRate) | 0);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = freq;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filt).connect(gain).connect(master);
  src.start(t0);
}

export const audio = {
  unlock() { ensure(); },
  click() { tone({ type: 'triangle', from: 660, to: 520, dur: 0.07, vol: 0.25 }); },
  whistle() {
    tone({ type: 'square', from: 2200, to: 2200, dur: 0.09, vol: 0.12 });
    tone({ type: 'square', from: 2200, to: 2400, dur: 0.22, vol: 0.12, delay: 0.14 });
  },
  kick() {
    noise({ dur: 0.08, vol: 0.5, freq: 900 });
    tone({ type: 'sine', from: 150, to: 55, dur: 0.16, vol: 0.7 });
    vibrate(12);
  },
  goal() {
    tone({ type: 'triangle', from: 523, to: 523, dur: 0.14, vol: 0.4 });
    tone({ type: 'triangle', from: 659, to: 659, dur: 0.14, vol: 0.4, delay: 0.1 });
    tone({ type: 'triangle', from: 784, to: 784, dur: 0.26, vol: 0.45, delay: 0.2 });
    vibrate([25, 40, 70]);
  },
  // clameur de foule pour les buts du joueur
  cheer() {
    noise({ dur: 0.9, vol: 0.26, freq: 1000 });
    noise({ dur: 0.7, vol: 0.18, freq: 2400, delay: 0.1 });
    [392, 494, 587].forEach((f, i) => {
      tone({ type: 'triangle', from: f, to: f * 1.02, dur: 0.5, vol: 0.14, delay: 0.05 * i });
    });
  },
  // parade du gardien
  save() {
    noise({ dur: 0.09, vol: 0.55, freq: 700 });
    tone({ type: 'sine', from: 220, to: 90, dur: 0.12, vol: 0.5 });
    vibrate(35);
  },
  // souffle continu proportionnel au vent (0 = silence)
  setWind(level) {
    if (!ctx) return; // rien avant le premier geste utilisateur
    ensureWind();
    windGain.gain.setTargetAtTime(Math.min(0.3, Math.abs(level) * 0.22), ctx.currentTime, 0.4);
  },
  miss() {
    tone({ type: 'sawtooth', from: 220, to: 90, dur: 0.3, vol: 0.2 });
    vibrate(18);
  },
  crack() {
    noise({ dur: 0.16, vol: 0.6, freq: 500 });
    noise({ dur: 0.1, vol: 0.4, freq: 1600, delay: 0.05 });
    vibrate(45);
  },
  fall() {
    tone({ type: 'sine', from: 900, to: 160, dur: 0.7, vol: 0.35 });
    vibrate(90);
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', from: f, to: f, dur: 0.22, vol: 0.4, delay: i * 0.13 }));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone({ type: 'sawtooth', from: f, to: f * 0.97, dur: 0.28, vol: 0.18, delay: i * 0.16 }));
  },
};
