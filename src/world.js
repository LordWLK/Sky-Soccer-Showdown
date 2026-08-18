// Décor : ciel, ville, toit des tireurs, tour cible avec terrain et cage.
import * as THREE from 'three';
import {
  skyTexture, cloudTexture, towerTextures, grassTexture, pitchTexture, netTexture,
  concreteTexture, helipadTexture,
} from './assets.js';

export const ROOF_Y = 0;        // surface du toit des tireurs
export const TARGET_ROOF_Y = -3; // surface du toit adverse (léger contrebas)
export const GOAL_W = 4.4;       // largeur intérieure de la cage
export const GOAL_H = 2.0;       // hauteur sous la barre
export const GOAL_SETBACK = 4;   // recul de la ligne de but derrière la façade
export const TARGET_HALF_W = 8;  // demi-largeur du toit adverse
export const TARGET_DEPTH = 20;  // profondeur du toit adverse

export function buildWorld(scene) {
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xd9e2ea, 70, 300);

  // ------------------------------------------------------------- lumières --
  const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x3a4d3a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d8, 1.6);
  // soleil bas derrière l'épaule droite : longues ombres visibles vers le vide
  sun.position.set(18, 16, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 26;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 110;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(0, 0, 0);

  // ------------------------------------------------- toit des tireurs -----
  const ourGroup = new THREE.Group();
  const ourTex = towerTextures('#202c4c', 0.22);
  const ourBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(34, 46, 26),
    wallMaterial(ourTex),
  );
  ourBuilding.position.set(0, ROOF_Y - 23.4, 8);
  ourGroup.add(ourBuilding);

  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.8, 26),
    new THREE.MeshLambertMaterial({ color: 0x8c8f96 }),
  );
  rim.position.set(0, ROOF_Y - 0.4, 8);
  rim.receiveShadow = true;
  ourGroup.add(rim);

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(31, 23),
    new THREE.MeshLambertMaterial({ map: grassTexture() }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, ROOF_Y + 0.01, 8);
  grass.receiveShadow = true;
  ourGroup.add(grass);
  scene.add(ourGroup);

  // ------------------------------------------------------- tour cible -----
  // Origine du groupe : centre de la façade avant, au niveau du toit adverse.
  const target = new THREE.Group();

  const towerTex = towerTextures('#1b2740', 0.3);
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(TARGET_HALF_W * 2, 60, TARGET_DEPTH),
    wallMaterial(towerTex),
  );
  tower.position.set(0, -30, -TARGET_DEPTH / 2);
  target.add(tower);

  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(TARGET_HALF_W * 2 - 1.6, TARGET_DEPTH - 2),
    new THREE.MeshLambertMaterial({ map: pitchTexture() }),
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.rotation.z = Math.PI; // le but du terrain dessiné côté tireurs
  pitch.position.set(0, 0.06, -TARGET_DEPTH / 2);
  target.add(pitch);

  const targetRim = new THREE.Mesh(
    new THREE.BoxGeometry(TARGET_HALF_W * 2, 0.7, TARGET_DEPTH),
    new THREE.MeshLambertMaterial({ color: 0x83868d }),
  );
  targetRim.position.set(0, -0.36, -TARGET_DEPTH / 2);
  target.add(targetRim);

  const duelGoal = buildGoal();
  duelGoal.position.set(0, 0, -GOAL_SETBACK);
  target.add(duelGoal);
  scene.add(target);

  // ------------------------------------------------------------- ville ----
  const city = new THREE.Group();
  const cityTowers = buildCity(city);
  scene.add(city);

  // ------------------------------------------------------------ nuages ----
  const clouds = [];
  const cloudTex = cloudTexture();
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTex, transparent: true, opacity: 0.8, depthWrite: false,
    }));
    sp.scale.set(60 + Math.random() * 50, 18 + Math.random() * 12, 1);
    sp.position.set(-160 + Math.random() * 320, 26 + Math.random() * 30, -170 - Math.random() * 60);
    scene.add(sp);
    clouds.push(sp);
  }

  // ---------------------------------------------------------- interface ---
  const state = {
    distance: 26,          // distance actuelle de la façade cible
    targetZ: -26,
  };
  target.position.z = state.targetZ;
  // le toit visible doit coïncider avec le toit de la physique
  target.position.y = TARGET_ROOF_Y;

  return {
    group: target,
    scene,
    setDistance(d, snap = false) {
      state.distance = d;
      state.targetZ = -d;
      if (snap) target.position.z = state.targetZ; // rematch : pas de glissement
    },
    // ligne de but en coordonnées monde (mode Duel)
    goalLineZ() { return target.position.z - GOAL_SETBACK; },
    towerFrontZ() { return target.position.z; },
    towerBackZ() { return target.position.z - TARGET_DEPTH; },
    setDuelTargetVisible(v) { target.visible = v; },
    // masque les tours de la ville qui chevauchent un parcours
    clearCorridor(boxes) {
      for (const t of cityTowers) {
        const hit = boxes.some((b) => Math.abs(t.x - b.x) < t.hw + b.hw + 7
          && Math.abs(t.z - b.z) < t.hd + b.hd + 7);
        if (hit) t.meshes.forEach((m) => { m.visible = false; });
      }
    },
    restoreCity() {
      for (const t of cityTowers) t.meshes.forEach((m) => { m.visible = true; });
    },
    update(dt, t) {
      // la tour glisse en douceur vers sa nouvelle distance
      target.position.z += (state.targetZ - target.position.z) * Math.min(1, dt * 2.2);
      for (let i = 0; i < clouds.length; i++) {
        clouds[i].position.x += dt * (1.2 + i * 0.25);
        if (clouds[i].position.x > 190) clouds[i].position.x = -190;
      }
    },
  };
}

function wallMaterial(tex) {
  const mat = new THREE.MeshLambertMaterial({
    map: tex.map,
    emissive: 0xffffff,
    emissiveMap: tex.emissiveMap,
    emissiveIntensity: 0.85,
  });
  return mat;
}

function buildGoal() {
  const goal = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 });
  const r = 0.07;

  const postGeo = new THREE.CylinderGeometry(r, r, GOAL_H, 10);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, white);
    post.position.set(side * GOAL_W / 2, GOAL_H / 2, 0);
    goal.add(post);
    // montant arrière incliné
    const back = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, GOAL_H + 0.35, 8), white);
    back.position.set(side * GOAL_W / 2, GOAL_H / 2 - 0.08, -0.55);
    back.rotation.x = 0.55;
    goal.add(back);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, GOAL_W + 0.2, 10), white);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, GOAL_H, 0);
  goal.add(bar);

  const netMat = new THREE.MeshLambertMaterial({
    map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  const backNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, GOAL_H), netMat);
  backNet.position.set(0, GOAL_H / 2 - 0.05, -1.05);
  goal.add(backNet);
  for (const side of [-1, 1]) {
    const sideNet = new THREE.Mesh(new THREE.PlaneGeometry(1.05, GOAL_H), netMat);
    sideNet.rotation.y = Math.PI / 2;
    sideNet.position.set(side * GOAL_W / 2, GOAL_H / 2 - 0.05, -0.52);
    goal.add(sideNet);
  }
  const topNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, 1.1), netMat);
  topNet.rotation.x = -Math.PI / 2 + 0.18;
  topNet.position.set(0, GOAL_H - 0.06, -0.52);
  goal.add(topNet);

  // cage à l'origine, ligne de but à z local = 0, ouverte vers +z
  return goal;
}

function buildCity(city) {
  const towers = [];
  const rand = mulberry32(20250818);
  const palettes = ['#16203a', '#1b2740', '#232c3e', '#141c30', '#1f2a52'];
  for (let i = 0; i < 46; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 55 + rand() * 150;
    const x = Math.cos(angle) * dist;
    const z = -40 + Math.sin(angle) * dist * 0.9 - 30;
    // couloir de jeu réservé (entre les deux toits)
    if (Math.abs(x) < 18 && z > -95 && z < 30) continue;
    if (z > 18 && Math.abs(x) < 26) continue;
    const w = 10 + rand() * 16;
    const d = 10 + rand() * 16;
    const h = 30 + rand() * 55;
    const tex = towerTextures(palettes[(rand() * palettes.length) | 0], 0.18 + rand() * 0.2);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial(tex));
    tower.position.set(x, h / 2 - 34, z);
    city.add(tower);
    towers.push({ x, z, hw: w / 2, hd: d / 2, meshes: [tower] });
  }
  // clin d'œil à la tour géodésique de la pub, sur la droite
  const geo = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 12, 55, 8, 4),
    new THREE.MeshLambertMaterial({ color: 0x2a3550, flatShading: true }),
  );
  geo.position.set(30, -8, -55);
  city.add(geo);
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo.geometry),
    new THREE.LineBasicMaterial({ color: 0x7f9bd0, transparent: true, opacity: 0.55 }),
  );
  wire.position.copy(geo.position);
  city.add(wire);
  towers.push({ x: 30, z: -55, hw: 12, hd: 12, meshes: [geo, wire] });
  return towers;
}

// ============================================================== PARCOURS ==
// Les trois trous du mode golf : plateformes en coordonnées absolues.
// Le toit de départ (les tireurs) est commun à tous les trous.
export const HOLES = [
  {
    name: 'Trou 1', par: 3,
    platforms: [
      { x: 6, z: -38, topY: -2, hw: 7, hd: 7, deco: 'concrete' },
    ],
    goal: { x: 2, z: -76, topY: -4, hw: 8, hd: 9 },
  },
  {
    name: 'Trou 2', par: 4,
    platforms: [
      { x: -8, z: -40, topY: -3, hw: 6.5, hd: 6.5, deco: 'helipad' },
      { x: 4, z: -78, topY: 1, hw: 6, hd: 6, deco: 'concrete' },
    ],
    goal: { x: 12, z: -116, topY: -2, hw: 7.5, hd: 9 },
  },
  {
    name: 'Trou 3', par: 5,
    platforms: [
      { x: 8, z: -42, topY: -2, hw: 6, hd: 6, deco: 'concrete' },
      { x: -6, z: -80, topY: -5, hw: 5.5, hd: 5.5, deco: 'helipad' },
      { x: -14, z: -118, topY: 0, hw: 5, hd: 5, deco: 'concrete' },
    ],
    goal: { x: -6, z: -156, topY: -3, hw: 8, hd: 9 },
  },
];

// Construit un trou : tours support, décors de toits, cage sur le toit final.
// Retourne les plateformes (pour la physique) et les infos de la cage.
export function buildCourse(scene, hole) {
  const group = new THREE.Group();
  const platforms = [
    // le toit de départ fait partie du jeu (un tir trop court y retombe)
    { x: 0, z: 8, topY: 0, hw: 15.5, hd: 11.5, isStart: true },
  ];

  const decoTex = {
    grass: () => grassTexture(),
    concrete: () => concreteTexture(),
    helipad: () => helipadTexture(),
  };

  function addPlatform(p, deco) {
    const h = 60;
    const tex = towerTextures('#1b2740', 0.26);
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(p.hw * 2, h, p.hd * 2),
      wallMaterial(tex),
    );
    tower.position.set(p.x, p.topY - h / 2, p.z);
    group.add(tower);
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(p.hw * 2, 0.7, p.hd * 2),
      new THREE.MeshLambertMaterial({ color: 0x83868d }),
    );
    rim.position.set(p.x, p.topY - 0.36, p.z);
    group.add(rim);
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(p.hw * 2 - 0.8, p.hd * 2 - 0.8),
      new THREE.MeshLambertMaterial({ map: decoTex[deco]() }),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.set(p.x, p.topY + 0.03, p.z);
    top.receiveShadow = true;
    group.add(top);
    platforms.push({ x: p.x, z: p.z, topY: p.topY, hw: p.hw, hd: p.hd });
  }

  for (const p of hole.platforms) addPlatform(p, p.deco);

  // toit final : pelouse à terrain + cage ouverte vers les tireurs (+z)
  const gp = hole.goal;
  addPlatform(gp, 'grass');
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(gp.hw * 2 - 1.6, gp.hd * 2 - 1.6),
    new THREE.MeshLambertMaterial({ map: pitchTexture() }),
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.rotation.z = Math.PI;
  pitch.position.set(gp.x, gp.topY + 0.06, gp.z);
  group.add(pitch);

  const goal = buildGoal();
  const goalLineZ = gp.z - 2;
  goal.position.set(gp.x, gp.topY, goalLineZ);
  group.add(goal);

  scene.add(group);
  return {
    platforms,
    goalInfo: { x: gp.x, lineZ: goalLineZ, roofY: gp.topY, platform: platforms[platforms.length - 1] },
    boxes: platforms.map((p) => ({ x: p.x, z: p.z, hw: p.hw, hd: p.hd })),
    dispose() {
      scene.remove(group);
      group.traverse((m) => {
        if (m.isMesh) {
          m.geometry.dispose();
          if (m.material.map) m.material.map.dispose();
          m.material.dispose();
        }
      });
    },
  };
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
