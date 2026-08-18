// Interface DOM par-dessus le canvas : écrans, HUD, messages.
import { NATIONS } from './nations.js';
import { flagBadgeDataURL } from './assets.js';

const $ = (sel) => document.querySelector(sel);

let selectedTeam = 0;
let selectedMode = 'duel';
let chipEls = [];

export function initUI({ onPlay, onReplay, onSelectSound }) {
  const flags = NATIONS.map((n) => flagBadgeDataURL(n.id));

  // --- écran titre : choix de la nation, du mode, puis JOUER
  const picker = $('#teams');
  NATIONS.forEach((n, i) => {
    const btn = document.createElement('button');
    btn.className = 'team' + (i === selectedTeam ? ' selected' : '');
    btn.innerHTML = `<img src="${flags[i]}" alt=""><span>${n.name}</span><em>n°${n.number}</em>`;
    btn.addEventListener('click', () => {
      selectedTeam = i;
      picker.querySelectorAll('.team').forEach((el, j) => el.classList.toggle('selected', j === i));
      onSelectSound?.();
    });
    picker.appendChild(btn);
  });
  document.querySelectorAll('#modes .mode').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedMode = btn.dataset.mode;
      document.querySelectorAll('#modes .mode').forEach((el) => el.classList.toggle('selected', el === btn));
      onSelectSound?.();
    });
  });
  $('#play-btn').addEventListener('click', () => onPlay(selectedTeam, selectedMode));
  $('#replay-btn').addEventListener('click', () => onReplay());

  // --- HUD : un badge par nation
  const chips = $('#chips');
  chipEls = NATIONS.map((n, i) => {
    const el = document.createElement('div');
    el.className = 'chip';
    el.innerHTML = `<img src="${flags[i]}" alt="${n.name}">
      <div class="chip-info"><span class="chip-score">0</span>
      <div class="pips"><i></i><i></i><i></i></div></div>`;
    chips.appendChild(el);
    return el;
  });
  return { flags };
}

export const ui = {
  show(id) { $(id).classList.remove('hidden'); },
  hide(id) { $(id).classList.add('hidden'); },

  startMatch(playerIdx) {
    chipEls.forEach((el, i) => {
      el.classList.toggle('me', i === playerIdx);
      el.classList.remove('dead');
    });
    this.show('#chips');
    this.hide('#strokes');
    this.hide('#title-screen');
    this.hide('#end-screen');
    this.show('#hud');
  },

  startGolf() {
    this.hide('#chips');
    this.show('#strokes');
    this.hide('#title-screen');
    this.hide('#end-screen');
    this.show('#hud');
  },

  setGolfHud(spec, holeCount, strokes, dist) {
    $('#round').textContent = `⛳ ${spec.name} / ${holeCount} — Par ${spec.par}`;
    $('#strokes').textContent = `Coups : ${strokes} · but à ${Math.round(dist)} m`;
  },

  showGolfEnd(rows, total, parTotal) {
    const diff = total - parTotal;
    const title = $('#end-title');
    if (diff < 0) { title.textContent = `🏆 ${diff} SOUS LE PAR !`; title.className = 'win'; }
    else if (diff === 0) { title.textContent = '🏆 DANS LE PAR !'; title.className = 'win'; }
    else { title.textContent = `PARCOURS TERMINÉ : +${diff}`; title.className = ''; }
    const box = $('#end-rows');
    box.innerHTML = '';
    rows.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'end-row';
      row.innerHTML = `<span class="end-name">⛳ ${r.name} — Par ${r.par}</span>
        <span class="end-status">${r.label}</span>
        <span class="end-score">${r.strokes}</span>`;
      box.appendChild(row);
    });
    const totalRow = document.createElement('div');
    totalRow.className = 'end-row me';
    totalRow.innerHTML = `<span class="end-name">Total — Par ${parTotal}</span>
      <span class="end-status">${diff > 0 ? `+${diff}` : diff === 0 ? 'par' : diff}</span>
      <span class="end-score">${total}</span>`;
    box.appendChild(totalRow);
    this.hide('#hud');
    this.show('#end-screen');
  },

  setRound(n, max, suddenDeath) {
    $('#round').textContent = suddenDeath ? '⚡ Mort subite' : `Manche ${n} / ${max}`;
  },

  setWind(a) {
    const el = $('#wind');
    if (!a) {
      el.textContent = '💨 vent nul';
      el.classList.remove('strong');
    } else {
      const arrows = (a > 0 ? '→' : '←').repeat(Math.min(3, Math.ceil(Math.abs(a) / 0.4)));
      el.textContent = `💨 ${Math.abs(a).toFixed(1)} ${arrows}`;
      el.classList.toggle('strong', Math.abs(a) > 0.7);
    }
  },

  updateChips(shooters) {
    shooters.forEach((s, i) => {
      const el = chipEls[i];
      el.querySelector('.chip-score').textContent = s.score;
      const pips = el.querySelectorAll('.pips i');
      pips.forEach((p, j) => p.classList.toggle('off', j >= s.lives));
      el.classList.toggle('dead', !s.alive);
    });
  },

  flash(text, cls = '', dur = 1.3) {
    const box = $('#msgs');
    const el = document.createElement('div');
    el.className = `msg ${cls}`;
    el.textContent = text;
    box.appendChild(el);
    setTimeout(() => el.classList.add('out'), Math.max(200, dur * 1000 - 350));
    setTimeout(() => el.remove(), dur * 1000);
  },

  hint(text) {
    const el = $('#hint');
    if (text) {
      el.textContent = text;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  },

  showEnd(title, cls, shooters, playerIdx) {
    $('#end-title').textContent = title;
    $('#end-title').className = cls;
    const rows = $('#end-rows');
    rows.innerHTML = '';
    const order = [...shooters.keys()].sort((a, b) => {
      if (shooters[a].alive !== shooters[b].alive) return shooters[a].alive ? -1 : 1;
      return shooters[b].score - shooters[a].score;
    });
    order.forEach((i) => {
      const s = shooters[i];
      const row = document.createElement('div');
      row.className = 'end-row' + (i === playerIdx ? ' me' : '') + (s.alive ? '' : ' dead');
      row.innerHTML = `<img src="${flagBadgeDataURL(s.nation.id)}" alt="">
        <span class="end-name">${s.nation.name}${i === playerIdx ? ' (vous)' : ''}</span>
        <span class="end-status">${s.alive ? '' : 'tombée au champ d’honneur'}</span>
        <span class="end-score">${s.score}</span>`;
      rows.appendChild(row);
    });
    this.hide('#hud');
    this.show('#end-screen');
  },
};
