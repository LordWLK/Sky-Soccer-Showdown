// Sons synthétisés en WebAudio : aucun fichier audio.
let ctx = null;
let master = null;
let volume = 1;     // réglage utilisateur (0 à 1), appliqué au gain maître
let haptics = true; // réglage utilisateur : vibrations autorisées ou non

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.4 * volume;
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
  if (!haptics) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* non supporté */ }
}

// ---- nappe musicale générative --------------------------------------------
// Boucle d'accords lents (arpèges feutrés + basse) planifiée par anticipation :
// aucune ressource externe, tout est synthétisé.
let musicGain = null;
let musicOn = true;
let musicTimer = null;
let musicNextBar = 0;
// la m / Fa / Do / Sol — crépusculaire, jamais fatigant
const MUSIC_CHORDS = [
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
  [130.81, 164.81, 196],
  [196, 246.94, 293.66],
];
let musicBarIdx = 0;

function scheduleBar(t0, chord) {
  const c = ctx;
  // basse ronde sur la fondamentale
  const bass = c.createOscillator();
  const bg = c.createGain();
  bass.type = 'sine';
  bass.frequency.value = chord[0] / 2;
  bg.gain.setValueAtTime(0.0001, t0);
  bg.gain.exponentialRampToValueAtTime(0.16, t0 + 0.4);
  bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.8);
  bass.connect(bg).connect(musicGain);
  bass.start(t0);
  bass.stop(t0 + 4);
  // arpège feutré : une note par temps, octave aléatoire douce
  for (let i = 0; i < 4; i++) {
    const f = chord[i % chord.length] * (i === 3 ? 2 : 1);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    const nt = t0 + i * 1.0 + 0.02;
    g.gain.setValueAtTime(0.0001, nt);
    g.gain.exponentialRampToValueAtTime(0.09, nt + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, nt + 1.7);
    o.connect(g).connect(musicGain);
    o.start(nt);
    o.stop(nt + 1.8);
  }
}

function ensureMusic() {
  if (!ctx || musicTimer) return;
  musicGain = ctx.createGain();
  musicGain.gain.value = musicOn ? 1 : 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1500;
  musicGain.connect(lp).connect(master);
  musicNextBar = ctx.currentTime + 0.1;
  // planification par anticipation : ~1 s d'avance suffit
  musicTimer = setInterval(() => {
    if (!musicOn) return;
    while (musicNextBar < ctx.currentTime + 1.2) {
      scheduleBar(musicNextBar, MUSIC_CHORDS[musicBarIdx % MUSIC_CHORDS.length]);
      musicBarIdx += 1;
      musicNextBar += 4;
    }
  }, 500);
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

// rumeur de foule continue : bruit très grave qui « respire » lentement,
// dont le niveau suit la tension du match (setCrowd)
let crowdGain = null;
function ensureCrowd() {
  if (crowdGain || !ctx) return;
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // bruit brun (marche aléatoire) : plus rond qu'un bruit blanc filtré
  let v = 0;
  for (let i = 0; i < len; i++) {
    v = (v + (Math.random() * 2 - 1) * 0.02) * 0.998;
    data[i] = v * 18;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 320;
  crowdGain = ctx.createGain();
  crowdGain.gain.value = 0;
  // respiration lente de la tribune
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.13;
  lfoGain.gain.value = 0.25;
  lfo.connect(lfoGain);
  const depth = ctx.createGain();
  depth.gain.value = 1;
  lfoGain.connect(depth.gain);
  src.connect(filt).connect(depth).connect(crowdGain).connect(master);
  src.start();
  lfo.start();
}

// crachin continu (météo pluie), volume selon l'intensité
let rainGain = null;
function ensureRain() {
  if (rainGain || !ctx) return;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = 2600;
  rainGain = ctx.createGain();
  rainGain.gain.value = 0;
  src.connect(filt).connect(rainGain).connect(master);
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
  unlock() {
    ensure();
    ensureMusic(); // la nappe démarre au premier geste (règle des navigateurs)
  },
  // réglages utilisateur, persistés par l'appelant
  setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = 0.4 * volume;
  },
  setHaptics(on) { haptics = !!on; },
  setMusic(on) {
    musicOn = !!on;
    if (musicGain) {
      musicGain.gain.setTargetAtTime(musicOn ? 1 : 0, ctx.currentTime, 0.3);
      if (musicOn) musicNextBar = Math.max(musicNextBar, ctx.currentTime + 0.2);
    }
  },
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
  // rumeur de foule (0 = silence, ~0.3 = tribune en tension)
  setCrowd(level) {
    if (!ctx) return;
    ensureCrowd();
    crowdGain.gain.setTargetAtTime(Math.min(0.4, Math.max(0, level)), ctx.currentTime, 0.9);
  },
  // crachin de pluie continu (0 = silence)
  setRain(level) {
    if (!ctx) return;
    ensureRain();
    rainGain.gain.setTargetAtTime(Math.min(0.12, Math.max(0, level)), ctx.currentTime, 0.8);
  },
  // « ohhh » déçu des tribunes : poteau, parade, occasion manquée
  ohh() {
    const c = ensure();
    const t0 = c.currentTime;
    for (const [f, d] of [[300, 0], [380, 0.02], [240, 0.04]]) {
      const o = c.createOscillator();
      const g = c.createGain();
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t0 + d);
      o.frequency.exponentialRampToValueAtTime(f * 0.62, t0 + d + 0.55);
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.08, t0 + d + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.7);
      o.connect(lp).connect(g).connect(master);
      o.start(t0 + d);
      o.stop(t0 + d + 0.75);
    }
    noise({ dur: 0.5, vol: 0.14, freq: 800 });
  },
  miss() {
    tone({ type: 'sawtooth', from: 220, to: 90, dur: 0.3, vol: 0.2 });
    vibrate(18);
  },
  // clonc du poteau ou de la barre : résonance métallique brève
  post() {
    tone({ type: 'triangle', from: 310, to: 190, dur: 0.16, vol: 0.5 });
    tone({ type: 'sine', from: 620, to: 590, dur: 0.3, vol: 0.16, delay: 0.01 });
    noise({ dur: 0.04, vol: 0.35, freq: 1800 });
    vibrate(30);
  },
  // claquement métallique d'un câble percuté
  ping() {
    tone({ type: 'square', from: 1700, to: 800, dur: 0.12, vol: 0.28 });
    noise({ dur: 0.05, vol: 0.28, freq: 2600 });
    vibrate(20);
  },
  // choc sourd contre un drone ou la charge d'une grue
  thump() {
    noise({ dur: 0.1, vol: 0.5, freq: 500 });
    tone({ type: 'sine', from: 190, to: 70, dur: 0.18, vol: 0.5 });
    vibrate(25);
  },
  // bâche élastique
  boing() {
    tone({ type: 'sine', from: 150, to: 420, dur: 0.22, vol: 0.38 });
    tone({ type: 'sine', from: 90, to: 240, dur: 0.22, vol: 0.22, delay: 0.03 });
    vibrate(15);
  },
  // bonus (héliport, étoiles de défi)
  bonus() {
    [660, 880, 1320].forEach((f, i) => {
      tone({ type: 'triangle', from: f, to: f, dur: 0.12, vol: 0.3, delay: i * 0.07 });
    });
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
