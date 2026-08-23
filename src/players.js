// Tireurs « héros d'arcade » : cou, buste en V, bras biceps/avant-bras et
// vraies mains, jambes longues aux mollets galbés, crampons — un rig complet
// (buste, cou, épaules, coudes, hanches, genoux) anime frappe avec
// follow-through, célébrations signature par nation, réactions, regard qui
// suit le ballon et visages à humeurs. L'identification passe par les
// maillots et le HUD : rien ne flotte au-dessus des têtes.
import * as THREE from 'three';
import {
  flagBadgeTexture, numberTexture, faceTexture, clothTexture,
} from './assets.js';

const PLANK_T = 0.14; // épaisseur d'une planche
const CELEB_T = 1.6; // durée d'une célébration signature
const REACT_T = 1.7; // durée d'une réaction (dépit, ronchon)

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
    this.reactT = -1;
    this.falling = null;
    this.withPlanks = opts.planks !== false;
    // pose de visée (penché du côté visé) et regard
    this.aimYaw = 0;
    this.aimBlend = 0;
    this.lookTarget = null;
    this.gazeT = 1 + Math.random() * 2;
    this.gazeYaw = 0;
    this.mood = 'neutral';
    this.moodHold = 0;

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

    this.figure = buildFigure(nation, { captain: isPlayer });
    this.figure.position.y = this.figureY;
    // gabarit propre à la nation : taille et carrure (origine aux pieds)
    const b = nation.build || { h: 1, w: 1 };
    this.figure.scale.set(b.w, b.h, b.w);
    this.group.add(this.figure);

    // ombre de contact : assoit le personnage sur son toit, même de nuit
    this.blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({
        map: blobShadowTexture(), transparent: true, opacity: 0.3, depthWrite: false,
      }),
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.02;
    this.group.add(this.blob);
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

  // pose de visée : penché du côté visé, genoux fléchis, bras en balancier
  // (yaw = null quand ce tireur n'est pas en train de viser)
  setAimPose(yaw) {
    this.aimActive = yaw !== null && yaw !== undefined;
    if (this.aimActive) this.aimYaw = yaw;
  }

  // le visage raconte l'état : focus (visée), joie, dépit, panique
  setMood(mood, hold = 0) {
    this.moodHold = hold;
    if (mood === this.mood) return;
    this.mood = mood;
    const f = this.figure.userData.faceMesh;
    f.material.map = faceTexture(mood);
    f.material.needsUpdate = true;
  }

  celebrate() {
    this.celebrateT = 0;
    this.reactT = -1;
    this.celebrateKind = this.nation.celebration || 'arms';
    // sur la marche étroite du podium, pas de glissade ni de grand saut :
    // on remplace par un geste sur place de la même énergie
    if (this.podiumMode) {
      if (this.celebrateKind === 'slide') this.celebrateKind = 'point';
      if (this.celebrateKind === 'leap') this.celebrateKind = 'jump';
    }
    this.setMood('joy', CELEB_T + 0.8);
  }

  // réaction hors célébration : 'dismay' (mains sur la tête après un raté),
  // 'grumble' (bras croisés quand un rival marque)
  react(kind) {
    if (this.celebrateT >= 0 || this.kickT >= 0 || this.falling) return;
    this.reactT = 0;
    this.reactKind = kind;
  }

  breakPlank(fx) {
    this.lives -= 1;
    const plank = this.planks.pop();
    if (plank) {
      const world = plank.getWorldPosition(new THREE.Vector3());
      this.planksGroup.remove(plank);
      fx.tumble(plank, world, new THREE.Vector3((Math.random() - 0.5) * 5, 4 + Math.random() * 2, 2 + Math.random() * 2));
    }
    this.hopT = 0;
    this.setMood('sad', 2.2);
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
    this.setMood('panic', 9);
    this.blob.visible = false;
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

    // humeur événement à durée limitée, puis retour au neutre
    if (this.moodHold > 0) {
      this.moodHold -= dt;
      if (this.moodHold <= 0 && this.mood !== 'neutral') this.setMood('neutral');
    }
    // la concentration s'affiche pendant la visée (sans écraser joie/dépit)
    if (this.aimActive && this.moodHold <= 0 && this.mood !== 'focus') this.setMood('focus');
    if (!this.aimActive && this.mood === 'focus') this.setMood('neutral');
    this.aimBlend += ((this.aimActive ? 1 : 0) - this.aimBlend) * Math.min(1, dt * 7);

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
      y += celebYOffset(this.celebrateKind, this.celebrateT);
      if (this.celebrateT > CELEB_T) {
        this.celebrateT = -1;
        this.figure.rotation.y = 0; // fin de toupie : on se remet face au but
        this.figure.position.z = 0; // fin de glissade : retour au point de départ
      }
    }
    this.figure.position.y = y;

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
      j.body.rotation.z = pose.bodyZ || 0;
      j.lSh.rotation.x = pose.lSh || 0;
      j.rSh.rotation.x = pose.rSh || 0;
      j.lEl.rotation.x = pose.lEl || 0;
      j.rEl.rotation.x = pose.rEl || 0;
      // -0.06/+0.06 : bras légèrement écartés au repos
      j.lSh.rotation.z = (pose.lShZ || 0) - 0.06;
      j.rSh.rotation.z = (pose.rShZ || 0) + 0.06;
    };
    // le cou est piloté à part : regard, hochements — lissé pour rester vivant
    const neckTo = (yaw, pitch, k = 6) => {
      j.neck.rotation.y += (yaw - j.neck.rotation.y) * Math.min(1, dt * k);
      j.neck.rotation.x += (pitch - j.neck.rotation.x) * Math.min(1, dt * k);
    };

    if (this.celebrateT >= 0) {
      this.animateCelebration(set, neckTo);
      return;
    }

    if (this.kickT >= 0) {
      this.kickT += dt;
      const k = this.kickT;
      let p;
      if (k < 0.14) { // armé : jambe fouettée en arrière, buste vissé, bras ouverts
        const u = k / 0.14;
        p = {
          rHip: -1.25 * u, rKnee: -1.7 * u, lKnee: -0.3 * u,
          lean: 0.2 * u, twist: -0.3 * u, bodyZ: 0.1 * u,
          lSh: 0.9 * u, rSh: -0.85 * u, lEl: 0.45 * u, rEl: 0.35 * u,
        };
      } else if (k < 0.26) { // frappe : la jambe fouette, le buste pivote
        const u = (k - 0.14) / 0.12;
        p = {
          rHip: -1.25 + 2.85 * u, rKnee: -1.7 + 1.65 * u, lKnee: -0.3 + 0.12 * u,
          lean: 0.2 - 0.42 * u, twist: -0.3 + 0.7 * u, bodyZ: 0.1 - 0.22 * u,
          lSh: 0.9 - 1.7 * u, rSh: -0.85 + 1.45 * u,
          lEl: 0.45 - 0.35 * u, rEl: 0.35 - 0.25 * u,
        };
      } else if (k < 0.55) { // follow-through tenu : jambe haute, buste tourné
        const u = (k - 0.26) / 0.29;
        p = {
          rHip: 1.6 - 0.5 * u, rKnee: -0.05 - 0.15 * u, lKnee: -0.18,
          lean: -0.22 + 0.06 * u, twist: 0.4 - 0.1 * u, bodyZ: -0.12 + 0.04 * u,
          lSh: -0.8 + 0.2 * u, rSh: 0.6 - 0.1 * u, lEl: 0.1, rEl: 0.1,
        };
      } else if (k < 1.0) { // retour élastique
        const u = (k - 0.55) / 0.45;
        const e = 1 - (1 - u) * (1 - u);
        const f = 1 - e;
        p = {
          rHip: 1.1 * f, rKnee: -0.2 * f, lKnee: -0.18 * f,
          lean: -0.16 * f, twist: 0.3 * f, bodyZ: -0.08 * f,
          lSh: -0.6 * f, rSh: 0.5 * f, lEl: 0.1 * f, rEl: 0.1 * f,
        };
      } else {
        this.kickT = -1;
        p = {};
      }
      set(p);
      this.applyLook(neckTo, dt, t, 8);
      return;
    }

    if (this.reactT >= 0) {
      this.reactT += dt;
      const r = this.reactT;
      const u = Math.min(1, r * 4);
      const out = Math.max(0, (r - REACT_T + 0.35) / 0.35); // fondu de sortie
      const w = u * (1 - out);
      if (this.reactKind === 'dismay') {
        // les deux mains sur la tête, buste qui bascule
        const rock = Math.sin(r * 5) * 0.08 * (1 - out);
        set({
          lShZ: -2.5 * w, rShZ: 2.5 * w, lEl: -1.9 * w, rEl: -1.9 * w,
          lean: -0.1 * w + rock, lKnee: -0.12 * w, rKnee: -0.12 * w,
        });
        neckTo(0, 0.3 * w, 5);
      } else {
        // bras croisés, tête secouée : non non non
        set({
          lSh: 0.95 * w, rSh: 0.95 * w, lEl: 1.65 * w, rEl: 1.65 * w,
          lShZ: 0.5 * w, rShZ: -0.5 * w, lean: 0.06 * w,
        });
        neckTo(Math.sin(r * 9) * 0.2 * w, 0.1 * w, 10);
      }
      if (r > REACT_T) this.reactT = -1;
      return;
    }

    // attitude au repos : balancement discret, coudes semi-fléchis,
    // micro-transferts d'appui — la rangée de tireurs respire
    const s = Math.sin(t * 2 + this.homeX);
    const s2 = Math.sin(t * 0.7 + this.homeX * 2.3);
    const idle = {
      rHip: s * 0.04, lHip: -s * 0.04,
      rKnee: Math.max(0, s2) * -0.08, lKnee: Math.max(0, -s2) * -0.08,
      lean: Math.sin(t * 1.6 + this.homeX) * 0.03,
      twist: s2 * 0.04,
      bodyZ: Math.sin(t * 0.9 + this.homeX * 1.7) * 0.025,
      lSh: s * 0.08, rSh: -s * 0.08,
      lEl: 0.25 + s * 0.04, rEl: 0.25 - s * 0.04,
    };
    // pose de visée mélangée à l'attitude : penché du côté visé, appuis fléchis
    const b = this.aimBlend;
    if (b > 0.01) {
      const sway = Math.max(-0.28, Math.min(0.28, -this.aimYaw * 0.55)) * b;
      idle.lean = idle.lean * (1 - b) + 0.15 * b;
      idle.bodyZ = idle.bodyZ * (1 - b) + sway;
      idle.rKnee = idle.rKnee * (1 - b) - 0.16 * b;
      idle.lKnee = idle.lKnee * (1 - b) - 0.16 * b;
      idle.lShZ = -0.4 * b;
      idle.rShZ = 0.4 * b;
      idle.lEl = idle.lEl * (1 - b) + 0.5 * b;
      idle.rEl = idle.rEl * (1 - b) + 0.5 * b;
    }
    set(idle);
    this.applyLook(neckTo, dt, t, 6);
  }

  // regard : suit lookTarget (ballon en vol, ballon visé), sinon la tête
  // se promène — un coup d'œil au vide, aux rivaux, droit devant
  applyLook(neckTo, dt, t, k) {
    if (this.lookTarget) {
      const j = this.figure.userData;
      const headY = this.group.position.y + this.figureY
        + 2.1 * ((this.nation.build && this.nation.build.h) || 1);
      const dx = this.lookTarget.x - this.group.position.x;
      const dy = this.lookTarget.y - headY;
      const dz = this.lookTarget.z - this.group.position.z;
      // repère local : on retranche l'orientation du groupe et de la figure
      const rotY = this.group.rotation.y + this.figure.rotation.y;
      const cos = Math.cos(-rotY);
      const sin = Math.sin(-rotY);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      const yaw = Math.max(-0.85, Math.min(0.85, Math.atan2(lx, -lz)));
      const pitch = Math.max(-0.6, Math.min(0.5, -Math.atan2(dy, Math.hypot(lx, lz))));
      // le buste accompagne légèrement le regard
      neckTo(yaw, pitch, k);
      j.body.rotation.y += yaw * 0.06;
      return;
    }
    // errance du regard
    this.gazeT -= dt;
    if (this.gazeT <= 0) {
      this.gazeT = 1.5 + Math.random() * 3;
      this.gazeYaw = (Math.random() - 0.5) * 1.0;
    }
    neckTo(this.gazeYaw, Math.sin(t * 0.8 + this.homeX) * 0.05, 3);
  }

  // les gestes signature — un par nation
  animateCelebration(set, neckTo) {
    const c = this.celebrateT;
    const u = Math.min(1, c * 5);
    const kind = this.celebrateKind;
    if (kind === 'punch') {
      // poing pompé, buste cambré (Angleterre)
      const pump = Math.sin(c * 9) * 0.25;
      set({
        rShZ: (2.9 + pump) * u, rEl: -1.6 * u,
        lSh: 0.5 * u, lEl: 0.6 * u,
        lean: -0.18 * u, twist: 0.25 * u,
      });
      neckTo(0, -0.25 * u, 6);
    } else if (kind === 'spin') {
      // toupie bras ouverts (Brésil)
      this.figure.rotation.y = c * 6.5;
      set({ lShZ: -1.5 * u, rShZ: 1.5 * u, lean: -0.08 * u });
      neckTo(0, -0.1 * u, 6);
    } else if (kind === 'point') {
      // l'index vers le ciel, l'autre main sur la hanche (Italie)
      set({
        rShZ: 2.95 * u, rEl: -0.15 * u,
        lShZ: -0.55 * u, lEl: 1.5 * u,
        lean: -0.14 * u, twist: 0.2 * u,
      });
      neckTo(0.15 * u, -0.42 * u, 5);
    } else if (kind === 'dance') {
      // déhanché, bras pliés alternés (Espagne)
      const d = Math.sin(c * 8);
      set({
        bodyZ: d * 0.18 * u, twist: -d * 0.2 * u, lean: -0.06 * u,
        lSh: (0.4 + d * 0.5) * u, rSh: (0.4 - d * 0.5) * u,
        lEl: -1.2 * u, rEl: -1.2 * u,
        lShZ: -0.5 * u, rShZ: 0.5 * u,
        lHip: d * 0.1 * u, rHip: -d * 0.1 * u,
      });
      neckTo(d * 0.15 * u, 0, 8);
    } else if (kind === 'slide') {
      // glissade à genoux, bras ouverts, buste cambré (France)
      const gl = Math.min(1, c / 0.45); // avancée de la glissade
      const e = 1 - (1 - gl) * (1 - gl);
      this.figure.position.z = -e * 0.75;
      set({
        rHip: -1.35 * u, lHip: -1.35 * u, rKnee: -1.45 * u, lKnee: -1.45 * u,
        lean: -0.3 * u, lShZ: -2.1 * u, rShZ: 2.1 * u,
        lEl: -0.2 * u, rEl: -0.2 * u,
      });
      neckTo(0, -0.35 * u, 6);
    } else if (kind === 'jump') {
      // sauts groupés, poings serrés (Argentine)
      set({
        lSh: -0.7 * u, rSh: -0.7 * u, lEl: -1.7 * u, rEl: -1.7 * u,
        lean: 0.08 * u,
        lKnee: -0.35 * u, rKnee: -0.35 * u, lHip: -0.25 * u, rHip: -0.25 * u,
      });
      neckTo(0, -0.15 * u, 8);
    } else if (kind === 'leap') {
      // saut pirouette, atterrissage bras écartés buste penché (Portugal)
      if (c < 0.75) {
        const p = c / 0.75;
        this.figure.rotation.y = p * Math.PI * 2;
        set({
          lShZ: -1.2 * u, rShZ: 1.2 * u,
          lKnee: -0.6 * u, rKnee: -0.6 * u, lHip: -0.4 * u, rHip: -0.4 * u,
        });
      } else {
        this.figure.rotation.y = 0;
        const p = Math.min(1, (c - 0.75) / 0.2);
        set({
          lShZ: -2.3 * p, rShZ: 2.3 * p, lEl: 0.3 * p, rEl: 0.3 * p,
          lean: 0.32 * p, lHip: -0.5 * p, rHip: -0.5 * p,
          lKnee: -0.35 * p, rKnee: -0.35 * p, twist: 0.06 * p,
        });
        neckTo(0, 0.15 * p, 8);
      }
    } else {
      // bras au ciel ! (Allemagne)
      set({
        lShZ: -2.6 * u, rShZ: 2.6 * u,
        lean: -0.12 * u,
        lEl: -0.2 * u, rEl: -0.2 * u,
      });
      neckTo(0, -0.3 * u, 6);
    }
  }
}

// décalage vertical propre à chaque célébration (sauts, glissade au sol…)
function celebYOffset(kind, c) {
  const u = Math.min(1, c * 5);
  if (kind === 'slide') return -Math.min(1, c / 0.45) * 0.42;
  if (kind === 'jump') return Math.abs(Math.sin(c * 10)) * 0.34 * u;
  if (kind === 'leap') {
    if (c < 0.75) return Math.sin((c / 0.75) * Math.PI) * 0.85;
    return 0;
  }
  if (kind === 'spin' || kind === 'dance') return Math.abs(Math.sin(c * 9)) * 0.16 * u;
  return Math.abs(Math.sin(c * 9)) * 0.3 * u;
}

// ---------------------------------------------------------------- figure --
// Silhouette héros d'arcade face au but (-z) ; la caméra voit le dos et le
// numéro. Exportée : le gardien de but du Duel réutilise le même constructeur.
export function buildFigure(nation, opts = {}) {
  const g = new THREE.Group();
  const mat = {
    shirt: new THREE.MeshLambertMaterial({ color: 0xffffff, map: clothTexture(nation.shirt) }),
    shorts: new THREE.MeshLambertMaterial({ color: nation.shorts }),
    socks: new THREE.MeshLambertMaterial({ color: nation.socks }),
    accent: new THREE.MeshLambertMaterial({ color: nation.accent }),
    skin: new THREE.MeshLambertMaterial({ color: nation.skin }),
    hair: new THREE.MeshLambertMaterial({ color: nation.hair }),
    boot: new THREE.MeshLambertMaterial({ color: 0x23262c }),
    bootSole: new THREE.MeshLambertMaterial({ color: 0x111318 }),
    stud: new THREE.MeshLambertMaterial({ color: 0x3a3f47 }),
    gloves: !!nation.gloves,
  };

  // ------------------------------------------------------------- buste ----
  const body = new THREE.Group();
  body.position.y = 1.14; // pivot aux hanches
  g.add(body);

  const hips = mesh(new THREE.BoxGeometry(0.54, 0.3, 0.36), mat.shorts, 0, 0.13, 0);
  const belt = mesh(new THREE.BoxGeometry(0.55, 0.05, 0.37), mat.accent, 0, 0.29, 0);
  const hemL = mesh(new THREE.BoxGeometry(0.23, 0.06, 0.37), mat.accent, -0.155, -0.02, 0);
  const hemR = mesh(new THREE.BoxGeometry(0.23, 0.06, 0.37), mat.accent, 0.155, -0.02, 0);
  // bandes latérales du short : la tenue gagne en lecture de profil
  const sideL = mesh(new THREE.BoxGeometry(0.02, 0.3, 0.28), mat.accent, -0.28, 0.13, 0);
  const sideR = mesh(new THREE.BoxGeometry(0.02, 0.3, 0.28), mat.accent, 0.28, 0.13, 0);
  body.add(sideL, sideR, belt);
  // taille fine → épaules larges : le V du buste
  const waist = mesh(new THREE.CylinderGeometry(0.31, 0.24, 0.3, 14), mat.shirt, 0, 0.44, 0);
  waist.scale.z = 0.72;
  const chest = mesh(new THREE.CapsuleGeometry(0.29, 0.24, 6, 14), mat.shirt, 0, 0.66, 0);
  chest.scale.set(1.28, 1, 0.76);
  const collar = mesh(new THREE.CylinderGeometry(0.115, 0.13, 0.06, 12), mat.accent, 0, 0.94, 0);
  const shoulderL = mesh(new THREE.SphereGeometry(0.145, 10, 8), mat.shirt, -0.36, 0.84, 0);
  const shoulderR = mesh(new THREE.SphereGeometry(0.145, 10, 8), mat.shirt, 0.36, 0.84, 0);
  // cou : la tête ne sort plus directement des épaules
  const neckSkin = mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.14, 10), mat.skin, 0, 1.0, 0);
  body.add(hips, hemL, hemR, waist, chest, collar, shoulderL, shoulderR, neckSkin);

  // écusson au torse (côté cœur) + numéro dans le dos
  const crest = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.15),
    new THREE.MeshBasicMaterial({ map: flagBadgeTexture(nation.id), transparent: true }),
  );
  crest.position.set(0.14, 0.74, -0.25);
  crest.rotation.y = Math.PI;
  const num = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: numberTexture(nation.number, nation.numColor), transparent: true }),
  );
  num.position.set(0, 0.6, 0.255);
  body.add(crest, num);

  // ------------------------------------------------- tête (pivot du cou) --
  const neck = new THREE.Group();
  neck.position.set(0, 1.06, 0);
  const head = mesh(new THREE.SphereGeometry(0.27, 16, 13), mat.skin, 0, 0.2, 0);
  const faceMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.44),
    new THREE.MeshBasicMaterial({ map: faceTexture('neutral'), transparent: true }),
  );
  faceMesh.position.set(0, 0.2, -0.255);
  faceMesh.rotation.y = Math.PI;
  neck.add(head, faceMesh, buildHair(nation, mat.hair, 0.2));
  body.add(neck);

  // ---------------------------------------------------------------- bras --
  const lSh = limbArm(mat, opts.captain && true);
  lSh.position.set(-0.42, 0.84, 0);
  const rSh = limbArm(mat, false);
  rSh.position.set(0.42, 0.84, 0);
  body.add(lSh, rSh);

  // -------------------------------------------------------------- jambes --
  const lHip = limbLeg(mat);
  lHip.position.set(-0.17, 1.14, 0);
  const rHip = limbLeg(mat);
  rHip.position.set(0.17, 1.14, 0);
  g.add(lHip, rHip);

  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.userData = {
    body, neck, faceMesh,
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

function limbArm(mat, captain) {
  const shoulder = new THREE.Group(); // pivot à l'épaule
  // biceps plus rond que l'avant-bras : le bras a une vraie anatomie
  const upper = mesh(new THREE.CapsuleGeometry(0.095, 0.15, 4, 10), mat.shirt, 0, -0.12, 0);
  const sleeve = mesh(new THREE.CylinderGeometry(0.09, 0.096, 0.05, 10), mat.accent, 0, -0.225, 0);
  shoulder.add(upper, sleeve);
  if (captain) {
    // brassard de capitaine sur le biceps : c'est vous
    const band = mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.07, 10), new THREE.MeshLambertMaterial({ color: 0xf5c542 }), 0, -0.12, 0);
    shoulder.add(band);
  }
  const elbow = new THREE.Group(); // pivot au coude
  elbow.position.set(0, -0.3, 0);
  const forearm = mesh(new THREE.CapsuleGeometry(0.068, 0.15, 4, 10), mat.skin, 0, -0.1, 0);
  const wrist = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.045, 8), mat.accent, 0, -0.185, 0);
  // vraie main (mitaine) — gantée à l'accent pour le gardien
  const hand = mesh(new THREE.SphereGeometry(0.082, 8, 7), mat.gloves ? mat.accent : mat.skin, 0, -0.25, 0);
  hand.scale.set(1, 0.82, 1.25);
  elbow.add(forearm, wrist, hand);
  shoulder.add(elbow);
  shoulder.userData.elbow = elbow;
  return shoulder;
}

function limbLeg(mat) {
  const hip = new THREE.Group(); // pivot à la hanche
  const thigh = mesh(new THREE.CapsuleGeometry(0.12, 0.26, 4, 10), mat.skin, 0, -0.21, 0);
  hip.add(thigh);
  const knee = new THREE.Group(); // pivot au genou
  knee.position.set(0, -0.48, 0);
  // chaussette : deux liserés d'accent en haut du mollet galbé
  const cuff = mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 10), mat.accent, 0, -0.025, 0);
  const band2 = mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.035, 10), mat.accent, 0, -0.095, 0);
  const calf = mesh(new THREE.CapsuleGeometry(0.092, 0.2, 4, 10), mat.socks, 0, -0.2, 0);
  calf.scale.set(1, 1, 1.12); // galbe du mollet
  const ankle = mesh(new THREE.CylinderGeometry(0.062, 0.058, 0.08, 8), mat.socks, 0, -0.38, 0);
  const boot = mesh(new THREE.BoxGeometry(0.2, 0.13, 0.28), mat.boot, 0, -0.47, -0.03);
  const toe = mesh(new THREE.BoxGeometry(0.18, 0.095, 0.14), mat.boot, 0, -0.49, -0.21);
  const sole = mesh(new THREE.BoxGeometry(0.2, 0.04, 0.42), mat.bootSole, 0, -0.55, -0.08);
  knee.add(cuff, band2, calf, ankle, boot, toe, sole);
  // crampons : trois à l'avant, deux au talon
  for (const [sx, sz] of [[-0.06, -0.22], [0.06, -0.22], [0, -0.13], [-0.06, 0.06], [0.06, 0.06]]) {
    knee.add(mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.035, 6), mat.stud, sx, -0.585, sz - 0.08));
  }
  hip.add(knee);
  hip.userData.knee = knee;
  return hip;
}

function buildHair(nation, hairMat, y) {
  const grp = new THREE.Group();
  if (nation.hairStyle === 'curly') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const s = mesh(new THREE.SphereGeometry(0.12, 8, 7), hairMat, Math.cos(a) * 0.15, y + 0.17 + Math.sin(i * 2.1) * 0.03, Math.sin(a) * 0.14 + 0.03);
      grp.add(s);
    }
    grp.add(mesh(new THREE.SphereGeometry(0.17, 8, 7), hairMat, 0, y + 0.21, 0.02));
  } else if (nation.hairStyle === 'quiff') {
    const cap = mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat, 0, y + 0.035, 0.03);
    const quiff = mesh(new THREE.SphereGeometry(0.115, 8, 7), hairMat, 0, y + 0.25, -0.135);
    quiff.scale.set(1.4, 0.8, 1);
    grp.add(cap, quiff);
  } else if (nation.hairStyle === 'dreads') {
    // dreads courtes : calotte + mèches qui retombent sur la nuque
    const cap = mesh(new THREE.SphereGeometry(0.285, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat, 0, y + 0.03, 0.02);
    grp.add(cap);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI - Math.PI / 2;
      const d = mesh(new THREE.CapsuleGeometry(0.035, 0.14, 3, 6), hairMat,
        Math.sin(a) * 0.2, y + 0.06, Math.cos(a) * 0.16 + 0.1);
      d.rotation.x = 0.35;
      grp.add(d);
    }
  } else if (nation.hairStyle === 'bun') {
    // chignon haut sur cheveux plaqués
    const cap = mesh(new THREE.SphereGeometry(0.275, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat, 0, y + 0.025, 0.02);
    const bun = mesh(new THREE.SphereGeometry(0.1, 8, 7), hairMat, 0, y + 0.3, 0.09);
    bun.scale.set(1, 0.85, 1);
    grp.add(cap, bun);
  } else { // crew
    const cap = mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat, 0, y + 0.02, 0.02);
    cap.scale.set(1, 0.82, 1);
    grp.add(cap);
  }
  return grp;
}

// ombre de contact douce (radiale), partagée par tous les tireurs
let BLOB_TEX = null;
function blobShadowTexture() {
  if (BLOB_TEX) return BLOB_TEX;
  const s = 64;
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(6,10,18,0.85)');
  grad.addColorStop(0.55, 'rgba(6,10,18,0.4)');
  grad.addColorStop(1, 'rgba(6,10,18,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  BLOB_TEX = new THREE.CanvasTexture(c);
  BLOB_TEX.userData.shared = true;
  return BLOB_TEX;
}
