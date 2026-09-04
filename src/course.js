// Générateur procédural de parcours — module sans dépendance, entièrement
// déterministe à partir d'une graine : c'est ce qui permet le « Parcours du
// jour », identique pour tous les joueurs.
// Contraintes de jouabilité : sauts de 31 à 45 m (portée max ~60 m), montées
// plafonnées (la cloche existe pour ça), toits jamais plus petits que 4,6 m
// de demi-largeur (atterrissage amorti tenable), dérive latérale bornée pour
// rester dans le couloir de la ville.

export function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// graine du jour en UTC : identique pour tous les joueurs du monde
export function dateSeed(d = new Date()) {
  return ((d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate())
    * 2654435761) >>> 0;
}

// météo du parcours, seedée à part (le tirage des trous reste identique) :
// même ciel pour tout le monde au Parcours du jour — ambiance pure, aucun
// effet sur la physique
export function weatherForSeed(seed) {
  const r = mulberry32((seed ^ 0x9e3779b9) >>> 0)();
  return r < 0.58 ? 'clear' : r < 0.78 ? 'rain' : r < 0.9 ? 'snow' : 'mist';
}

export function generateCourse(seed, holeCount) {
  const rng = mulberry32(seed >>> 0);
  const holes = [];
  for (let i = 0; i < holeCount; i++) {
    const t = holeCount === 1 ? 1 : i / (holeCount - 1); // 0 → 1 : difficulté
    const roll = rng();
    const par = roll < 0.45 - t * 0.3 ? 3 : roll < 0.85 - t * 0.25 ? 4 : 5;
    holes.push(generateHole(rng, t, par, i));
  }
  return holes;
}

function generateHole(rng, difficulty, par, index) {
  const hops = par - 2; // plateformes intermédiaires (le tir au but conclut)
  const platforms = [];
  const obstacles = []; // câbles et drones, seedés : l'équité du jour en dépend
  const lifts = [];     // colonnes d'air ascendant dans les grands vides
  const sizeBase = 7 - difficulty * 2.2; // demi-largeur 7 → 4,8
  let x = 0;
  let z = 8; // centre du toit de départ
  let y = 0;
  let dir = rng() < 0.5 ? 1 : -1;
  // un vide entre deux toits peut recevoir UN obstacle ou UNE colonne d'air
  const dressGap = (fromX, fromZ, fromY, toX, toZ, toY, gap) => {
    const mx = (fromX + toX) / 2;
    const mz = (fromZ + toZ) / 2;
    const top = Math.max(fromY, toY);
    if (difficulty > 0.35 && rng() < 0.3) {
      obstacles.push({
        type: 'cable', x: mx, z: mz,
        y: top + 4 + rng() * 3,
        halfLen: 9 + rng() * 4,
      });
    } else if (difficulty > 0.6 && rng() < 0.25) {
      obstacles.push({
        type: 'drone', x: mx, z: mz,
        y: top + 2.5 + rng() * 3.5,
        range: 4.5 + rng() * 4, speed: 0.5 + rng() * 0.7, phase: rng() * 6.28,
      });
    } else if (gap > 39 && rng() < 0.4) {
      lifts.push({ x: mx, z: mz, r: 3.4, topY: top + 6 });
    }
  };
  for (let k = 0; k < hops; k++) {
    const gap = 31 + rng() * 10 + difficulty * 4;
    const from = { x, z, y };
    x = clamp(x + dir * (4 + rng() * 9), -21, 21);
    z -= gap;
    y = clamp(y + (-4 + rng() * 7.5), -8, 4); // montée max +3,5 par saut
    if (rng() < 0.7) dir = -dir; // doglegs le plus souvent alternés
    const hw = sizeBase + rng() * 1.4;
    // toits spéciaux : la bâche relance le ballon, l'héliport rembourse
    // un coup si l'on pose au centre du H
    const dr = rng();
    const deco = difficulty > 0.25 && dr < 0.22 ? 'trampo'
      : dr < 0.55 ? 'helipad' : 'concrete';
    platforms.push({ x, z, topY: y, hw, hd: hw, deco });
    dressGap(from.x, from.z, from.y, x, z, y, gap);
  }
  const gGap = 31 + rng() * 8;
  const goal = {
    x: clamp(x + dir * (3 + rng() * 8), -19, 19),
    z: z - gGap,
    topY: clamp(y - 1 - rng() * 3, -9, 2),
    hw: 7.5 + rng() * 1,
    hd: 9,
  };
  dressGap(x, z, y, goal.x, goal.z, goal.topY, gGap);
  // vent seedé avec le trou : l'équité du Parcours du jour en dépend
  const level = 0.45 + difficulty * 0.7;
  const wind = rng() < 0.25 ? 0
    : Math.round(level * (0.3 + rng() * 0.7) * (rng() < 0.5 ? -1 : 1) * 10) / 10;
  return { name: `Trou ${index + 1}`, par, platforms, goal, wind, obstacles, lifts };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
