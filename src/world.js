// Décor : ciel, ville, toit des tireurs, tour cible avec terrain et cage.
import * as THREE from 'three';
import {
  cloudTexture, towerTextures, grassTexture, pitchTexture, netTexture,
  concreteTexture, helipadTexture, softDotTexture,
} from './assets.js';
import { buildFigure } from './players.js';
import { mulberry32 } from './course.js';
import { buildObstacles } from './obstacles.js';

// registre des matériaux de façades : leurs fenêtres s'allument à la nuit
const WALL_MATS = [];
// feux rouges d'antennes (clignotent la nuit) et enseignes néon
const BLINKERS = [];
const NEONS = [];

// ciel repeint dynamiquement entre jour et nuit
function createSky() {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 512;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const DAY = [[0x6e, 0xa8, 0xe8], [0xa9, 0xc8, 0xea], [0xe3, 0xe2, 0xd8], [0xf0, 0xd9, 0xb8]];
  const NIGHT = [[0x0a, 0x11, 0x28], [0x14, 0x1c, 0x3c], [0x23, 0x28, 0x48], [0x3a, 0x2c, 0x3e]];
  const STOPS = [0, 0.55, 0.78, 1];
  return {
    tex,
    paint(t) {
      const grad = g.createLinearGradient(0, 0, 0, 512);
      STOPS.forEach((stop, i) => {
        const col = DAY[i].map((d, k) => Math.round(d + (NIGHT[i][k] - d) * t));
        grad.addColorStop(stop, `rgb(${col[0]},${col[1]},${col[2]})`);
      });
      g.fillStyle = grad;
      g.fillRect(0, 0, 2, 512);
      tex.needsUpdate = true;
    },
  };
}

export const ROOF_Y = 0;        // surface du toit des tireurs
export const TARGET_ROOF_Y = -3; // surface du toit adverse (léger contrebas)
export const GOAL_W = 4.4;       // largeur intérieure de la cage
export const GOAL_H = 2.0;       // hauteur sous la barre
export const GOAL_SETBACK = 4;   // recul de la ligne de but derrière la façade
export const TARGET_HALF_W = 8;  // demi-largeur du toit adverse
export const TARGET_DEPTH = 20;  // profondeur du toit adverse

export function buildWorld(scene) {
  const sky = createSky();
  sky.paint(0);
  scene.background = sky.tex;
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

  const duelGoal = buildGoal(true); // lucarnes bonus signalées en or
  duelGoal.position.set(0, 0, -GOAL_SETBACK);
  target.add(duelGoal);

  // gardien de but des manches avancées, face aux tireurs
  const keeper = buildFigure({
    shirt: 0x3a3f4a, shorts: 0x22252c, socks: 0x3a3f4a, accent: 0xf5d020,
    skin: 0xd9a06b, hair: 0x1e1712, hairStyle: 'crew',
    number: 1, numColor: '#f5d020', gloves: true,
  });
  keeper.rotation.y = Math.PI;
  keeper.position.set(0, 0, -GOAL_SETBACK + 0.7);
  keeper.visible = false;
  target.add(keeper);
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

  // ------------------------------------------------------ ciel habillé ----
  // contre-jour bleuté venu de la ville : les silhouettes se détachent
  const rimLight = new THREE.DirectionalLight(0x9db8ff, 0.4);
  rimLight.position.set(-40, 30, -80);
  scene.add(rimLight);

  // étoiles — n'apparaissent qu'à la nuit tombée
  const starGeo = new THREE.BufferGeometry();
  {
    const pts = [];
    for (let i = 0; i < 320; i++) {
      const a = Math.random() * Math.PI * 2;
      const r2 = 150 + Math.random() * 120;
      pts.push(Math.cos(a) * r2, 20 + Math.random() * 130, Math.sin(a) * r2 - 60);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  }
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xeef4ff, size: 1.1, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false, fog: false,
  }));
  scene.add(stars);

  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(7, 24),
    new THREE.MeshBasicMaterial({ color: 0xf4f0e2, transparent: true, opacity: 0, fog: false }),
  );
  moon.position.set(-70, 74, -190);
  scene.add(moon);

  // disque solaire : bien visible au crépuscule, descend avec le soir
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(9, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffd9a0, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }),
  );
  sunDisc.position.set(85, 42, -185);
  scene.add(sunDisc);

  // nappe urbaine tout en bas : la trame des rues s'allume à la nuit
  const streets = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshBasicMaterial({
      map: streetsTexture(), transparent: true, opacity: 0.32, depthWrite: false,
    }),
  );
  streets.rotation.x = -Math.PI / 2;
  streets.position.set(0, -35.5, -60);
  scene.add(streets);

  // projecteurs de stade aux coins des deux toits : halos qui s'allument le soir
  const floods = [];
  const dotTex = softDotTexture();
  const addFlood = (parent, x, y, z) => {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.13, 3.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x3c414d }),
    );
    mast.position.set(x, y + 1.7, z);
    parent.add(mast);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.5, 0.35),
      new THREE.MeshLambertMaterial({ color: 0xe8ecf4, emissive: 0xfff6d8, emissiveIntensity: 0.15 }),
    );
    head.position.set(x, y + 3.4, z);
    head.rotation.x = 0.5;
    parent.add(head);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: dotTex, color: 0xfff2c0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    halo.scale.set(5.5, 5.5, 1);
    halo.position.set(x, y + 3.6, z);
    parent.add(halo);
    floods.push({ head: head.material, halo: halo.material });
  };
  addFlood(ourGroup, -15.4, ROOF_Y, -2.2);
  addFlood(ourGroup, 15.4, ROOF_Y, -2.2);
  addFlood(target, -TARGET_HALF_W + 0.6, 0, -1.2);
  addFlood(target, TARGET_HALF_W - 0.6, 0, -1.2);

  // ---------------------------------------------------------- interface ---
  const state = {
    distance: 26,          // distance actuelle de la façade cible
    targetZ: -26,
    tod: 0,                // heure du jour : 0 = jour, 1 = nuit
    todTarget: 0,
    keeper: { active: false, speed: 1, phase: 0, dive: 0, diveDir: 1 },
    duelObs: null,         // obstacles aériens de la manche (Duel/Défis)
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
    // heure du jour cible (0 jour → 1 nuit), transition douce dans update()
    setDayNight(t) { state.todTarget = Math.max(0, Math.min(1, t)); },
    tod() { return state.tod; }, // lecture (tests, débogage)
    setKeeper(active, speed = 1) {
      state.keeper.active = active;
      state.keeper.speed = speed;
      keeper.visible = active;
    },
    keeperActive() { return state.keeper.active; },
    keeperX() { return keeper.position.x; },
    // plongeon d'arrêt : le gardien bascule vers le ballon repoussé
    keeperDive(dir) {
      state.keeper.dive = 1;
      state.keeper.diveDir = dir >= 0 ? 1 : -1;
    },
    // obstacles aériens de la manche en cours (Duel et Défis)
    setDuelObstacles(specs) {
      if (state.duelObs) state.duelObs.dispose();
      state.duelObs = specs && specs.length ? buildObstacles(scene, specs) : null;
    },
    duelColliders() { return state.duelObs ? state.duelObs.colliders : []; },
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
      if (state.duelObs) state.duelObs.update(dt);
      for (let i = 0; i < clouds.length; i++) {
        clouds[i].position.x += dt * (1.2 + i * 0.25);
        if (clouds[i].position.x > 190) clouds[i].position.x = -190;
      }
      // le soir tombe : ciel, soleil, brume et fenêtres évoluent ensemble
      if (Math.abs(state.todTarget - state.tod) > 0.001) {
        state.tod += (state.todTarget - state.tod) * Math.min(1, dt * 0.6);
        const k = state.tod;
        sky.paint(k);
        sun.intensity = 1.6 - k * 1.05;
        sun.color.setRGB(1 - k * 0.35, 0.945 - k * 0.28, 0.847 + k * 0.06);
        hemi.intensity = 0.95 - k * 0.5;
        scene.fog.color.setRGB(
          (0xd9 - k * (0xd9 - 0x14)) / 255,
          (0xe2 - k * (0xe2 - 0x1c)) / 255,
          (0xea - k * (0xea - 0x34)) / 255,
        );
        for (const m of WALL_MATS) m.emissiveIntensity = 0.85 + k * 1.0;
        // habillage du ciel et de la ville selon l'heure
        const nightK = Math.max(0, (k - 0.45) / 0.55);
        stars.material.opacity = nightK;
        moon.material.opacity = nightK * 0.95;
        sunDisc.material.opacity = 0.3 + 2.6 * k * (1 - k); // max au crépuscule
        sunDisc.position.y = 42 - k * 30;
        sunDisc.material.color.setRGB(1, 0.85 - k * 0.35, 0.63 - k * 0.3);
        rimLight.intensity = 0.4 + k * 0.35;
        streets.material.opacity = 0.32 + k * 0.55;
        // nuages : blancs le jour, cuivrés au crépuscule, ardoise la nuit
        const warm = 4 * k * (1 - k);
        clouds.forEach((sp) => sp.material.color.setRGB(
          1 - k * 0.62 + warm * 0.05,
          1 - k * 0.68 - warm * 0.12,
          1 - k * 0.55 - warm * 0.22,
        ));
        for (const f of floods) {
          f.head.emissiveIntensity = 0.15 + k * 1.6;
          f.halo.opacity = k * 0.85;
        }
      }
      // feux d'antennes et néons : vie nocturne animée en continu
      const nk = state.tod;
      if (BLINKERS.length && nk > 0.2) {
        for (let i = 0; i < BLINKERS.length; i++) {
          const on = Math.sin(t * 2.4 + i * 1.7) > 0.1 ? 1 : 0.12;
          BLINKERS[i].opacity = on * Math.min(1, nk * 1.5);
        }
      } else {
        for (const b of BLINKERS) b.opacity = 0;
      }
      for (let i = 0; i < NEONS.length; i++) {
        const flicker = Math.sin(t * 11 + i * 5.3) > -0.92 ? 1 : 0.35;
        NEONS[i].opacity = Math.max(0, nk - 0.2) * 1.25 * flicker;
      }
      // va-et-vient du gardien le long de sa ligne — plus un plongeon d'arrêt
      if (state.keeper.active) {
        state.keeper.phase += dt * state.keeper.speed;
        if (state.keeper.dive > 0) {
          state.keeper.dive = Math.max(0, state.keeper.dive - dt * 2.2);
          const d = Math.sin((1 - state.keeper.dive) * Math.PI);
          keeper.rotation.z = state.keeper.diveDir * d * 1.15;
          keeper.position.y = d * 0.55;
        } else {
          keeper.position.x = Math.sin(state.keeper.phase) * (GOAL_W / 2 - 0.6);
          keeper.rotation.z = -Math.cos(state.keeper.phase) * 0.12;
          keeper.position.y = 0;
        }
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
  WALL_MATS.push(mat);
  return mat;
}

function buildGoal(withCorners = false) {
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

  if (withCorners) {
    // lucarnes bonus : panneaux dorés translucides dans les coins hauts
    const cornerMat = new THREE.MeshBasicMaterial({
      color: 0xffd75e, transparent: true, opacity: 0.28,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.58), cornerMat);
      panel.position.set(side * (GOAL_W / 2 - 0.44), GOAL_H - 0.33, 0.02);
      goal.add(panel);
    }
  }

  // cage à l'origine, ligne de but à z local = 0, ouverte vers +z
  return goal;
}

// trame de rues vue de très haut : lueur chaude des artères, brume aidant
function streetsTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0b101f';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i <= 8; i++) {
    const p = i * 32 + ((i * 37) % 9) - 4;
    g.strokeStyle = 'rgba(255,190,110,0.55)';
    g.lineWidth = i % 3 === 0 ? 3 : 1.5;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(256, p); g.stroke();
  }
  // poussière de fenêtres et de phares
  for (let i = 0; i < 260; i++) {
    g.fillStyle = Math.random() < 0.7 ? 'rgba(255,205,130,0.5)' : 'rgba(150,200,255,0.45)';
    g.fillRect((Math.random() * 256) | 0, (Math.random() * 256) | 0, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

// enseigne au néon : texte lumineux à halo sur fond transparent
function neonTexture(word, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = '900 42px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 16;
  g.strokeStyle = color;
  g.lineWidth = 2.5;
  g.strokeText(word, 128, 34);
  g.shadowBlur = 4;
  g.fillStyle = '#ffffff';
  g.fillText(word, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
    const meshes = [tower];
    // silhouettes de toits : châteaux d'eau, antennes à feu rouge, clims —
    // c'est ce qui donne à la ligne d'horizon son grain de vraie ville
    const topY = h - 34;
    if (rand() < 0.62) {
      const px = x + (rand() - 0.5) * w * 0.5;
      const pz = z + (rand() - 0.5) * d * 0.5;
      const kind = rand();
      if (kind < 0.34) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 1.6, 2.6, 9),
          new THREE.MeshLambertMaterial({ color: 0x37405c }),
        );
        tank.position.set(px, topY + 1.3, pz);
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(1.7, 1, 9),
          new THREE.MeshLambertMaterial({ color: 0x2c3350 }),
        );
        cap.position.set(px, topY + 3.1, pz);
        city.add(tank, cap);
        meshes.push(tank, cap);
      } else if (kind < 0.72) {
        const mastH = 5 + rand() * 5;
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.16, mastH, 5),
          new THREE.MeshLambertMaterial({ color: 0x49506a }),
        );
        mast.position.set(px, topY + mastH / 2, pz);
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xff4545, transparent: true, opacity: 0, fog: false }),
        );
        beacon.position.set(px, topY + mastH + 0.2, pz);
        city.add(mast, beacon);
        meshes.push(mast, beacon);
        BLINKERS.push(beacon.material);
      } else {
        for (let c = 0; c < 2; c++) {
          const ac = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 1, 1.3),
            new THREE.MeshLambertMaterial({ color: 0x3d4560 }),
          );
          ac.position.set(px + c * 2 - 1, topY + 0.5, pz + (rand() - 0.5) * 2);
          city.add(ac);
          meshes.push(ac);
        }
      }
    }
    // enseignes néon en haut de façade, tournées vers les joueurs
    if (rand() < 0.2 && z < -20) {
      const words = ['HOTEL', 'CLUB', 'NOVA', 'LUNA', 'RADIO', 'SUSHI', 'CINEMA'];
      const colors = ['#59f2ff', '#ff6ad5', '#ffd75e', '#7dff8a'];
      const wIdx = (rand() * words.length) | 0;
      const neon = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(w * 0.8, 9), 2.2),
        new THREE.MeshBasicMaterial({
          map: neonTexture(words[wIdx], colors[(rand() * colors.length) | 0]),
          transparent: true, opacity: 0, fog: false, depthWrite: false,
        }),
      );
      neon.position.set(x, topY - 3 - rand() * 4, z + d / 2 + 0.15);
      city.add(neon);
      meshes.push(neon);
      NEONS.push(neon.material);
    }
    towers.push({ x, z, hw: w / 2, hd: d / 2, meshes });
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
// La génération des trous vit dans src/course.js (module sans dépendance,
// testable sous Node) ; ici on ne garde que la construction 3D.

// bâche élastique : toile bleue tendue, sangles en croix — se repère de loin
function trampoTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#2b62c9';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#1c3f85';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 118, 118);
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(10, 10); g.lineTo(118, 118);
  g.moveTo(118, 10); g.lineTo(10, 118);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 3;
  for (let i = 24; i < 128; i += 24) {
    g.beginPath(); g.moveTo(i, 6); g.lineTo(i, 122); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// Construit un trou : tours support, décors de toits, cage sur le toit final.
// Retourne les plateformes (pour la physique) et les infos de la cage.
export function buildCourse(scene, hole) {
  const group = new THREE.Group();
  const courseMats = []; // façades de CE trou, à retirer du registre jour/nuit
  const platforms = [
    // le toit de départ fait partie du jeu (un tir trop court y retombe)
    { x: 0, z: 8, topY: 0, hw: 15.5, hd: 11.5, isStart: true },
  ];

  const decoTex = {
    grass: () => grassTexture(),
    concrete: () => concreteTexture(),
    helipad: () => helipadTexture(),
    trampo: () => trampoTexture(),
  };

  function addPlatform(p, deco) {
    const h = 60;
    const tex = towerTextures('#1b2740', 0.26);
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(p.hw * 2, h, p.hd * 2),
      wallMaterial(tex),
    );
    courseMats.push(tower.material);
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
    // la deco compte pour le gameplay : bâche qui relance, héliport bonus
    platforms.push({ x: p.x, z: p.z, topY: p.topY, hw: p.hw, hd: p.hd, deco });
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
  // obstacles et colonnes d'air seedés avec le trou (équité du jour)
  const obs = buildObstacles(scene, hole.obstacles || [], hole.lifts || []);
  return {
    platforms,
    goalInfo: { x: gp.x, lineZ: goalLineZ, roofY: gp.topY, platform: platforms[platforms.length - 1] },
    boxes: platforms.map((p) => ({ x: p.x, z: p.z, hw: p.hw, hd: p.hd })),
    obs,
    dispose() {
      obs.dispose();
      scene.remove(group);
      group.traverse((m) => {
        if (m.isMesh) {
          m.geometry.dispose();
          if (m.material.map) m.material.map.dispose();
          if (m.material.emissiveMap) m.material.emissiveMap.dispose();
          m.material.dispose();
        }
      });
      // sans quoi le registre grossit à chaque trou et l'animation nuit/jour
      // continue d'écrire dans des matériaux libérés
      for (const mat of courseMats) {
        const i = WALL_MATS.indexOf(mat);
        if (i !== -1) WALL_MATS.splice(i, 1);
      }
    },
  };
}

