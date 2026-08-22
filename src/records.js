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

// Parcours : meilleur résultat par format.
// kind 'daily' (Parcours du jour) : total de coups brut, comparé uniquement
// aux tentatives du même jour — tout le monde joue le même tracé.
// kind 'p3'/'p9' : les parcours sont générés et leur par varie d'une partie
// à l'autre — on compare donc l'ÉCART AU PAR (moins = mieux), seul chiffre
// comparable entre deux tracés différents. `date` : AAAA-MM-JJ (UTC).
export function recordGolf(total, kind = 'p3', date = null, parTotal = 0) {
  const r = load();
  if (kind === 'daily') {
    const prev = r.golfDaily && r.golfDaily.date === date ? r.golfDaily.total : null;
    r.golfDaily = { date, total: prev == null ? total : Math.min(prev, total) };
    save(r);
    return { newBest: prev != null && total < prev, best: r.golfDaily.total };
  }
  const key = kind === 'p9' ? 'golfDiff9' : 'golfDiff3';
  const diff = total - parTotal;
  let prev = r[key];
  // migration : l'ancien record v1 (parcours fixe de par 12) devient un écart
  if (prev == null && kind === 'p3' && typeof r.golfBest === 'number') {
    prev = r.golfBest - 12;
  }
  r[key] = prev == null ? diff : Math.min(prev, diff);
  save(r);
  return { newBest: prev != null && diff < prev, best: r[key] };
}

// Tournoi : nombre de trophées remportés
export function recordTournament(won) {
  const r = load();
  r.tournamentWins = (r.tournamentWins || 0) + (won ? 1 : 0);
  r.tournamentRuns = (r.tournamentRuns || 0) + 1;
  save(r);
  return { wins: r.tournamentWins, runs: r.tournamentRuns };
}
