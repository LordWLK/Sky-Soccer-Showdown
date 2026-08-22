// Interface DOM par-dessus le canvas : écrans, HUD, messages.
import { NATIONS } from './nations.js';
import { flagBadgeDataURL } from './assets.js';
import { recordDuel, recordGolf, recordTournament } from './records.js';

const $ = (sel) => document.querySelector(sel);

import { loadPrefs, savePrefs } from './records.js';

let selectedTeam = 0;
let selectedTeam2 = 1;
let selectedMode = 'duel';
let selectedDiff = 'normal';
let chipEls = [];

function buildTeamPicker(container, initial, onPick) {
  NATIONS.forEach((n, i) => {
    const btn = document.createElement('button');
    btn.className = 'team' + (i === initial ? ' selected' : '');
    btn.innerHTML = `<img src="${flagBadgeDataURL(n.id)}" alt=""><span>${n.name}</span>`;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.team').forEach((el, j) => el.classList.toggle('selected', j === i));
      onPick(i);
    });
    container.appendChild(btn);
  });
}

export function initUI({ onPlay, onReplay, onSelectSound, onClub }) {
  const flags = NATIONS.map((n) => flagBadgeDataURL(n.id));
  selectedDiff = loadPrefs().difficulty;

  // --- écran titre : nations (J1 et J2), mode, difficulté, puis JOUER
  buildTeamPicker($('#teams'), selectedTeam, (i) => {
    selectedTeam = i;
    onSelectSound?.();
  });
  buildTeamPicker($('#teams2'), selectedTeam2, (i) => {
    selectedTeam2 = i;
    onSelectSound?.();
  });
  document.querySelectorAll('#modes .mode').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedMode = btn.dataset.mode;
      document.querySelectorAll('#modes .mode').forEach((el) => el.classList.toggle('selected', el === btn));
      const two = selectedMode === 'duel2';
      $('#teams2').classList.toggle('hidden', !two);
      $('#teams2-label').classList.toggle('hidden', !two);
      $('#teams-label').textContent = two ? 'Équipe du joueur 1' : 'Choisissez votre équipe';
      // le Parcours du jour est le même pour tous : difficulté imposée
      $('#diffs').classList.toggle('hidden', selectedMode === 'daily');
      onSelectSound?.();
    });
  });
  document.querySelectorAll('#diffs .diffb').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.diff === selectedDiff);
    btn.addEventListener('click', () => {
      selectedDiff = btn.dataset.diff;
      savePrefs({ difficulty: selectedDiff });
      document.querySelectorAll('#diffs .diffb').forEach((el) => el.classList.toggle('selected', el === btn));
      onSelectSound?.();
    });
  });
  // choix du club pendant le Parcours
  document.querySelectorAll('#club .clubb').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#club .clubb').forEach((el) => el.classList.toggle('selected', el === btn));
      onClub?.(btn.dataset.club);
    });
  });
  $('#play-btn').addEventListener('click', () => onPlay(selectedTeam, selectedMode, selectedDiff, selectedTeam2));
  $('#replay-btn').addEventListener('click', () => onReplay());
  // partage du score : partage natif si possible, sinon copie
  $('#share-btn').addEventListener('click', async () => {
    const text = ui.shareText || `⚽ Sky Soccer Showdown ${location.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        ui.flash('Score copié !', 'small', 1.5);
      }
    } catch { /* partage annulé */ }
  });
  return { flags };
}

export const ui = {
  show(id) { $(id).classList.remove('hidden'); },
  hide(id) { $(id).classList.add('hidden'); },

  // reconstruit les badges du HUD pour le trio de la partie en cours ;
  // `me` : index du joueur (étiquette VOUS) ou {index: étiquette} à 2 joueurs
  buildChips(nations, me) {
    const meMap = typeof me === 'number' ? { [me]: 'VOUS' } : (me || {});
    const chips = $('#chips');
    chips.innerHTML = '';
    chipEls = nations.map((n, i) => {
      const el = document.createElement('div');
      el.className = 'chip' + (meMap[i] ? ' me' : '');
      el.dataset.label = meMap[i] || '';
      el.innerHTML = `<img src="${flagBadgeDataURL(n.id)}" alt="${n.name}">
        <div class="chip-info"><span class="chip-score">0</span>
        <div class="pips"><i></i><i></i><i></i></div></div>`;
      chips.appendChild(el);
      return el;
    });
  },

  startMatch() {
    chipEls.forEach((el) => el.classList.remove('dead'));
    document.querySelector('#hud').classList.remove('golf');
    this.show('#chips');
    this.hide('#strokes');
    this.hide('#club');
    this.hide('#title-screen');
    this.hide('#end-screen');
    this.show('#hud');
  },

  startGolf(playerIdx) {
    chipEls.forEach((el, i) => {
      el.classList.toggle('me', i === playerIdx);
      el.classList.remove('dead');
    });
    // au golf : pas de vies, la puce affiche le cumul de coups
    document.querySelector('#hud').classList.add('golf');
    this.show('#chips');
    this.show('#strokes');
    this.show('#club');
    this.hide('#title-screen');
    this.hide('#end-screen');
    this.show('#hud');
  },

  syncClub(club) {
    document.querySelectorAll('#club .clubb').forEach((el) => {
      el.classList.toggle('selected', el.dataset.club === club);
    });
  },

  setGolfHud(spec, holeCount, strokes, dist) {
    $('#round').textContent = `⛳ ${spec.name} / ${holeCount} — Par ${spec.par}`;
    $('#strokes').textContent = `Coups : ${strokes} · but à ${Math.round(dist)} m`;
  },

  // carte de score à trois colonnes : une par nation, joueur surligné
  showGolfEnd(holes, totals, parTotal, playerIdx, verdict, nations, meta = {}) {
    const title = $('#end-title');
    title.textContent = verdict.title;
    title.className = verdict.cls;
    const box = $('#end-rows');
    box.innerHTML = '';
    const cells = (vals, cls = '') => vals.map((v, i) =>
      `<span class="golf-cell${i === playerIdx ? ' me-cell' : ''} ${cls}">${v}</span>`).join('');

    const head = document.createElement('div');
    head.className = 'end-row golf-head';
    head.innerHTML = `<span class="end-name"></span>${cells(nations.map(
      (n) => `<img src="${flagBadgeDataURL(n.id)}" alt="${n.name}">`,
    ))}`;
    box.appendChild(head);

    holes.forEach((h) => {
      const row = document.createElement('div');
      row.className = 'end-row';
      row.innerHTML = `<span class="end-name">⛳ ${h.name} — Par ${h.par}</span>${cells(h.strokes)}`;
      box.appendChild(row);
    });

    const diffs = totals.map((t) => {
      const d = t - parTotal;
      return d > 0 ? `+${d}` : d === 0 ? 'par' : d;
    });
    const totalRow = document.createElement('div');
    totalRow.className = 'end-row golf-total';
    totalRow.innerHTML = `<span class="end-name">Total — Par ${parTotal}</span>${cells(
      totals.map((t, i) => `${t}<em>${diffs[i]}</em>`),
    )}`;
    box.appendChild(totalRow);

    const kind = meta.kind || 'p3';
    const rec = recordGolf(totals[playerIdx], kind, meta.date, parTotal);
    const label = kind === 'daily' ? `Parcours du jour (${meta.date})`
      : kind === 'p9' ? 'Meilleur parcours 9 trous' : 'Meilleur parcours 3 trous';
    // hors « du jour », les parcours changent à chaque partie : le record est
    // l'écart au par, seul chiffre comparable entre deux tracés
    const scoreTxt = kind === 'daily' ? `${rec.best} coups (par ${parTotal})`
      : rec.best === 0 ? 'au par'
        : rec.best < 0 ? `${-rec.best} sous le par`
          : `${rec.best} au-dessus du par`;
    const line = document.createElement('div');
    line.className = 'end-record';
    line.textContent = `${rec.newBest ? '⭐ NOUVEAU RECORD ! ' : ''}${label} : ${scoreTxt}`;
    box.appendChild(line);
    this.shareText = kind === 'daily'
      ? `⛳ Sky Soccer Showdown — Parcours du jour ${meta.date} bouclé en `
        + `${totals[playerIdx]} coups (${diffs[playerIdx]}) avec ${nations[playerIdx].name}. `
        + `Battez-moi ! ${location.href}`
      : `⛳ Sky Soccer Showdown — Parcours ${holes.length} trous bouclé en ${totals[playerIdx]} coups`
        + ` (${diffs[playerIdx]}) avec ${nations[playerIdx].name} ! ${location.href}`;

    $('#replay-btn').innerHTML = '↻&nbsp;&nbsp;REJOUER';
    this.hide('#hud');
    this.show('#end-screen');
  },

  setRound(n, max, suddenDeath, prefix) {
    $('#round').textContent = (prefix ? `🏆 ${prefix} · ` : '')
      + (suddenDeath ? '⚡ Mort subite' : `Manche ${n} / ${max}`);
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

  // jauge de puissance latérale ; le repère ⚽ marque la puissance du but
  setGauge(show, frac, goalFrac) {
    const el = $('#gauge');
    if (!show) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    $('#gauge-fill').style.height = `${Math.round(Math.min(1, frac) * 100)}%`;
    const tick = $('#gauge-goal');
    if (goalFrac == null) {
      tick.style.display = 'none';
    } else {
      tick.style.display = 'block';
      tick.style.bottom = `${Math.round(Math.min(1, goalFrac) * 100)}%`;
    }
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

  showEnd(title, cls, shooters, meMap = {}, result = null) {
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
      row.className = 'end-row' + (meMap[i] ? ' me' : '') + (s.alive ? '' : ' dead');
      row.innerHTML = `<img src="${flagBadgeDataURL(s.nation.id)}" alt="">
        <span class="end-name">${s.nation.name}${meMap[i] || ''}</span>
        <span class="end-status">${s.alive ? '' : 'tombée au champ d’honneur'}</span>
        <span class="end-score">${s.score}</span>`;
      rows.appendChild(row);
    });
    if (result && result.mode === 'duel') {
      const rec = recordDuel(result.playerScore, result.won);
      const line = document.createElement('div');
      line.className = 'end-record';
      line.textContent = `${rec.newBest ? '⭐ NOUVEAU RECORD ! ' : ''}Record : ${rec.best} buts`
        + ` · ${rec.wins} victoire${rec.wins > 1 ? 's' : ''} en ${rec.games} match${rec.games > 1 ? 's' : ''}`;
      rows.appendChild(line);
      this.shareText = `⚽ Sky Soccer Showdown — ${result.won ? 'Victoire' : 'Duel'} :`
        + ` ${result.playerScore} but${result.playerScore > 1 ? 's' : ''} avec ${result.nation} !`
        + ` ${location.href}`;
    } else if (result && result.mode === 'tourney') {
      const line = document.createElement('div');
      line.className = 'end-record';
      if (result.next) {
        // tournoi encore en cours : pas de record, on annonce le match suivant
        line.textContent = `Prochain match — ${result.next.stage} : ${result.next.foes[0]} et ${result.next.foes[1]}`;
        this.shareText = `⚽ Sky Soccer Showdown — En route vers la ${result.next.stage.toLowerCase()}`
          + ` du tournoi avec ${result.nation} ! ${location.href}`;
      } else {
        const rec = recordTournament(!!result.champion);
        line.textContent = `🏆 Tournois remportés : ${rec.wins} sur ${rec.runs}`;
        this.shareText = result.champion
          ? `🏆 Sky Soccer Showdown — Champion du tournoi avec ${result.nation} ! ${location.href}`
          : `⚽ Sky Soccer Showdown — Tournoi : ${result.eliminated ? `élimination en ${result.eliminated.toLowerCase()}` : 'éliminé'}`
            + ` avec ${result.nation}. ${location.href}`;
      }
      rows.appendChild(line);
    } else {
      this.shareText = `⚽ Sky Soccer Showdown — ${title} ${location.href}`;
    }
    // au fil d'un tournoi, REJOUER devient CONTINUER (match suivant)
    $('#replay-btn').innerHTML = result && result.next
      ? '➜&nbsp;&nbsp;CONTINUER' : '↻&nbsp;&nbsp;REJOUER';
    this.hide('#hud');
    this.show('#end-screen');
  },
};
