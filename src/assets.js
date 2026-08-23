// Toutes les textures sont générées en canvas : aucun asset externe.
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTexture(canvas, repeat) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
}

// ---------------------------------------------------------------- drapeaux --
export function drawFlagBadge(nationId, size = 128) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const r = size / 2;
  g.save();
  g.beginPath();
  g.arc(r, r, r * 0.92, 0, Math.PI * 2);
  g.clip();
  const hBands = (cols, weights = cols.map(() => 1)) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let y = 0;
    cols.forEach((col, i) => {
      const h = (size * weights[i]) / total;
      g.fillStyle = col;
      g.fillRect(0, y, size, h + 1);
      y += h;
    });
  };
  const vBands = (cols, weights = cols.map(() => 1)) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let x = 0;
    cols.forEach((col, i) => {
      const w = (size * weights[i]) / total;
      g.fillStyle = col;
      g.fillRect(x, 0, w + 1, size);
      x += w;
    });
  };
  if (nationId === 'de') {
    hBands(['#2b2b2b', '#dd0000', '#ffce00']);
  } else if (nationId === 'it') {
    vBands(['#009246', '#f4f4f4', '#ce2b37']);
  } else if (nationId === 'es') {
    hBands(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]);
  } else if (nationId === 'fr') {
    vBands(['#0055a4', '#f4f4f4', '#ef4135']);
  } else if (nationId === 'br') {
    g.fillStyle = '#009c3b'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#ffdf00';
    g.beginPath();
    g.moveTo(size / 2, size * 0.13); g.lineTo(size * 0.9, size / 2);
    g.lineTo(size / 2, size * 0.87); g.lineTo(size * 0.1, size / 2);
    g.closePath(); g.fill();
    g.fillStyle = '#002776';
    g.beginPath(); g.arc(size / 2, size / 2, size * 0.17, 0, Math.PI * 2); g.fill();
  } else if (nationId === 'en') {
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#ce1124';
    g.fillRect(size * 0.42, 0, size * 0.16, size);
    g.fillRect(0, size * 0.42, size, size * 0.16);
  } else if (nationId === 'ar') {
    hBands(['#74acdf', '#f4f4f4', '#74acdf']);
    g.fillStyle = '#f6b40e';
    g.beginPath(); g.arc(size / 2, size / 2, size * 0.09, 0, Math.PI * 2); g.fill();
  } else { // pt
    vBands(['#046a38', '#da291c'], [2, 3]);
    g.fillStyle = '#ffe900';
    g.beginPath(); g.arc(size * 0.4, size / 2, size * 0.12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#da291c';
    g.beginPath(); g.arc(size * 0.4, size / 2, size * 0.06, 0, Math.PI * 2); g.fill();
  }
  // reflet doux en haut, ombre en bas : effet badge bombé
  const grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  g.restore();
  // anneau blanc
  g.beginPath();
  g.arc(r, r, r * 0.92, 0, Math.PI * 2);
  g.lineWidth = size * 0.06;
  g.strokeStyle = '#f6f6f6';
  g.stroke();
  return c;
}

export function flagBadgeDataURL(nationId) {
  return drawFlagBadge(nationId, 128).toDataURL();
}

export function flagBadgeTexture(nationId) {
  return toTexture(drawFlagBadge(nationId, 256));
}

// ------------------------------------------------------- tours & fenêtres --
export function towerTextures(baseColor = '#1d2946', litRatio = 0.28) {
  const w = 128, h = 256;
  const map = makeCanvas(w, h);
  const emissive = makeCanvas(w, h);
  const g = map.getContext('2d');
  const e = emissive.getContext('2d');
  g.fillStyle = baseColor; g.fillRect(0, 0, w, h);
  e.fillStyle = '#000'; e.fillRect(0, 0, w, h);
  const cols = 6, rows = 16;
  const cw = w / cols, ch = h / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cw + cw * 0.18, y = j * ch + ch * 0.2;
      const ww = cw * 0.64, wh = ch * 0.55;
      if (Math.random() < litRatio) {
        const warm = 200 + (Math.random() * 55) | 0;
        g.fillStyle = `rgb(255,${warm},130)`;
        g.fillRect(x, y, ww, wh);
        e.fillStyle = `rgba(255,${warm},130,${0.55 + Math.random() * 0.45})`;
        e.fillRect(x, y, ww, wh);
      } else {
        g.fillStyle = 'rgba(120,150,200,0.16)';
        g.fillRect(x, y, ww, wh);
      }
    }
  }
  return { map: toTexture(map), emissiveMap: toTexture(emissive) };
}

// ------------------------------------------------------------------ herbe --
export function grassTexture() {
  const s = 256;
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  // bandes de tonte : deux verts proches avec un dégradé doux par bande,
  // bien moins « aplats » que des rectangles pleins
  for (let i = 0; i < 8; i++) {
    const y = (s / 8) * i;
    const grad = g.createLinearGradient(0, y, 0, y + s / 8);
    if (i % 2) {
      grad.addColorStop(0, '#5cb92e');
      grad.addColorStop(1, '#52ad27');
    } else {
      grad.addColorStop(0, '#4da324');
      grad.addColorStop(1, '#469a20');
    }
    g.fillStyle = grad;
    g.fillRect(0, y, s, s / 8 + 1);
  }
  // brins et grain : petits traits orientés plutôt que des pixels carrés
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    g.strokeStyle = `rgba(${25 + Math.random() * 50},${105 + Math.random() * 85},25,${0.1 + Math.random() * 0.12})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() - 0.5) * 2, y - 2 - Math.random() * 2);
    g.stroke();
  }
  // quelques zones d'usure discrètes
  for (let i = 0; i < 5; i++) {
    g.fillStyle = 'rgba(150,130,60,0.05)';
    g.beginPath();
    g.ellipse(Math.random() * s, Math.random() * s, 14 + Math.random() * 18, 8 + Math.random() * 10, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const tex = toTexture(c, [2, 2]);
  return tex;
}

export function pitchTexture() {
  // mini-terrain du toit adverse, but en bas de l'image (côté tireurs)
  const w = 512, h = 384;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i % 2 ? '#55b02a' : '#4aa023';
    g.fillRect(0, (h / 10) * i, w, h / 10 + 1);
  }
  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.lineWidth = 6;
  const m = 26;
  g.strokeRect(m, m, w - m * 2, h - m * 2);
  // ligne médiane + rond central
  g.beginPath(); g.moveTo(m, h / 2); g.lineTo(w - m, h / 2); g.stroke();
  g.beginPath(); g.arc(w / 2, h / 2, 44, 0, Math.PI * 2); g.stroke();
  // surface de réparation côté but (bas)
  g.strokeRect(w / 2 - 110, h - m - 70, 220, 70);
  g.strokeRect(w / 2 - 55, h - m - 30, 110, 30);
  return toTexture(c);
}

// ------------------------------------------------------------------ filet --
export function netTexture() {
  const s = 128;
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  g.clearRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 2;
  const step = 16;
  g.beginPath();
  for (let i = 0; i <= s; i += step) {
    g.moveTo(i, 0); g.lineTo(i, s);
    g.moveTo(0, i); g.lineTo(s, i);
  }
  g.stroke();
  const tex = toTexture(c, [3, 2]);
  return tex;
}

// ----------------------------------------------------------------- ballon --
export function ballTexture() {
  const s = 256;
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  // cuir légèrement ombré, pas blanc plat
  const bg = g.createLinearGradient(0, 0, s, s);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, '#dfe3ea');
  g.fillStyle = bg;
  g.fillRect(0, 0, s, s);
  // pentagones réguliers en quinconce + coutures
  const pent = (x, y, r, rot) => {
    g.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = rot + (k / 5) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      k ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  };
  g.strokeStyle = 'rgba(90,98,116,0.5)';
  g.lineWidth = 2;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = col * 96 + (row % 2 ? 48 : 0) + 16;
      const y = row * 88 + 28;
      pent(x, y, 26, row * 0.5 + col * 0.3);
      g.fillStyle = '#232833';
      g.fill();
      // coutures rayonnantes vers les pentagones voisins
      for (let k = 0; k < 5; k++) {
        const a = row * 0.5 + col * 0.3 + (k / 5) * Math.PI * 2 + Math.PI / 5;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * 27, y + Math.sin(a) * 27);
        g.lineTo(x + Math.cos(a) * 44, y + Math.sin(a) * 44);
        g.stroke();
      }
    }
  }
  return toTexture(c);
}

// -------------------------------------------------------------------- ciel --
export function skyTexture() {
  const c = makeCanvas(2, 512);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#6ea8e8');
  grad.addColorStop(0.55, '#a9c8ea');
  grad.addColorStop(0.78, '#e3e2d8');
  grad.addColorStop(1, '#f0d9b8');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function cloudTexture() {
  const s = 256;
  const c = makeCanvas(s, s / 2);
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = s * 0.15 + Math.random() * s * 0.7;
    const y = s * 0.12 + Math.random() * s * 0.2;
    const r = 18 + Math.random() * 30;
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return toTexture(c);
}

// --------------------------------------------------- particules / numéros --
export function softDotTexture() {
  const s = 64;
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return toTexture(c);
}

export function faceTexture() {
  const s = 128;
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  g.clearRect(0, 0, s, s);
  // yeux : iris, pupille et reflet — le regard prend vie
  for (const side of [-1, 1]) {
    const x = s / 2 + side * 20;
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(x, 58, 11, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a6a3a';
    g.beginPath(); g.arc(x, 60, 6.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1d1712';
    g.beginPath(); g.arc(x, 60, 3.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath(); g.arc(x - 2.4, 56.5, 2, 0, Math.PI * 2); g.fill();
    // paupière supérieure légère
    g.strokeStyle = 'rgba(120,80,55,0.5)';
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x - 10, 50); g.quadraticCurveTo(x, 46, x + 10, 50); g.stroke();
    // sourcil
    g.strokeStyle = 'rgba(40,28,18,0.85)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x - 12, 40); g.quadraticCurveTo(x, 33, x + 12, 39);
    g.stroke();
  }
  // nez discret
  g.strokeStyle = 'rgba(150,95,65,0.55)';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(s / 2, 66); g.quadraticCurveTo(s / 2 + 3, 76, s / 2 - 1, 80); g.stroke();
  // sourire concentré + joues
  g.strokeStyle = 'rgba(120,60,50,0.9)';
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(s / 2 - 12, 90); g.quadraticCurveTo(s / 2, 99, s / 2 + 12, 90); g.stroke();
  g.fillStyle = 'rgba(230,120,90,0.18)';
  for (const side of [-1, 1]) {
    g.beginPath(); g.arc(s / 2 + side * 30, 80, 8, 0, Math.PI * 2); g.fill();
  }
  return toTexture(c);
}

export function concreteTexture() {
  const s = 256;
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  g.fillStyle = '#9a9da4'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `rgba(${60 + Math.random() * 60},${60 + Math.random() * 60},${70 + Math.random() * 60},0.12)`;
    g.fillRect(Math.random() * s, Math.random() * s, 3, 3);
  }
  // dalles
  g.strokeStyle = 'rgba(60,64,72,0.35)';
  g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo((s / 4) * i, 0); g.lineTo((s / 4) * i, s); g.stroke();
    g.beginPath(); g.moveTo(0, (s / 4) * i); g.lineTo(s, (s / 4) * i); g.stroke();
  }
  return toTexture(c);
}

export function helipadTexture() {
  const s = 256;
  const c = makeCanvas(s, s);
  const g = c.getContext('2d');
  g.fillStyle = '#3e434c'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.fillRect(Math.random() * s, Math.random() * s, 3, 3);
  }
  g.strokeStyle = '#e8c832';
  g.lineWidth = 8;
  g.beginPath(); g.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#f2f2f2';
  g.lineWidth = 14;
  g.beginPath();
  g.moveTo(s / 2 - 30, s / 2 - 38); g.lineTo(s / 2 - 30, s / 2 + 38);
  g.moveTo(s / 2 + 30, s / 2 - 38); g.lineTo(s / 2 + 30, s / 2 + 38);
  g.moveTo(s / 2 - 30, s / 2); g.lineTo(s / 2 + 30, s / 2);
  g.stroke();
  return toTexture(c);
}

export function numberTexture(num, color) {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.font = '900 86px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(String(num), 64, 70);
  return toTexture(c);
}
