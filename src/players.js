// Tireurs : silhouettes low-poly en primitives, planches, badge drapeau, flèche.
import * as THREE from 'three';
import { flagBadgeTexture, numberTexture } from './assets.js';

const PLANK_T = 0.14; // épaisseur d'une planche

export class Shooter {
  constructor(scene, nation, x, isPlayer) {
    this.nation = nation;
    this.isPlayer = isPlayer;
    this.homeX = x;
    this.alive = true;
    this.lives = 3;
    this.score = 0;
    this.kickT = -1;
    this.hopT = -1;
    this.falling = null;
    this.baseY = 0;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, 3.5);
    scene.add(this.group);

    this.planks = [];
    this.planksGroup = new THREE.Group();
    this.group.add(this.planksGroup);
    for (let i = 0; i < 5; i++) {
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
    this.figureY = this.pileTop();

    this.figure = buildFigure(nation);
    this.figure.position.y = this.figureY;
    this.group.add(this.figure);

    // badge drapeau flottant
    this.badge = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flagBadgeTexture(nation.id), transparent: true, depthWrite: false,
    }));
    this.badge.scale.set(1.35, 1.35, 1);
    this.badge.position.set(0, 3.6, 0);
    this.group.add(this.badge);

    if (isPlayer) {
      this.arrow = buildArrow();
      this.arrow.position.set(0, 5.15, 0.5);
      this.group.add(this.arrow);
    }
  }

  pileTop() { return this.planks.length * PLANK_T; }

  // position de départ du ballon, posé sur la pelouse devant le tireur
  ballStart(r) { return new THREE.Vector3(this.homeX, r, 2.9); }

  startKick() { this.kickT = 0; }

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
    // les planches restantes volent en éclats
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
    this.figure.position.y = y;

    this.badge.position.y = 3.6 + Math.sin(t * 1.7 + this.homeX * 2) * 0.08;
    if (this.arrow) {
      this.arrow.position.y = 5.15 + Math.sin(t * 3) * 0.22;
    }

    // animation de frappe
    const f = this.figure.userData;
    if (this.kickT >= 0) {
      this.kickT += dt;
      const k = this.kickT;
      let leg = 0, lean = 0, arm = 0;
      if (k < 0.16) { // armé
        const u = k / 0.16;
        leg = u * 1.05; lean = u * 0.14; arm = u * 0.9;
      } else if (k < 0.27) { // frappe
        const u = (k - 0.16) / 0.11;
        leg = 1.05 - u * 2.5; lean = 0.14 - u * 0.26; arm = 0.9 - u * 1.3;
      } else if (k < 0.85) { // retour
        const u = (k - 0.27) / 0.58;
        const e = 1 - (1 - u) * (1 - u);
        leg = -1.45 * (1 - e); lean = -0.12 * (1 - e); arm = -0.4 * (1 - e);
      } else {
        this.kickT = -1;
      }
      f.rightLeg.rotation.x = leg;
      f.body.rotation.x = lean;
      f.leftArm.rotation.x = arm;
      f.rightArm.rotation.x = -arm * 0.7;
    } else {
      f.rightLeg.rotation.x = Math.sin(t * 2 + this.homeX) * 0.04;
      f.body.rotation.x = Math.sin(t * 1.6 + this.homeX) * 0.03;
      f.leftArm.rotation.x = Math.sin(t * 2.1 + this.homeX) * 0.08;
      f.rightArm.rotation.x = -Math.sin(t * 2.1 + this.homeX) * 0.08;
    }
  }
}

// Silhouette trapue face au but (-z) ; la caméra voit le dos et le numéro.
function buildFigure(nation) {
  const g = new THREE.Group();
  const mats = {
    shirt: new THREE.MeshLambertMaterial({ color: nation.shirt }),
    shorts: new THREE.MeshLambertMaterial({ color: nation.shorts }),
    socks: new THREE.MeshLambertMaterial({ color: nation.socks }),
    skin: new THREE.MeshLambertMaterial({ color: nation.skin }),
    hair: new THREE.MeshLambertMaterial({ color: nation.hair }),
    boot: new THREE.MeshLambertMaterial({ color: 0x23262c }),
  };

  const body = new THREE.Group();
  body.position.y = 0.98; // pivot aux hanches
  g.add(body);

  const hips = mesh(new THREE.BoxGeometry(0.62, 0.3, 0.4), mats.shorts, 0, 0.05, 0);
  const torso = mesh(new THREE.BoxGeometry(0.66, 0.72, 0.42), mats.shirt, 0, 0.56, 0);
  const head = mesh(new THREE.SphereGeometry(0.27, 14, 12), mats.skin, 0, 1.16, 0);
  const hair = mesh(new THREE.SphereGeometry(0.28, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.hair, 0, 1.19, 0.03);
  body.add(hips, torso, head, hair);

  // numéro dans le dos (face à la caméra)
  const num = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: numberTexture(nation.number, nation.numColor), transparent: true }),
  );
  num.position.set(0, 0.58, 0.22);
  body.add(num);

  const leftArm = limb(mats.shirt, mats.skin, 0.34);
  leftArm.position.set(-0.42, 0.82, 0);
  const rightArm = limb(mats.shirt, mats.skin, 0.34);
  rightArm.position.set(0.42, 0.82, 0);
  body.add(leftArm, rightArm);

  const leftLeg = leg(mats);
  leftLeg.position.set(-0.17, 0.98, 0);
  const rightLeg = leg(mats);
  rightLeg.position.set(0.17, 0.98, 0);
  g.add(leftLeg, rightLeg);

  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  g.userData = { body, leftArm, rightArm, leftLeg, rightLeg };
  return g;
}

function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

function limb(shirtMat, skinMat, len) {
  const grp = new THREE.Group(); // pivot à l'épaule
  grp.add(mesh(new THREE.BoxGeometry(0.18, len, 0.2), shirtMat, 0, -len / 2 + 0.04, 0));
  grp.add(mesh(new THREE.BoxGeometry(0.16, 0.26, 0.18), skinMat, 0, -len - 0.06, 0));
  return grp;
}

function leg(mats) {
  const grp = new THREE.Group(); // pivot à la hanche
  grp.add(mesh(new THREE.BoxGeometry(0.22, 0.36, 0.24), mats.skin, 0, -0.24, 0));   // cuisse
  grp.add(mesh(new THREE.BoxGeometry(0.2, 0.4, 0.22), mats.socks, 0, -0.6, 0));     // mollet + chaussette
  grp.add(mesh(new THREE.BoxGeometry(0.24, 0.16, 0.42), mats.boot, 0, -0.86, -0.08)); // crampon
  return grp;
}

function buildArrow() {
  const red = new THREE.MeshLambertMaterial({ color: 0xe32222, emissive: 0x6b0a0a });
  const grp = new THREE.Group();
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 4), red);
  head.rotation.x = Math.PI; // pointe vers le bas
  head.rotation.y = Math.PI / 4;
  head.position.y = 0;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.8, 0.48), red);
  shaft.position.y = 0.78;
  grp.add(head, shaft);
  return grp;
}
