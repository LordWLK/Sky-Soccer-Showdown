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
  const sizeBase = 7 - difficulty * 2.2; // demi-largeur 7 → 4,8
  let x = 0;
  let z = 8; // centre du toit de départ
  let y = 0;
  let dir = rng() < 0.5 ? 1 : -1;
  for (let k = 0; k < hops; k++) {
    const gap = 31 + rng() * 10 + difficulty * 4;
    x = clamp(x + dir * (4 + rng() * 9), -21, 21);
    z -= gap;
    y = clamp(y + (-4 + rng() * 7.5), -8, 4); // montée max +3,5 par saut
    if (rng() < 0.7) dir = -dir; // doglegs le plus souvent alternés
    const hw = sizeBase + rng() * 1.4;
    platforms.push({
      x, z, topY: y, hw, hd: hw,
      deco: rng() < 0.4 ? 'helipad' : 'concrete',
    });
  }
  const gGap = 31 + rng() * 8;
  const goal = {
    x: clamp(x + dir * (3 + rng() * 8), -19, 19),
    z: z - gGap,
    topY: clamp(y - 1 - rng() * 3, -9, 2),
    hw: 7.5 + rng() * 1,
    hd: 9,
  };
  // vent seedé avec le trou : l'équité du Parcours du jour en dépend
  const level = 0.45 + difficulty * 0.7;
  const wind = rng() < 0.25 ? 0
    : Math.round(level * (0.3 + rng() * 0.7) * (rng() < 0.5 ? -1 : 1) * 10) / 10;
  return { name: `Trou ${index + 1}`, par, platforms, goal, wind };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
