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
  return { difficulty: r.difficulty === 'hard' ? 'hard' : 'normal' };
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

// Parcours : meilleur total de coups (le plus bas)
export function recordGolf(total) {
  const r = load();
  const prevBest = r.golfBest;
  r.golfBest = prevBest == null ? total : Math.min(prevBest, total);
  save(r);
  return { newBest: prevBest != null && total < prevBest, best: r.golfBest };
}
