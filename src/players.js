// Tireurs détaillés : capsules arrondies, membres articulés (genoux, coudes),
// visage, coiffures, col, écusson — plus planches, badge drapeau et flèche.
import * as THREE from 'three';
import {
  flagBadgeTexture, numberTexture, faceTexture,
} from './assets.js';

const PLANK_T = 0.14; // épaisseur d'une planche

export class Shooter {
  constructor(scene, nation, x, isPlayer, opts = {}) {
    this.nation = nation;
    this.isPlayer = isPlayer;
    this.homeX = x;
    this.alive = true;
    this.lives = 3;
    this.score = 0;
    this.kickT = -1;
    this.hopT = -1;
    this.celebrateT = -1;
    this.falling = null;
    this.withPlanks = opts.planks !== false;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, 3.5);
    scene.add(this.group);

    this.planks = [];
    this.planksGroup = new THREE.Group();
    this.group.add(this.planksGroup);
    if (this.withPlanks) {
      // 3 planches = 3 vies : la pile raconte exactement la règle
      for (let i = 0; i < 3; i++) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, PLANK_T - 0.02, 0.55),
          new THREE.MeshLambertMaterial({ color: [0x6b4a2c, 0x7a5433, 0x5d3f24][i % 3] }),
        );
        plank.position.set((Math.random() - 0.5) * 0.25, PLANK_T / 2 + i * PLANK_T, (Math.random() - 0.5) * 0.2);
        plank.rotation.y = (Math.random() - 0.5) * 0.9;
        plank.castShadow = true;
        plank.receiveShadow = true;
        this.planks.push(plank);
        this.planksGroup.add(plank);
      }
    }
    this.figureY = this.pileTop();

    this.figure = buildFigure(nation);
    this.figure.position.y = this.figureY;
    this.group.add(this.figure);

    // badge drapeau flottant
    this.badge = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flagBadgeTexture(nation.id), transparent: true, depthWrite: false,
    }));
    this.badge.scale.set(1.35, 1.35, 1);
    this.badge.position.set(0, 3.75, 0);
    this.group.add(this.badge);

    if (isPlayer && opts.arrow !== false) {
      this.arrow = buildArrow();
      this.arrow.position.set(0, 5.3, 0.5);
      this.group.add(this.arrow);
    }
  }

  pileTop() { return this.planks.length * PLANK_T; }

  // position de départ du ballon, posé sur la pelouse devant le tireur (Duel)
  ballStart(r) { return new THREE.Vector3(this.homeX, r, 2.9); }

  // Parcours : se placer derrière le ballon, tourné vers `heading`
  // (0 = plein -z, positif vers +x, même convention que la visée).
  standAt(ballPos, groundY, heading) {
    const back = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading)).multiplyScalar(-1.05);
    this.group.position.set(ballPos.x + back.x, groundY, ballPos.z + back.z);
    this.group.rotation.y = -heading;
  }

  startKick() { this.kickT = 0; }

  celebrate() { this.celebrateT = 0; }

  breakPlank(fx) {
    this.lives -= 1;
    const plank = this.planks.pop();
    if (plank) {
      const world = plank.getWorldPosition(new THREE.Vector3());
      this.planksGroup.remove(plank);
      fx.tumble(plank, world, new THREE.Vector3((Math.random() - 0.5) * 5, 4 + Math.random() * 2, 2 + Math.random() * 2));
    }
    this.hopT = 0;
    return this.lives;
  }

  fallOff(fx) {
    this.alive = false;
    while (this.planks.length) {
      const plank = this.planks.pop();
      const world = plank.getWorldPosition(new THREE.Vector3());
      this.planksGroup.remove(plank);
      fx.tumble(plank, world, new THREE.Vector3((Math.random() - 0.5) * 7, 3 + Math.random() * 4, (Math.random() - 0.5) * 6));
    }
    this.badge.material.color.set(0x555555);
    this.badge.material.opacity = 0.6;
    if (this.arrow) this.arrow.visible = false;
    // bascule cartoon : assez d'élan pour passer le bord du toit avant de chuter
    this.falling = {
      vel: new THREE.Vector3((Math.random() - 0.5) * 2, 7, -14),
      spin: 2.5 + Math.random() * 2,
    };
  }

  update(dt, t) {
    if (this.falling) {
      this.falling.vel.y -= 22 * dt;
      this.group.position.addScaledVector(this.falling.vel, dt);
      this.figure.rotation.x -= this.falling.spin * dt;
      if (this.group.position.y < -60) this.group.visible = false;
      return;
    }

    // repose en douceur sur la pile restante (après un bris de planche)
    this.figureY += (this.pileTop() - this.figureY) * Math.min(1, dt * 6);
    let y = this.figureY + Math.sin(t * 2 + this.homeX) * 0.025; // respiration
    if (this.hopT >= 0) {
      this.hopT += dt;
      y += Math.max(0, Math.sin(this.hopT * 12)) * 0.25;
      if (this.hopT > 0.26) this.hopT = -1;
    }
    if (this.celebrateT >= 0) {
      this.celebrateT += dt;
      y += Math.abs(Math.sin(this.celebrateT * 9)) * 0.3;
      if (this.celebrateT > 1.2) this.celebrateT = -1;
    }
    this.figure.position.y = y;

    this.badge.position.y = 3.75 + Math.sin(t * 1.7 + this.homeX * 2) * 0.08;
    if (this.arrow) {
      this.arrow.position.y = 5.3 + Math.sin(t * 3) * 0.22;
    }

    this.animate(dt, t);
  }

  animate(dt, t) {
    const j = this.figure.userData;
    const set = (pose) => {
      j.rHip.rotation.x = pose.rHip || 0;
      j.rKnee.rotation.x = pose.rKnee || 0;
      j.lHip.rotation.x = pose.lHip || 0;
      j.lKnee.rotation.x = pose.lKnee || 0;
      j.body.rotation.x = pose.lean || 0;
      j.body.rotation.y = pose.twist || 0;
      j.lSh.rotation.x = pose.lSh || 0;
      j.rSh.rotation.x = pose.rSh || 0;
      j.lEl.rotation.x = pose.lEl || 0;
      j.rEl.rotation.x = pose.rEl || 0;
      // -0.06/+0.06 : bras légèrement écartés au repos
      j.lSh.rotation.z = (pose.lShZ || 0) - 0.06;
      j.rSh.rotation.z = (pose.rShZ || 0) + 0.06;
    };

    if (this.celebrateT >= 0) {
      // bras au ciel !
      const u = Math.min(1, this.celebrateT * 5);
      set({
        lShZ: -2.6 * u, rShZ: 2.6 * u,
        lean: -0.12 * u,
        lEl: -0.2 * u, rEl: -0.2 * u,
      });
      return;
    }

    if (this.kickT >= 0) {
      this.kickT += dt;
      const k = this.kickT;
      let p;
      if (k < 0.16) { // armé : jambe en arrière, genou plié, buste vissé
        const u = k / 0.16;
        p = {
          rHip: -1.0 * u, rKnee: -1.5 * u, lKnee: -0.25 * u,
          lean: 0.15 * u, twist: -0.14 * u,
          lSh: 0.7 * u, rSh: -0.75 * u, lEl: 0.4 * u, rEl: 0.3 * u,
        };
      } else if (k < 0.27) { // frappe : extension complète
        const u = (k - 0.16) / 0.11;
        p = {
          rHip: -1.0 + 2.5 * u, rKnee: -1.5 + 1.4 * u, lKnee: -0.25 + 0.1 * u,
          lean: 0.15 - 0.3 * u, twist: -0.14 + 0.32 * u,
          lSh: 0.7 - 1.3 * u, rSh: -0.75 + 1.3 * u,
          lEl: 0.4 - 0.3 * u, rEl: 0.3 - 0.2 * u,
        };
      } else if (k < 0.9) { // retour
        const u = (k - 0.27) / 0.63;
        const e = 1 - (1 - u) * (1 - u);
        const f = 1 - e;
        p = {
          rHip: 1.5 * f, rKnee: -0.1 * f, lKnee: -0.15 * f,
          lean: -0.15 * f, twist: 0.18 * f,
          lSh: -0.6 * f, rSh: 0.55 * f, lEl: 0.1 * f, rEl: 0.1 * f,
        };
      } else {
        this.kickT = -1;
        p = {};
      }
      set(p);
      return;
    }

    // attitude au repos : balancement discret, coudes semi-fléchis
    const s = Math.sin(t * 2 + this.homeX);
    set({
      rHip: s * 0.04, lHip: -s * 0.04,
      lean: Math.sin(t * 1.6 + this.homeX) * 0.03,
      lSh: s * 0.08, rSh: -s * 0.08,
      lEl: 0.25 + s * 0.04, rEl: 0.25 - s * 0.04,
    });
  }
}

// ---------------------------------------------------------------- figure --
// Silhouette détaillée face au but (-z) ; la caméra voit le dos et le numéro.
function buildFigure(nation) {
  const g = new THREE.Group();
  const mat = {
    shirt: new THREE.MeshLambertMaterial({ color: nation.shirt }),
    shorts: new THREE.MeshLambertMaterial({ color: nation.shorts }),
    socks: new THREE.MeshLambertMaterial({ color: nation.socks }),
    accent: new THREE.MeshLambertMaterial({ color: nation.accent }),
    skin: new THREE.MeshLambertMaterial({ color: nation.skin }),
    hair: new THREE.MeshLambertMaterial({ color: nation.hair }),
    boot: new THREE.MeshLambertMaterial({ color: 0x23262c }),
    bootSole: new THREE.MeshLambertMaterial({ color: 0x111318 }),
  };

  // ------------------------------------------------------------- buste ----
  const body = new THREE.Group();
  body.position.y = 1.0; // pivot aux hanches
  g.add(body);

  const hips = mesh(new THREE.BoxGeometry(0.56, 0.3, 0.38), mat.shorts, 0, 0.13, 0);
  const hemL = mesh(new THREE.BoxGeometry(0.24, 0.06, 0.39), mat.accent, -0.16, -0.02, 0);
  const hemR = mesh(new THREE.BoxGeometry(0.24, 0.06, 0.39), mat.accent, 0.16, -0.02, 0);
  const torso = mesh(new THREE.CapsuleGeometry(0.27, 0.34, 6, 14), mat.shirt, 0, 0.55, 0);
  torso.scale.set(1.15, 1, 0.8);
  const collar = mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.06, 12), mat.accent, 0, 0.93, 0);
  const shoulderL = mesh(new THREE.SphereGeometry(0.135, 10, 8), mat.shirt, -0.33, 0.82, 0);
  const shoulderR = mesh(new THREE.SphereGeometry(0.135, 10, 8), mat.shirt, 0.33, 0.82, 0);
  body.add(hips, hemL, hemR, torso, collar, shoulderL, shoulderR);

  // écusson au torse (côté cœur) + numéro dans le dos
  const crest = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.15),
    new THREE.MeshBasicMaterial({ map: flagBadgeTexture(nation.id), transparent: true }),
  );
  crest.position.set(0.13, 0.7, -0.235);
  crest.rotation.y = Math.PI;
  const num = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: numberTexture(nation.number, nation.numColor), transparent: true }),
  );
  num.position.set(0, 0.58, 0.245);
  body.add(crest, num);

  // ---------------------------------------------------------------- tête --
  const head = mesh(new THREE.SphereGeometry(0.26, 16, 13), mat.skin, 0, 1.26, 0);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true }),
  );
  face.position.set(0, 1.26, -0.245);
  face.rotation.y = Math.PI;
  body.add(head, face, buildHair(nation, mat.hair));

  // ---------------------------------------------------------------- bras --
  const lSh = limbArm(mat);
  lSh.position.set(-0.38, 0.84, 0);
  const rSh = limbArm(mat);
  rSh.position.set(0.38, 0.84, 0);
  body.add(lSh, rSh);

  // -------------------------------------------------------------- jambes --
  const lHip = limbLeg(mat);
  lHip.position.set(-0.17, 1.0, 0);
  const rHip = limbLeg(mat);
  rHip.position.set(0.17, 1.0, 0);
  g.add(lHip, rHip);

  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.userData = {
    body,
    lSh, rSh, lEl: lSh.userData.elbow, rEl: rSh.userData.elbow,
    lHip, rHip, lKnee: lHip.userData.knee, rKnee: rHip.userData.knee,
  };
  return g;
}

function mesh(geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}

function limbArm(mat) {
  const shoulder = new THREE.Group(); // pivot à l'épaule
  const upper = mesh(new THREE.CapsuleGeometry(0.085, 0.16, 4, 10), mat.shirt, 0, -0.12, 0);
  const sleeve = mesh(new THREE.CylinderGeometry(0.088, 0.092, 0.05, 10), mat.accent, 0, -0.23, 0);
  shoulder.add(upper, sleeve);
  const elbow = new THREE.Group(); // pivot au coude
  elbow.position.set(0, -0.3, 0);
  const forearm = mesh(new THREE.CapsuleGeometry(0.07, 0.15, 4, 10), mat.skin, 0, -0.1, 0);
  const hand = mesh(new THREE.SphereGeometry(0.078, 8, 7), mat.skin, 0, -0.24, 0);
  elbow.add(forearm, hand);
  shoulder.add(elbow);
  shoulder.userData.elbow = elbow;
  return shoulder;
}

function limbLeg(mat) {
  const hip = new THREE.Group(); // pivot à la hanche
  const thigh = mesh(new THREE.CapsuleGeometry(0.115, 0.25, 4, 10), mat.skin, 0, -0.2, 0);
  hip.add(thigh);
  const knee = new THREE.Group(); // pivot au genou
  knee.position.set(0, -0.42, 0);
  const stripe = mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.07, 10), mat.accent, 0, -0.03, 0);
  const calf = mesh(new THREE.CapsuleGeometry(0.095, 0.22, 4, 10), mat.socks, 0, -0.19, 0);
  const boot = mesh(new THREE.BoxGeometry(0.22, 0.14, 0.3), mat.boot, 0, -0.49, -0.03);
  const toe = mesh(new THREE.BoxGeometry(0.2, 0.1, 0.14), mat.boot, 0, -0.51, -0.22);
  const sole = mesh(new THREE.BoxGeometry(0.22, 0.04, 0.44), mat.bootSole, 0, -0.565, -0.09);
  knee.add(stripe, calf, boot, toe, sole);
  hip.add(knee);
  hip.userData.knee = knee;
  return hip;
}

function buildHair(nation, hairMat) {
  const grp = new THREE.Group();
  const y = 1.26;
  if (nation.hairStyle === 'curly') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const s = mesh(new THREE.SphereGeometry(0.12, 8, 7), hairMat, Math.cos(a) * 0.14, y + 0.16 + Math.sin(i * 2.1) * 0.03, Math.sin(a) * 0.13 + 0.03);
      grp.add(s);
    }
    grp.add(mesh(new THREE.SphereGeometry(0.16, 8, 7), hairMat, 0, y + 0.2, 0.02));
  } else if (nation.hairStyle === 'quiff') {
    const cap = mesh(new THREE.SphereGeometry(0.27, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat, 0, y + 0.035, 0.03);
    const quiff = mesh(new THREE.SphereGeometry(0.11, 8, 7), hairMat, 0, y + 0.24, -0.13);
    quiff.scale.set(1.4, 0.8, 1);
    grp.add(cap, quiff);
  } else { // crew
    const cap = mesh(new THREE.SphereGeometry(0.27, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat, 0, y + 0.02, 0.02);
    cap.scale.set(1, 0.82, 1);
    grp.add(cap);
  }
  return grp;
}

function buildArrow() {
  const red = new THREE.MeshLambertMaterial({ color: 0xe32222, emissive: 0x6b0a0a });
  const grp = new THREE.Group();
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 4), red);
  head.rotation.x = Math.PI; // pointe vers le bas
  head.rotation.y = Math.PI / 4;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.8, 0.48), red);
  shaft.position.y = 0.78;
  grp.add(head, shaft);
  return grp;
}
