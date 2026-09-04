// Les 20 Défis : tirs d'exception à réussir en un minimum d'essais.
// 3 étoiles au premier tir, 2 au deuxième, 1 au troisième.
// Tout est fixé (distance, vent, gardien, obstacles) : un défi se répète
// à l'identique jusqu'à la maîtrise.

const G = 18;
const E = (40 * Math.PI) / 180;
const COS = Math.cos(E);
const TAN = Math.tan(E);

// hauteur de la trajectoire nominale (centre de la cage) à la fraction f
// du trajet, pour une cage à d mètres — sert à poser câbles et drones
function pathY(d, f) {
  const z0 = 2.9;
  const glz = -(d + 4.2);
  const dh = z0 - glz;
  const h = -2.1 - 0.38;
  const v = Math.sqrt((G * dh * dh) / (2 * COS * COS * (dh * TAN - h)));
  const t = (dh * f) / (v * COS);
  return 0.38 + v * Math.sin(E) * t - 0.5 * G * t * t;
}
const midZ = (d, f = 0.5) => 2.9 - (2.9 + d + 4.2) * f;

export const CHALLENGES = [
  { name: 'Échauffement', dist: 26, wind: 0, shots: 3 },
  { name: 'Vent de travers', dist: 26, wind: 0.8, shots: 3 },
  { name: 'Longue portée', dist: 42, wind: 0, shots: 3 },
  { name: 'Lucarne !', dist: 26, wind: 0, shots: 3, lucarne: true },
  { name: 'Le gardien', dist: 30, wind: 0, shots: 3, keeper: 1.6 },
  {
    name: 'Câble bas', dist: 34, wind: 0, shots: 3,
    obstacles: [{ type: 'cable', x: 0, z: midZ(34), y: pathY(34, 0.5) - 2.1, halfLen: 8 }],
  },
  { name: 'Vent du large', dist: 46, wind: 1.0, shots: 3 },
  {
    name: 'Drone de garde', dist: 34, wind: 0, shots: 3,
    obstacles: [{ type: 'drone', x: 0, z: midZ(34), y: pathY(34, 0.5) - 0.4, range: 5, speed: 0.9, phase: 1.2 }],
  },
  { name: 'Lucarne ventée', dist: 30, wind: 0.7, shots: 3, lucarne: true },
  { name: 'Gardien éclair', dist: 36, wind: 0, shots: 3, keeper: 2.4 },
  {
    name: 'Double câble', dist: 40, wind: 0, shots: 3,
    obstacles: [
      { type: 'cable', x: 0, z: midZ(40, 0.42), y: pathY(40, 0.42) - 2.2, halfLen: 8 },
      { type: 'cable', x: 0, z: midZ(40, 0.58), y: pathY(40, 0.58) + 1.9, halfLen: 8 },
    ],
  },
  { name: 'Nuit noire', dist: 44, wind: 0.6, shots: 3, night: 1 },
  { name: 'Lucarne gardée', dist: 32, wind: 0, shots: 3, keeper: 1.8, lucarne: true },
  {
    name: 'Duo infernal', dist: 38, wind: 0, shots: 3,
    obstacles: [
      { type: 'cable', x: 0, z: midZ(38, 0.4), y: pathY(38, 0.4) + 1.7, halfLen: 7 },
      { type: 'drone', x: 0, z: midZ(38, 0.62), y: pathY(38, 0.62) - 0.6, range: 4.5, speed: 1.1, phase: 0 },
    ],
  },
  {
    // câble posé PILE sur la trajectoire du centre : brossez, ou visez les
    // entrées hautes et basses de la cage
    name: 'Le mur', dist: 36, wind: 0, shots: 3,
    obstacles: [{ type: 'cable', x: 0, z: midZ(36), y: pathY(36, 0.5), halfLen: 9 }],
  },
  {
    name: 'Grue de chantier', dist: 42, wind: 0.8, shots: 3,
    obstacles: [{ type: 'crane', x: 9, z: midZ(42), y: Math.max(2.5, pathY(42, 0.5) - 2), jib: 9 }],
  },
  { name: 'Tempête', dist: 50, wind: 1.4, shots: 3 },
  {
    name: 'Nid de drones', dist: 40, wind: 0, shots: 3,
    obstacles: [
      { type: 'drone', x: -3, z: midZ(40, 0.45), y: pathY(40, 0.45) - 0.3, range: 4, speed: 1.0, phase: 0 },
      { type: 'drone', x: 3, z: midZ(40, 0.6), y: pathY(40, 0.6) - 0.8, range: 4, speed: 1.25, phase: 2.4 },
    ],
  },
  { name: 'Lucarne du soir', dist: 48, wind: 0.9, shots: 3, night: 0.8, lucarne: true },
  {
    name: "L'exploit", dist: 55, wind: 1.1, shots: 2, keeper: 2.2, night: 1,
    obstacles: [{ type: 'cable', x: 0, z: midZ(55, 0.55), y: pathY(55, 0.55) + 1.8, halfLen: 8 }],
  },
];
