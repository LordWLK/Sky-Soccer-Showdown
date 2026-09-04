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
    music: r.music !== false,
    lang: r.lang === 'en' ? 'en' : r.lang === 'fr' ? 'fr' : null, // null = auto
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

// ---- Parcours du jour : historique, séries et partage (dates UTC) --------

function prevDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// série en cours (aujourd'hui, ou hier si la partie du jour reste à jouer)
// et meilleure série de tout l'historique
function computeStreak(hist, today) {
  let start = today;
  if (!hist[start]) start = prevDate(start);
  let current = 0;
  let d = start;
  while (hist[d]) { current += 1; d = prevDate(d); }
  const days = Object.keys(hist).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of days) {
    run = prev !== null && prevDate(day) === prev ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  }
  return { current, best, played: days.length };
}

// meilleure partie du jour : total, par et écarts par trou (grille de partage)
export function recordDailyRun(date, total, par, holeDiffs, holeStrokes) {
  const r = load();
  r.dailyHist = r.dailyHist || {};
  const prev = r.dailyHist[date];
  if (!prev || total < prev.total) {
    r.dailyHist[date] = { total, par, d: holeDiffs, s: holeStrokes };
  }
  save(r);
  return computeStreak(r.dailyHist, date);
}

export function getDailyHist() {
  const r = load();
  return { ...(r.dailyHist || {}) };
}

export function getDailyStreak(today = new Date().toISOString().slice(0, 10)) {
  const r = load();
  return computeStreak(r.dailyHist || {}, today);
}

// ---- statistiques cumulées et succès -------------------------------------

export function bumpStats(delta) {
  const r = load();
  r.stats = r.stats || {};
  for (const [k, v] of Object.entries(delta)) r.stats[k] = (r.stats[k] || 0) + v;
  save(r);
}

export function getStats() {
  const r = load();
  return { ...(r.stats || {}) };
}

export function getAll() {
  return load();
}

// instantané servi aux tests de succès : stats + records de tous les modes
function achievementSnapshot(r) {
  const s = r.stats || {};
  return {
    ...s,
    duelWins: r.duelWins || 0,
    tournamentWins: r.tournamentWins || 0,
    challengeStars: Object.values(r.challenges || {}).reduce((a, x) => a + x, 0),
    dailyBestStreak: computeStreak(r.dailyHist || {}, new Date().toISOString().slice(0, 10)).best,
  };
}

export const ACHIEVEMENTS = [
  { id: 'but1', ico: '⚽', name: 'Premier but', desc: 'Marquer votre premier but', test: (s) => (s.goals || 0) >= 1 },
  { id: 'but50', ico: '🥅', name: 'Serial buteur', desc: 'Marquer 50 buts', test: (s) => (s.goals || 0) >= 50 },
  { id: 'luc1', ico: '🎯', name: 'Lucarne !', desc: 'Marquer en pleine lucarne', test: (s) => (s.lucarnes || 0) >= 1 },
  { id: 'luc10', ico: '💥', name: 'Artificier', desc: '10 lucarnes dorées', test: (s) => (s.lucarnes || 0) >= 10 },
  { id: 'win1', ico: '🏅', name: 'Première victoire', desc: 'Gagner un Duel', test: (s) => s.duelWins >= 1 },
  { id: 'perfect', ico: '🧱', name: 'Sans trembler', desc: 'Gagner un duel sans perdre une planche', test: (s) => (s.perfectWins || 0) >= 1 },
  { id: 'champ', ico: '🏆', name: 'Champion', desc: 'Remporter un Tournoi', test: (s) => s.tournamentWins >= 1 },
  { id: 'dyn', ico: '👑', name: 'Dynastie', desc: 'Remporter 3 Tournois', test: (s) => s.tournamentWins >= 3 },
  { id: 'birdie', ico: '🐦', name: 'Birdie', desc: 'Un trou sous le par', test: (s) => (s.birdies || 0) >= 1 },
  { id: 'eagle', ico: '🦅', name: 'Eagle', desc: 'Un trou en −2 ou mieux', test: (s) => (s.eagles || 0) >= 1 },
  { id: 'ace', ico: '🎳', name: 'Trou en un', desc: 'La cage en un seul coup', test: (s) => (s.holeInOne || 0) >= 1 },
  { id: 'under', ico: '⛳', name: 'Sous le par', desc: 'Boucler un parcours sous le par', test: (s) => (s.golfUnderPar || 0) >= 1 },
  { id: 'streak3', ico: '🔥', name: 'Trois d\'affilée', desc: 'Série de 3 Parcours du jour', test: (s) => s.dailyBestStreak >= 3 },
  { id: 'streak7', ico: '📅', name: 'Semaine parfaite', desc: 'Série de 7 Parcours du jour', test: (s) => s.dailyBestStreak >= 7 },
  { id: 'stars30', ico: '🌟', name: 'Étoile des Défis', desc: '30 étoiles aux Défis', test: (s) => s.challengeStars >= 30 },
  { id: 'trampo5', ico: '🤸', name: 'Acrobate', desc: '5 rebonds de bâche élastique', test: (s) => (s.trampos || 0) >= 5 },
];

// succès nouvellement débloqués depuis le dernier appel (à afficher en toast)
export function checkAchievements() {
  const r = load();
  const snap = achievementSnapshot(r);
  r.achUnlocked = r.achUnlocked || [];
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!r.achUnlocked.includes(a.id) && a.test(snap)) {
      r.achUnlocked.push(a.id);
      fresh.push(a);
    }
  }
  if (fresh.length) save(r);
  return fresh;
}

export function getAchievements() {
  const r = load();
  return new Set(r.achUnlocked || []);
}

// Défis : meilleures étoiles par niveau (0 à 3)
export function recordChallenge(idx, stars) {
  const r = load();
  r.challenges = r.challenges || {};
  const prev = r.challenges[idx] || 0;
  r.challenges[idx] = Math.max(prev, stars);
  save(r);
  const total = Object.values(r.challenges).reduce((a, s) => a + s, 0);
  return { improved: stars > prev, best: r.challenges[idx], total };
}

export function getChallenges() {
  const r = load();
  return r.challenges || {};
}

// Tournoi : nombre de trophées remportés
export function recordTournament(won) {
  const r = load();
  r.tournamentWins = (r.tournamentWins || 0) + (won ? 1 : 0);
  r.tournamentRuns = (r.tournamentRuns || 0) + 1;
  save(r);
  return { wins: r.tournamentWins, runs: r.tournamentRuns };
}

// Survie : la meilleure série de buts d'affilée
export function recordSurvival(streak) {
  const r = load();
  const prev = r.survivalBest || 0;
  r.survivalBest = Math.max(prev, streak);
  save(r);
  return { best: r.survivalBest, isNew: streak > prev && streak > 0 };
}
