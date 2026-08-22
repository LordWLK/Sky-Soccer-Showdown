// Records locaux et préférences, stockés sur l'appareil (localStorage).
const KEY = 'sss-records-v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function save(r) {
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* stockage indisponible */ }
}

export function loadPrefs() {
  const r = load();
  return {
    difficulty: r.difficulty === 'hard' ? 'hard' : 'normal',
    volume: typeof r.volume === 'number' ? Math.max(0, Math.min(1, r.volume)) : 0.9,
    haptics: r.haptics !== false,
    tutorialSeen: !!r.tutorialSeen,
  };
}

export function savePrefs(prefs) {
  const r = load();
  Object.assign(r, prefs);
  save(r);
}

// Duel solo : meilleur score de buts et bilan victoires/matchs
export function recordDuel(score, won) {
  const r = load();
  const prevBest = r.duelBest;
  r.duelBest = prevBest == null ? score : Math.max(prevBest, score);
  r.duelWins = (r.duelWins || 0) + (won ? 1 : 0);
  r.duelGames = (r.duelGames || 0) + 1;
  save(r);
  return {
    newBest: prevBest != null && score > prevBest,
    best: r.duelBest,
    wins: r.duelWins,
    games: r.duelGames,
  };
}

// Parcours : meilleur total de coups (le plus bas), par format.
// kind : 'p3' (3 trous), 'p9' (9 trous) ou 'daily' (Parcours du jour, comparé
// uniquement aux autres tentatives du même jour). `date` : AAAA-MM-JJ (UTC).
export function recordGolf(total, kind = 'p3', date = null) {
  const r = load();
  if (kind === 'daily') {
    const prev = r.golfDaily && r.golfDaily.date === date ? r.golfDaily.total : null;
    r.golfDaily = { date, total: prev == null ? total : Math.min(prev, total) };
    save(r);
    return { newBest: prev != null && total < prev, best: r.golfDaily.total };
  }
  const key = kind === 'p9' ? 'golfBest9' : 'golfBest3';
  // migration : l'ancien record unique (v1, parcours à 3 trous) devient golfBest3
  const prevBest = r[key] != null ? r[key] : (kind === 'p9' ? null : r.golfBest);
  r[key] = prevBest == null ? total : Math.min(prevBest, total);
  save(r);
  return { newBest: prevBest != null && total < prevBest, best: r[key] };
}

// Tournoi : nombre de trophées remportés
export function recordTournament(won) {
  const r = load();
  r.tournamentWins = (r.tournamentWins || 0) + (won ? 1 : 0);
  r.tournamentRuns = (r.tournamentRuns || 0) + 1;
  save(r);
  return { wins: r.tournamentWins, runs: r.tournamentRuns };
}
