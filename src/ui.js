// Interface DOM par-dessus le canvas : écrans, HUD, messages.
import { NATIONS } from './nations.js';
import { flagBadgeDataURL } from './assets.js';
import {
  recordDuel, recordGolf, recordTournament, recordChallenge, getChallenges,
  recordDailyRun, getDailyHist, getDailyStreak, getStats, getAll,
  checkAchievements, getAchievements, ACHIEVEMENTS, recordSurvival, bumpStats,
} from './records.js';
import { audio } from './audio.js';
import { CHALLENGES } from './challenges.js';
import { t, tHole } from './i18n.js';

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
    // data-i18n-src pré-seedé : la carte suit les changements de langue
    btn.innerHTML = `<img src="${flagBadgeDataURL(n.id)}" alt="">`
      + `<span data-i18n data-i18n-src="${n.name}">${t(n.name)}</span>`;
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
      $('#teams-label').textContent = t(two ? 'Équipe du joueur 1' : 'Choisissez votre équipe');
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
  $('#defis-close').addEventListener('click', () => {
    ui.hide('#defis-screen');
    onSelectSound?.();
  });
  // partage du score : partage natif si possible, sinon copie
  $('#share-btn').addEventListener('click', async () => {
    const text = ui.shareText || `⚽ Sky Soccer Showdown ${location.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        ui.flash(t('Score copié !'), 'small', 1.5);
      }
    } catch { /* partage annulé */ }
  });
  return { flags };
}

export const ui = {
  show(id) { $(id).classList.remove('hidden'); },
  hide(id) { $(id).classList.add('hidden'); },

  // le label des équipes dépend du mode : à resynchroniser après un
  // changement de langue (applyStatic le remettrait au libellé par défaut)
  syncTeamsLabel() {
    $('#teams-label').textContent = t(selectedMode === 'duel2'
      ? 'Équipe du joueur 1' : 'Choisissez votre équipe');
  },

  // reconstruit les badges du HUD pour le trio de la partie en cours ;
  // `me` : index du joueur (étiquette VOUS) ou {index: étiquette} à 2 joueurs
  buildChips(nations, me) {
    const meMap = typeof me === 'number' ? { [me]: t('VOUS') } : (me || {});
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

  // Survie : seul face à la cage — pas de puces d'équipes, la série au HUD
  startSurvival() {
    document.querySelector('#hud').classList.remove('golf');
    this.hide('#chips');
    this.hide('#strokes');
    this.hide('#club');
    this.hide('#title-screen');
    this.hide('#end-screen');
    this.show('#hud');
  },

  setSurvival(streak, shot) {
    $('#round').textContent = t('🔥 Série : {n}', { n: streak });
    if (shot) $('#round').textContent += ` · ${t('Tir {n}', { n: shot })}`;
  },

  // écran de fin de Survie : la série, le record local, le partage
  showSurvivalEnd(streak, nation, stats) {
    const { best, isNew } = recordSurvival(streak);
    bumpStats({ survivalRuns: 1 });
    audio[isNew && streak > 2 ? 'win' : 'lose']();
    $('#end-title').textContent = isNew
      ? t('🔥 RECORD ! Série de {n}', { n: streak })
      : t('💥 SÉRIE TERMINÉE — {n}', { n: streak });
    $('#end-title').className = isNew ? 'win' : 'lose';
    const rows = $('#end-rows');
    rows.innerHTML = '';
    const line1 = document.createElement('div');
    line1.className = 'end-note';
    line1.textContent = t('Meilleure série : {n} buts', { n: best });
    rows.appendChild(line1);
    if (stats && stats.shots > 0) {
      const line2 = document.createElement('div');
      line2.className = 'end-note';
      line2.textContent = t('🎯 Précision {p} % · {l} lucarnes · plus longue frappe {d} m', {
        p: Math.round((stats.goals / stats.shots) * 100), l: stats.lucarnes, d: stats.longest,
      });
      rows.appendChild(line2);
    }
    this.shareText = t('🔥 Sky Soccer Showdown — série de {n} buts d\'affilée en Survie avec {nat} ! {url}', {
      n: streak, nat: t(nation.name), url: location.href,
    });
    $('#replay-btn').textContent = t('↻ REJOUER');
    $('#menu-btn').classList.add('hidden');
    this.hide('#hud');
    this.toastAchievements();
    this.show('#end-screen');
  },

  // éclair d'écran très bref sur les buts du joueur (doré en lucarne)
  flashScreen(strong) {
    const el = $('#flash');
    el.classList.toggle('gold', !!strong);
    el.classList.remove('on');
    void el.offsetWidth; // relance l'animation CSS
    el.classList.add('on');
  },

  // transition iris : l'écran se referme en cercle, `mid` s'exécute au noir
  // (changement de scène), puis l'iris se rouvre — purement cosmétique, la
  // machine à états n'attend jamais après elle
  iris(mid) {
    const el = $('#iris');
    const hole = el.firstElementChild;
    el.style.display = 'block';
    el.style.pointerEvents = 'auto'; // gobe les taps pendant le noir
    hole.style.transition = 'none';
    hole.style.transform = 'translate(-50%, -50%) scale(1)';
    void hole.offsetWidth;
    hole.style.transition = 'transform 0.3s cubic-bezier(0.65, 0, 0.85, 0.4)';
    hole.style.transform = 'translate(-50%, -50%) scale(0)';
    setTimeout(() => {
      try { if (mid) mid(); } catch (e) { console.error(e); }
      el.style.pointerEvents = 'none';
      hole.style.transition = 'transform 0.44s cubic-bezier(0.16, 0.6, 0.35, 1)';
      hole.style.transform = 'translate(-50%, -50%) scale(1)';
      setTimeout(() => { el.style.display = 'none'; }, 500);
    }, 340);
  },

  // toasts des succès nouvellement débloqués (fin de partie)
  toastAchievements() {
    checkAchievements().forEach((a, i) => {
      setTimeout(() => this.flash(t('🏅 Succès débloqué : {n} {i}', { n: t(a.name), i: a.ico }), 'goal', 2.8), i * 900);
    });
  },

  // écran 🏅 : statistiques, calendrier du Parcours du jour, succès
  openStats() {
    const stats = getStats();
    const all = getAll();
    const streak = getDailyStreak();
    const rows = [
      ['⚽ Buts marqués', stats.goals || 0],
      ['🎯 Lucarnes', stats.lucarnes || 0],
      ['🏅 Duels gagnés', `${all.duelWins || 0} / ${all.duelGames || 0}`],
      ['🏆 Tournois gagnés', `${all.tournamentWins || 0} / ${all.tournamentRuns || 0}`],
      ['🐦 Birdies · 🦅 Eagles', `${stats.birdies || 0} · ${stats.eagles || 0}`],
      ['🎳 Trous en un', stats.holeInOne || 0],
      ['🌟 Étoiles des Défis', `${Object.values(getChallenges()).reduce((a, s) => a + s, 0)} / ${CHALLENGES.length * 3}`],
      ['🔥 Série du jour', `${streak.current} (record ${streak.best})`],
      ['⚡ Meilleure série en Survie', all.survivalBest || 0],
    ];
    $('#stats-rows').innerHTML = rows.map(([k, v]) =>
      `<div class="stat-row"><span>${t(k)}</span><b>${v}</b></div>`).join('');

    // calendrier des 5 dernières semaines : jours du Parcours du jour joués
    const hist = getDailyHist();
    const today = new Date();
    const cells = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
      const key = d.toISOString().slice(0, 10);
      const done = !!hist[key];
      const isToday = i === 0;
      cells.push(`<i class="${done ? 'done' : ''}${isToday ? ' today' : ''}" title="${key}">${d.getUTCDate()}</i>`);
    }
    $('#stats-cal').innerHTML = cells.join('');

    const unlocked = getAchievements();
    $('#ach-grid').innerHTML = ACHIEVEMENTS.map((a) => `
      <div class="ach${unlocked.has(a.id) ? '' : ' locked'}">
        <span class="ach-ico">${a.ico}</span>
        <div><b>${t(a.name)}</b><p>${t(a.desc)}</p></div>
      </div>`).join('');
    this.show('#stats-screen');
  },

  // grille de sélection des Défis, avec les étoiles déjà gagnées
  openDefis(onPick) {
    const stars = getChallenges();
    const total = Object.values(stars).reduce((a, s) => a + s, 0);
    $('#defis-total').textContent = `⭐ ${total} / ${CHALLENGES.length * 3}`;
    const grid = $('#defis-grid');
    grid.innerHTML = '';
    CHALLENGES.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'defi-cell' + (stars[i] ? ' done' : '');
      const got = stars[i] || 0;
      btn.innerHTML = `<b>${i + 1}</b><span>${'★'.repeat(got)}${'☆'.repeat(3 - got)}</span>`;
      btn.title = t(c.name);
      btn.addEventListener('click', () => {
        this.hide('#defis-screen');
        onPick(i);
      });
      grid.appendChild(btn);
    });
    this.show('#defis-screen');
  },

  startChallenge() {
    document.querySelector('#hud').classList.remove('golf');
    this.hide('#chips'); // un seul tireur : pas de badges d'équipes
    this.show('#strokes');
    this.hide('#club');
    this.hide('#title-screen');
    this.hide('#end-screen');
    this.show('#hud');
  },

  setChallengeHud(idx, spec, shot) {
    $('#round').textContent = t('🎯 Défi {n} — {name}', { n: idx + 1, name: t(spec.name) });
    $('#strokes').textContent = `${t(spec.lucarne ? 'Objectif : LUCARNE' : 'Objectif : marquer')} `
      + t('· Tir {n} / {max}', { n: shot, max: spec.shots });
  },

  showChallengeEnd(idx, spec, win, stars, hasNext) {
    const title = $('#end-title');
    title.textContent = t(win ? 'DÉFI RÉUSSI !' : 'DÉFI MANQUÉ…');
    title.className = win ? 'win' : 'lose';
    const rows = $('#end-rows');
    rows.innerHTML = '';
    const starRow = document.createElement('div');
    starRow.className = 'defi-stars';
    starRow.textContent = win ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆';
    rows.appendChild(starRow);
    const nameRow = document.createElement('div');
    nameRow.className = 'end-row';
    nameRow.innerHTML = `<span class="end-name">${t('🎯 Défi {n} — {name}', { n: idx + 1, name: t(spec.name) })}</span>`;
    rows.appendChild(nameRow);
    const line = document.createElement('div');
    line.className = 'end-record';
    if (win) {
      const rec = recordChallenge(idx, stars);
      line.textContent = (rec.improved ? t('⭐ RECORD DU DÉFI ! ') : '')
        + t('Étoiles totales : {n} / {max}', { n: rec.total, max: CHALLENGES.length * 3 });
      this.shareText = t('🎯 Sky Soccer Showdown — Défi « {name} » réussi {stars} ! {url}',
        { name: t(spec.name), stars: '⭐'.repeat(stars), url: location.href });
    } else {
      const total = Object.values(getChallenges()).reduce((a, s) => a + s, 0);
      line.textContent = t('Étoiles totales : {n} / {max}', { n: total, max: CHALLENGES.length * 3 });
      this.shareText = t('🎯 Sky Soccer Showdown — le défi « {name} » me résiste… {url}',
        { name: t(spec.name), url: location.href });
    }
    rows.appendChild(line);
    $('#replay-btn').textContent = t(win && hasNext ? '➜ DÉFI SUIVANT' : '↻ REJOUER');
    $('#menu-btn').classList.remove('hidden');
    this.hide('#hud');
    this.show('#end-screen');
    this.toastAchievements();
  },

  syncClub(club) {
    document.querySelectorAll('#club .clubb').forEach((el) => {
      el.classList.toggle('selected', el.dataset.club === club);
    });
  },

  setGolfHud(spec, holeCount, strokes, dist) {
    $('#round').textContent = `⛳ ${tHole(spec.name)} / ${holeCount} — Par ${spec.par}`;
    $('#strokes').textContent = t('Coups : {n} · but à {d} m', { n: strokes, d: Math.round(dist) });
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
      row.innerHTML = `<span class="end-name">⛳ ${tHole(h.name)} — Par ${h.par}</span>${cells(h.strokes)}`;
      box.appendChild(row);
    });

    // NB : ne pas nommer le paramètre « t » — il masquerait la fonction i18n
    const diffs = totals.map((total) => {
      const d = total - parTotal;
      return d > 0 ? `+${d}` : d === 0 ? t('par') : d;
    });
    const totalRow = document.createElement('div');
    totalRow.className = 'end-row golf-total';
    totalRow.innerHTML = `<span class="end-name">${t('Total — Par {n}', { n: parTotal })}</span>${cells(
      totals.map((total, i) => `${total}<em>${diffs[i]}</em>`),
    )}`;
    box.appendChild(totalRow);

    const kind = meta.kind || 'p3';
    const rec = recordGolf(totals[playerIdx], kind, meta.date, parTotal);
    const label = kind === 'daily' ? t('Parcours du jour ({d})', { d: meta.date })
      : t(kind === 'p9' ? 'Meilleur parcours 9 trous' : 'Meilleur parcours 3 trous');
    // hors « du jour », les parcours changent à chaque partie : le record est
    // l'écart au par, seul chiffre comparable entre deux tracés
    const scoreTxt = kind === 'daily' ? t('{n} coups (par {p})', { n: rec.best, p: parTotal })
      : rec.best === 0 ? t('au par')
        : rec.best < 0 ? t('{n} sous le par', { n: -rec.best })
          : t('{n} au-dessus du par', { n: rec.best });
    const line = document.createElement('div');
    line.className = 'end-record';
    line.textContent = `${rec.newBest ? t('⭐ NOUVEAU RECORD ! ') : ''}${label} : ${scoreTxt}`;
    box.appendChild(line);
    if (kind === 'daily') {
      // série façon casse-tête quotidien : jauge du retour de chaque jour
      const holeDiffs = holes.map((h) => h.strokes[playerIdx] - h.par);
      const holeStrokes = holes.map((h) => h.strokes[playerIdx]);
      const streak = recordDailyRun(meta.date, totals[playerIdx], parTotal, holeDiffs, holeStrokes);
      const sline = document.createElement('div');
      sline.className = 'end-record';
      sline.textContent = t('🔥 Série : {c} jour(s) · record {b} · {p} joué(s) en tout',
        { c: streak.current, b: streak.best, p: streak.played });
      box.appendChild(sline);
      // grille d'émojis à partager (un carré par trou)
      const sq = (d, s) => (s === 1 ? '🎯' : d <= -2 ? '🟪' : d === -1 ? '🟩'
        : d === 0 ? '🟨' : d === 1 ? '🟧' : '🟥');
      const grid = holes.map((h) => sq(h.strokes[playerIdx] - h.par, h.strokes[playerIdx])).join('');
      this.shareText = t('⛳ Sky Soccer Showdown — Parcours du jour {date}\n{grid} {n} coups ({d}) · Série {s} 🔥\nBattez-moi ! {url}',
        { date: meta.date, grid, n: totals[playerIdx], d: diffs[playerIdx], s: streak.current, url: location.href });
    } else {
      this.shareText = t('⛳ Sky Soccer Showdown — Parcours {h} trous bouclé en {n} coups ({d}) avec {nat} ! {url}', {
        h: holes.length, n: totals[playerIdx], d: diffs[playerIdx],
        nat: t(nations[playerIdx].name), url: location.href,
      });
    }
    this.toastAchievements();

    $('#replay-btn').textContent = t('↻ REJOUER');
    $('#menu-btn').classList.add('hidden');
    this.hide('#hud');
    this.show('#end-screen');
  },

  setRound(n, max, suddenDeath, prefix) {
    $('#round').textContent = (prefix ? `🏆 ${t(prefix)} · ` : '')
      + (suddenDeath ? t('⚡ Mort subite') : t('Manche {n} / {max}', { n, max }));
  },

  setWind(a) {
    const el = $('#wind');
    if (!a) {
      el.textContent = t('💨 vent nul');
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
      if (!el) return; // mode Défi : un seul tireur, pas de puces
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

  showEnd(title, cls, shooters, meMap = {}, result = null, stats = null) {
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
        <span class="end-name">${t(s.nation.name)}${meMap[i] || ''}</span>
        <span class="end-status">${s.alive ? '' : t('tombée au champ d\'honneur')}</span>
        <span class="end-score">${s.score}</span>`;
      rows.appendChild(row);
    });
    if (result && result.mode === 'duel') {
      const rec = recordDuel(result.playerScore, result.won);
      const plur = (n, w) => `${n} ${t(w)}${n > 1 ? 's' : ''}`;
      const line = document.createElement('div');
      line.className = 'end-record';
      line.textContent = (rec.newBest ? t('⭐ NOUVEAU RECORD ! ') : '')
        + t('Record : {b} · {v} en {m}', {
          b: plur(rec.best, 'but'), v: plur(rec.wins, 'victoire'), m: plur(rec.games, 'match'),
        });
      rows.appendChild(line);
      this.shareText = t('⚽ Sky Soccer Showdown — {r} : {n} avec {nat} ! {url}', {
        r: t(result.won ? 'Victoire' : 'Duel'), n: plur(result.playerScore, 'but'),
        nat: t(result.nation), url: location.href,
      });
    } else if (result && result.mode === 'tourney') {
      const line = document.createElement('div');
      line.className = 'end-record';
      if (result.next) {
        // tournoi encore en cours : pas de record, on annonce le match suivant
        line.textContent = t('Prochain match — {stage} : {a} et {b}',
          { stage: result.next.stage, a: result.next.foes[0], b: result.next.foes[1] });
        this.shareText = t('⚽ Sky Soccer Showdown — En route vers la {stage} du tournoi avec {nat} ! {url}',
          { stage: result.next.stage.toLowerCase(), nat: t(result.nation), url: location.href });
      } else {
        const rec = recordTournament(!!result.champion);
        line.textContent = t('🏆 Tournois remportés : {w} sur {r}', { w: rec.wins, r: rec.runs });
        this.shareText = result.champion
          ? t('🏆 Sky Soccer Showdown — Champion du tournoi avec {nat} ! {url}',
            { nat: t(result.nation), url: location.href })
          : t('⚽ Sky Soccer Showdown — Tournoi : élimination en {stage} avec {nat}. {url}', {
            stage: (result.eliminated || '').toLowerCase(), nat: t(result.nation), url: location.href,
          });
      }
      rows.appendChild(line);
    } else {
      this.shareText = t('⚽ Sky Soccer Showdown — {title} {url}', { title, url: location.href });
    }
    // stats du match : précision, lucarnes, plus longue frappe au but
    if (stats && stats.shots > 0) {
      const line = document.createElement('div');
      line.className = 'end-note';
      line.textContent = t('🎯 Précision {p} % · {l} lucarnes · plus longue frappe {d} m', {
        p: Math.round((stats.goals / stats.shots) * 100),
        l: stats.lucarnes,
        d: stats.longest,
      });
      rows.appendChild(line);
    }
    // au fil d'un tournoi, REJOUER devient CONTINUER (match suivant)
    $('#replay-btn').textContent = t(result && result.next ? '➜ CONTINUER' : '↻ REJOUER');
    $('#menu-btn').classList.add('hidden'); // réservé aux Défis
    this.hide('#hud');
    this.show('#end-screen');
    this.toastAchievements();
  },
};
