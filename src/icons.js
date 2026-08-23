// Icônes SVG dessinées maison — mêmes formes sur tous les appareils, dans la
// palette du jeu (nuit, or, néon) au lieu des emojis système.
// Usage : les éléments portant data-icon="nom" reçoivent leur SVG au
// démarrage via decorateIcons().

const P = {
  night: '#1d2946',
  night2: '#2b3a66',
  blue: '#3e7bff',
  gold: '#ffd75e',
  goldDark: '#e0a72e',
  white: '#ffffff',
  green: '#3fae52',
  greenDark: '#2c8a3e',
  red: '#e34d4d',
  cyan: '#59f2ff',
  pink: '#ff6ad5',
};

// ballon stylisé réutilisé partout (cercle + pentagone + patchs)
const ball = (cx, cy, r) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${P.white}" stroke="${P.night}" stroke-width="${r * 0.14}"/>
  <polygon points="${pent(cx, cy, r * 0.42)}" fill="${P.night}"/>
  ${[0, 1, 2, 3, 4].map((k) => {
    const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
    const x = cx + Math.cos(a) * r * 0.82;
    const y = cy + Math.sin(a) * r * 0.82;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.17).toFixed(1)}" fill="${P.night}"/>`;
  }).join('')}`;

function pent(cx, cy, r) {
  const pts = [];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

// trajectoire pointillée en arc de la comète
const arc = (d, color, w = 3) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="1 5"/>`;

const flag = (x, y, h = 11) => `
  <line x1="${x}" y1="${y}" x2="${x}" y2="${y - h}" stroke="${P.white}" stroke-width="2" stroke-linecap="round"/>
  <path d="M ${x} ${y - h} L ${x + 8} ${y - h + 2.6} L ${x} ${y - h + 5.2} Z" fill="${P.red}"/>`;

const roof = (x, y, w, h, top = P.green) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.4" fill="${P.night2}"/>
  <rect x="${x}" y="${y}" width="${w}" height="3.4" rx="1.4" fill="${top}"/>
  <g fill="${P.gold}" opacity="0.85">
    <rect x="${x + w * 0.18}" y="${y + h * 0.42}" width="2.4" height="2.4" rx="0.5"/>
    <rect x="${x + w * 0.58}" y="${y + h * 0.62}" width="2.4" height="2.4" rx="0.5"/>
  </g>`;

const svg = (inner) =>
  `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  // ⚔️ Duel : deux comètes croisées vers la même cage
  duel: svg(`
    <rect x="14" y="6" width="20" height="12" fill="none" stroke="${P.white}" stroke-width="2.6"/>
    <line x1="14" y1="18" x2="34" y2="18" stroke="${P.white}" stroke-width="1.4" opacity="0.5"/>
    ${arc('M 8 42 Q 14 18 22 13', P.gold)}
    ${arc('M 40 42 Q 34 18 26 13', P.cyan)}
    ${ball(10, 40, 5)}
    ${ball(38, 40, 5)}`),

  // 👥 Duel à 2 : deux maillots côte à côte, un ballon partagé
  duel2: svg(`
    <g>
      <circle cx="15" cy="14" r="6.5" fill="#f0b98c"/>
      <path d="M 15 7 a 6.8 6.8 0 0 1 6.6 5 q -6.6 -3.4 -13.2 0 a 6.8 6.8 0 0 1 6.6 -5" fill="#5a3d26"/>
      <path d="M 4 34 q 0 -11 11 -11 q 11 0 11 11 l 0 3 l -22 0 Z" fill="${P.gold}"/>
      <path d="M 10 24.5 l 3 3.4 l -3.4 2.4 Z M 20 24.5 l -3 3.4 l 3.4 2.4 Z" fill="${P.goldDark}"/>
    </g>
    <g>
      <circle cx="33" cy="14" r="6.5" fill="#d99c66"/>
      <path d="M 33 6.6 q 7.5 0 7 7.4 q -1.8 -3.4 -3.4 -3.8 q 1 2 0.6 3.4 q -5.4 -5 -10.6 -1.4 q 0.4 -4.6 6.4 -5.6" fill="#221a12"/>
      <path d="M 22 34 q 0 -11 11 -11 q 11 0 11 11 l 0 3 l -22 0 Z" fill="${P.cyan}"/>
      <path d="M 28 24.5 l 3 3.4 l -3.4 2.4 Z M 38 24.5 l -3 3.4 l 3.4 2.4 Z" fill="#2ba8b5"/>
    </g>
    ${ball(24, 41, 5.2)}`),

  // 🏆 Tournoi : trophée or, ballon en vasque
  tourney: svg(`
    <path d="M 12 8 h 24 v 8 q 0 12 -12 14 q -12 -2 -12 -14 Z" fill="${P.gold}" stroke="${P.goldDark}" stroke-width="1.6"/>
    <path d="M 12 10 h -6 q -1 9 8 11" fill="none" stroke="${P.goldDark}" stroke-width="2.6"/>
    <path d="M 36 10 h 6 q 1 9 -8 11" fill="none" stroke="${P.goldDark}" stroke-width="2.6"/>
    <rect x="21.4" y="29.6" width="5.2" height="5.6" fill="${P.goldDark}"/>
    <path d="M 15 38 h 18 l 2 5 h -22 Z" fill="${P.night2}"/>
    <rect x="13" y="43" width="22" height="2.6" rx="1.3" fill="${P.night}"/>
    ${ball(24, 15.6, 5)}
    <path d="M 33.4 6 l 1 2.2 l 2.4 0.3 l -1.8 1.7 l 0.5 2.4 l -2.1 -1.2 l -2.1 1.2 l 0.5 -2.4 l -1.8 -1.7 l 2.4 -0.3 Z" fill="${P.white}" opacity="0.9"/>`),

  // ⛳ Parcours 3 trous : d'un toit à l'autre au-dessus du vide
  golf: svg(`
    ${roof(3, 26, 16, 18)}
    ${roof(29, 20, 16, 24)}
    ${arc('M 9 24 Q 24 4 37 17', P.gold)}
    ${flag(37, 19)}
    ${ball(9, 22.6, 4.2)}`),

  // 🏙️ Parcours 9 trous : la grande traversée de la ville
  golf9: svg(`
    ${roof(1, 30, 11, 14, P.green)}
    ${roof(14, 34, 10, 10, '#8d939e')}
    ${roof(26, 27, 10, 17, '#8d939e')}
    ${roof(38, 22, 9, 22, P.green)}
    ${arc('M 6 27.5 Q 13 16 19 22.5 Q 22 25.5 25 22 Q 31 14 41 18.5', P.gold, 2.4)}
    ${flag(42, 21, 9)}
    ${ball(6, 26, 3.6)}`),

  // 📅 Parcours du jour : le ballon est la date du calendrier
  daily: svg(`
    <rect x="7" y="10" width="34" height="32" rx="4" fill="${P.night2}" stroke="${P.white}" stroke-width="2"/>
    <path d="M 7 14 a 4 4 0 0 1 4 -4 h 26 a 4 4 0 0 1 4 4 v 6 h -34 Z" fill="${P.red}"/>
    <line x1="15" y1="6" x2="15" y2="13" stroke="${P.white}" stroke-width="2.6" stroke-linecap="round"/>
    <line x1="33" y1="6" x2="33" y2="13" stroke="${P.white}" stroke-width="2.6" stroke-linecap="round"/>
    <g fill="${P.white}" opacity="0.35">
      <rect x="12" y="24" width="5" height="4" rx="1"/><rect x="21.5" y="24" width="5" height="4" rx="1"/>
      <rect x="31" y="24" width="5" height="4" rx="1"/><rect x="12" y="31" width="5" height="4" rx="1"/>
      <rect x="31" y="31" width="5" height="4" rx="1"/>
    </g>
    ${ball(24, 33, 5.4)}
    <path d="M 24 25.4 v -2 M 30 27 l 1.4 -1.4 M 18 27 l -1.4 -1.4" stroke="${P.gold}" stroke-width="2" stroke-linecap="round"/>`),

  // 🎯 Défis : la cible, un ballon en plein centre
  defis: svg(`
    <circle cx="24" cy="26" r="18" fill="${P.red}"/>
    <circle cx="24" cy="26" r="13.5" fill="${P.white}"/>
    <circle cx="24" cy="26" r="9" fill="${P.red}"/>
    ${ball(24, 26, 5)}
    <path d="M 37 5 l 1.4 3.2 l 3.4 0.4 l -2.5 2.4 l 0.7 3.4 l -3 -1.7 l -3 1.7 l 0.7 -3.4 l -2.5 -2.4 l 3.4 -0.4 Z" fill="${P.gold}"/>`),

  // ⚙️ réglages : engrenage
  settings: svg(`
    <path d="M 24 6 l 2.6 4.6 a 14 14 0 0 1 4.6 1.9 l 5 -1.6 l 3.4 5.8 l -3.7 3.8 a 14 14 0 0 1 0 5 l 3.7 3.8 l -3.4 5.8 l -5 -1.6 a 14 14 0 0 1 -4.6 1.9 l -2.6 4.6 l -6.7 0 l -1.3 -5.2 a 14 14 0 0 1 -4.3 -2.5 l -5.2 1.2 l -3.4 -5.8 l 4 -3.5 a 14 14 0 0 1 0 -4.6 l -4 -3.5 l 3.4 -5.8 l 5.2 1.2 a 14 14 0 0 1 4.3 -2.5 l 1.3 -5.2 Z"
      fill="${P.white}" opacity="0.92" transform="translate(2.6 1.4) scale(0.9)"/>
    <circle cx="24" cy="24.6" r="6.4" fill="${P.night}"/>`),

  // 🏅 palmarès : médaille d'or au ruban
  medal: svg(`
    <path d="M 17 4 h 6 l 4 12 l -8 3 Z" fill="${P.red}"/>
    <path d="M 31 4 h -6 l -4 12 l 8 3 Z" fill="${P.blue}"/>
    <circle cx="24" cy="29" r="13" fill="${P.gold}" stroke="${P.goldDark}" stroke-width="2.2"/>
    <circle cx="24" cy="29" r="9" fill="none" stroke="${P.goldDark}" stroke-width="1.4" opacity="0.7"/>
    <path d="M 24 22.4 l 2 4.2 l 4.6 0.6 l -3.4 3.2 l 0.9 4.6 l -4.1 -2.3 l -4.1 2.3 l 0.9 -4.6 l -3.4 -3.2 l 4.6 -0.6 Z" fill="${P.white}"/>`),

  // ⏸ pause
  pause: svg(`
    <rect x="13" y="10" width="8" height="28" rx="3.4" fill="${P.white}"/>
    <rect x="27" y="10" width="8" height="28" rx="3.4" fill="${P.white}"/>`),

  // 🎯 frappe tendue : trajectoire rasante
  tendu: svg(`
    ${arc('M 6 38 Q 24 24 40 26', P.gold, 3)}
    <path d="M 44 25.4 l -6.5 -2.2 l 1 4.8 Z" fill="${P.gold}"/>
    ${ball(8, 38, 5.4)}`),

  // 🌙 cloche : trajectoire haute
  cloche: svg(`
    ${arc('M 8 42 Q 24 -4 40 32', P.cyan, 3)}
    <path d="M 41.8 36.6 l -0.6 -6.8 l -4.2 2.6 Z" fill="${P.cyan}"/>
    ${ball(9, 40, 5.4)}`),

  // 🔥 difficile : flamme
  fire: svg(`
    <path d="M 24 4 q 2 8 8 12 q 7 5 7 14 a 15 14 0 0 1 -30 0 q 0 -8 5.5 -12.5 q -0.5 4.5 2.5 6.5 q -1 -11 7 -20" fill="${P.red}"/>
    <path d="M 24 20 q 1.4 4.4 4.6 7 q 3.6 2.8 3.6 7.3 a 8.2 8 0 0 1 -16.4 0 q 0 -4 2.6 -6.4 q 0.4 2.4 2.2 3.4 q -0.6 -6 3.4 -11.3" fill="${P.gold}"/>`),

  // ⚽ ballon seul (JOUER, C'EST PARTI)
  ball: svg(ball(24, 24, 19)),

  // 📤 partager
  share: svg(`
    <path d="M 10 24 v 14 a 4 4 0 0 0 4 4 h 20 a 4 4 0 0 0 4 -4 v -14" fill="none" stroke="${P.white}" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="24" y1="30" x2="24" y2="8" stroke="${P.white}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M 24 5 l 8 9 h -16 Z" fill="${P.white}"/>`),

  // 🏠 menu : l'immeuble au toit-pelouse et sa cage
  home: svg(`
    <rect x="12" y="14" width="24" height="30" rx="2" fill="${P.night2}"/>
    <rect x="12" y="14" width="24" height="4.4" rx="2" fill="${P.green}"/>
    <rect x="20.6" y="7" width="6.8" height="4.6" fill="none" stroke="${P.white}" stroke-width="1.8"/>
    <g fill="${P.gold}" opacity="0.85">
      <rect x="16" y="23" width="3.4" height="3.4" rx="0.6"/><rect x="28.6" y="23" width="3.4" height="3.4" rx="0.6"/>
      <rect x="16" y="31" width="3.4" height="3.4" rx="0.6"/><rect x="22.3" y="27" width="3.4" height="3.4" rx="0.6"/>
      <rect x="28.6" y="35" width="3.4" height="3.4" rx="0.6"/>
    </g>`),
};

// applique les icônes à tous les éléments marqués data-icon="nom"
export function decorateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.dataset.icon;
    if (!ICONS[name] || el.querySelector('.micon')) return;
    const span = document.createElement('span');
    span.className = 'micon';
    span.innerHTML = ICONS[name];
    el.prepend(span);
  });
}
