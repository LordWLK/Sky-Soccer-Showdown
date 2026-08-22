// Cœur du jeu : machine à états, balistique, IA, score, caméra.
import * as THREE from 'three';
import { NATIONS } from './nations.js';
import { Shooter } from './players.js';
import { ballTexture } from './assets.js';
import { ui } from './ui.js';
import { audio } from './audio.js';
import {
  TARGET_ROOF_Y, GOAL_W, GOAL_H, TARGET_HALF_W, buildCourse,
} from './world.js';
import { generateCourse, dateSeed } from './course.js';

const G = 18;                    // gravité arcade
const ELEV = (40 * Math.PI) / 180; // élévation des tirs : frappe tendue
const BALL_R = 0.38;
const POWER_MIN = 10;
const POWER_MAX = 36;
const DRAG_FULL = 0.62;          // fraction d'écran pour la puissance max
const ROUNDS_MAX = 8;
const ROUNDS_HARD_CAP = 14;      // au-delà : égalité
// Tournoi : trois duels courts (5 manches) de plus en plus relevés
const TOURNEY_STAGES = ['Quart de finale', 'Demi-finale', 'Finale'];
const TOURNEY_SHORT = ['Quart', 'Demie', 'Finale'];
const TOURNEY_AI = [1.05, 0.95, 0.85]; // dispersion des IA par tour (moins = mieux)
const SHOOTER_X = [-5, 0, 5];

// multiplicateurs de difficulté (choisis sur l'écran titre)
const DIFFS = {
  normal: { assist: 1.25, aiSig: 1.18, wind: 0.85, keeperFrom: 6, keeperSpeed: 0.75 },
  hard: { assist: 0.75, aiSig: 0.92, wind: 1.15, keeperFrom: 4, keeperSpeed: 1.0 },
};

// deux « clubs » : frappe tendue (par défaut) et cloche haute (Parcours)
const makeTrig = (rad) => ({ sin: Math.sin(rad), cos: Math.cos(rad), tan: Math.tan(rad) });
const T_TENDU = makeTrig(ELEV);
const T_CLOCHE = makeTrig((55 * Math.PI) / 180);
const sinE = T_TENDU.sin;
const cosE = T_TENDU.cos;
const tanE = T_TENDU.tan;

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(-2.5, Math.min(2.5, n));
}

// Vitesse initiale pour atteindre `target` depuis `start` à l'élévation donnée.
export function solveShot(start, target, trig = T_TENDU) {
  const dx = target.x - start.x;
  const dz = target.z - start.z;
  const dh = Math.hypot(dx, dz);
  const h = target.y - start.y;
  const denom = 2 * trig.cos * trig.cos * (dh * trig.tan - h);
  const v = Math.sqrt((G * dh * dh) / denom);
  const t = dh / (v * trig.cos);
  return { v, t, dirX: dx / dh, dirZ: dz / dh };
}

function velocityFrom(power, yaw, trig = T_TENDU) {
  return new THREE.Vector3(
    Math.sin(yaw) * trig.cos * power,
    trig.sin * power,
    -Math.cos(yaw) * trig.cos * power,
  );
}

function shotVector(s, trig = T_TENDU) {
  return new THREE.Vector3(s.dirX * trig.cos * s.v, trig.sin * s.v, s.dirZ * trig.cos * s.v);
}

export function createGame({ scene, camera, world, fx }) {
  const ballTex = ballTexture();
  const ballGeo = new THREE.SphereGeometry(BALL_R, 18, 14);

  const previewDots = [];
  for (let i = 0; i < 32; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.95 }),
    );
    dot.visible = false;
    scene.add(dot);
    previewDots.push(dot);
  }
  // anneau doré au point d'impact prévu (surface ou plan de but)
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.62, 26),
    new THREE.MeshBasicMaterial({
      color: 0xffe08a, transparent: true, opacity: 0.95,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  marker.visible = false;
  scene.add(marker);

  const game = {
    state: 'title',
    mode: 'duel',
    t: 0,
    round: 1,
    roundsMax: ROUNDS_MAX,   // 5 manches par match en Tournoi
    hardCap: ROUNDS_HARD_CAP,
    distStep: 4,             // recul de la cage par manche (7 en Tournoi)
    tournament: null,
    wind: 0,
    playerIdx: 0,
    golf: null,
    club: 'tendu',
    difficulty: 'normal',
    locals: null, // duel à 2 : indices roster des deux humains
    activeLocal: 0,
    shooters: [],
    balls: [],
    aiming: false,
    aimStart: { x: 0, y: 0 },
    aimPower: 0,
    aimYaw: 0,
    hintShown: false,
    windAnnounced: false,
    camPos: new THREE.Vector3(0, 7.5, 16),
    camLook: new THREE.Vector3(0, 2, -30),
  };

  // ------------------------------------------------------------ helpers ---

  const distanceForRound = (r) => Math.min(58, 26 + (r - 1) * game.distStep);
  const playerShooter = () => game.shooters[game.playerIdx];
  const playerBall = () => game.balls[game.playerIdx];
  const diff = () => DIFFS[game.difficulty] || DIFFS.normal;
  // duel à 2 : les deux locaux sont humains ; sinon, seul playerIdx l'est
  const isHuman = (s) => (game.locals
    ? game.locals.some((i) => game.shooters[i] === s)
    : s === playerShooter());
  // le tireur qui a la main pendant la phase de visée
  const aimIdx = () => (game.locals ? game.locals[game.activeLocal] : game.playerIdx);
  const aimShooter = () => game.shooters[aimIdx()];

  function rollWind() {
    if (game.round < 2) return 0;
    // trajectoires plus tendues = vols plus courts : vent renforcé d'autant ;
    // gradué sur la longueur du match (compressé sur les 5 manches du Tournoi)
    const prog = (game.round - 1) / Math.max(1, game.roundsMax - 1);
    const level = (prog < 0.4 ? 0.7 : prog < 0.7 ? 1.05 : 1.45) * diff().wind;
    const mag = level * (0.4 + Math.random() * 0.6);
    return Math.round(mag * (Math.random() < 0.5 ? -1 : 1) * 10) / 10;
  }

  function clearMatch() {
    // libère les ressources GPU propres au match (les rejouables fuiraient)
    for (const s of game.shooters) {
      scene.remove(s.group);
      s.group.traverse((m) => {
        if (m.isMesh || m.isSprite) {
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            if (m.material.map) m.material.map.dispose();
            m.material.dispose();
          }
        }
      });
    }
    for (const b of game.balls) {
      scene.remove(b.mesh);
      b.mesh.material.dispose(); // la géométrie et la texture sont partagées
    }
    game.shooters = [];
    game.balls = [];
    if (game.golf && game.golf.course) {
      game.golf.course.dispose();
      world.restoreCity();
    }
    game.golf = null;
    game.locals = null;
    game.keeperAnnounced = false;
    game.slowmo = 0;
    game.goalCamPoint = null;
    world.setDuelTargetVisible(true);
    world.setKeeper(false);
    world.setDayNight(0);
  }

  function makeBall(shooter) {
    const mesh = new THREE.Mesh(ballGeo, new THREE.MeshLambertMaterial({ map: ballTex }));
    mesh.castShadow = true;
    scene.add(mesh);
    return {
      mesh, shooter, vel: new THREE.Vector3(),
      state: 'idle', scored: false, resolved: true, t: 0,
      kickAt: -1, launchAt: -1, pendingVel: null,
    };
  }

  // Le joueur au centre, deux nations rivales tirées au sort à ses côtés :
  // la caméra est ainsi toujours exactement derrière votre tireur.
  function buildRoster(teamIdx) {
    const others = NATIONS.filter((_, i) => i !== teamIdx);
    for (let i = others.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [others[i], others[j]] = [others[j], others[i]];
    }
    game.roster = [others[0], NATIONS[teamIdx], others[1]];
    game.playerIdx = 1;
    ui.buildChips(game.roster, 1);
  }

  // paramètres du match courant ; le Tournoi joue des matchs plus courts
  // où la cage recule plus vite (mêmes distances finales, moins de manches)
  function setMatchFormat(roundsMax, distStep) {
    game.roundsMax = roundsMax;
    game.hardCap = roundsMax + 6;
    game.distStep = distStep;
  }

  function startMatch(teamIdx) {
    clearMatch();
    game.tournament = null;
    game.mode = 'duel';
    setMatchFormat(ROUNDS_MAX, 4);
    buildRoster(teamIdx);
    game.roster.forEach((nation, i) => {
      const s = new Shooter(scene, nation, SHOOTER_X[i], i === game.playerIdx);
      game.shooters.push(s);
      game.balls.push(makeBall(s));
    });
    game.round = 1;
    game.hintShown = false;
    game.windAnnounced = false;
    ui.startMatch();
    ui.updateChips(game.shooters);
    startRound();
  }

  // Duel local à 2 : J1 au centre, J2 à droite, une IA tirée au sort à gauche.
  function startMatch2(team1Idx, team2Idx) {
    clearMatch();
    game.tournament = null;
    game.mode = 'duel';
    setMatchFormat(ROUNDS_MAX, 4);
    let t2 = team2Idx;
    if (t2 === team1Idx) t2 = (team1Idx + 1) % NATIONS.length;
    const pool = NATIONS.filter((_, i) => i !== team1Idx && i !== t2);
    const ai = pool[(Math.random() * pool.length) | 0];
    game.roster = [ai, NATIONS[team1Idx], NATIONS[t2]];
    game.playerIdx = 1;
    game.locals = [1, 2];
    game.activeLocal = 0;
    ui.buildChips(game.roster, { 1: 'J1', 2: 'J2' });
    game.roster.forEach((nation, i) => {
      // pas de flèche « VOUS » à deux joueurs : les étiquettes J1/J2 suffisent
      const s = new Shooter(scene, nation, SHOOTER_X[i], game.locals.includes(i), { arrow: false });
      game.shooters.push(s);
      game.balls.push(makeBall(s));
    });
    game.round = 1;
    game.hintShown = false;
    game.windAnnounced = false;
    ui.startMatch();
    ui.updateChips(game.shooters);
    startRound();
  }

  function startRound() {
    game.state = 'intro';
    game.t = 0;
    game.wind = rollWind();
    world.setDistance(distanceForRound(game.round), game.round === 1);
    world.setDayNight(Math.min(1, (game.round - 1) / Math.max(1, game.roundsMax - 1)));
    // en finale de Tournoi, le gardien monte dès la manche 3 quoi qu'il arrive
    const keeperFrom = game.tournament && game.tournament.stage === 2
      ? Math.min(3, diff().keeperFrom) : diff().keeperFrom;
    const keeperOn = game.round >= keeperFrom;
    world.setKeeper(keeperOn, (1.5 + game.round * 0.12) * diff().keeperSpeed);
    if (keeperOn && !game.keeperAnnounced) {
      game.keeperAnnounced = true;
      ui.flash('Un gardien monte sur le toit ! 🧤', 'small', 2.3);
    }
    ui.setRound(game.round, game.roundsMax, game.round > game.roundsMax,
      game.tournament ? TOURNEY_SHORT[game.tournament.stage] : null);
    ui.setWind(game.wind);
    ui.flash(game.round > game.roundsMax ? '⚡ Mort subite !' : `Manche ${game.round}`, 'round', 1.4);
    if (game.wind && !game.windAnnounced) {
      game.windAnnounced = true;
      ui.flash('Le vent se lève… compensez !', 'small', 2.2);
    }
    for (const b of game.balls) {
      b.state = 'idle';
      b.scored = false;
      b.resolved = !b.shooter.alive;
      b.t = 0;
      b.kickAt = -1;
      b.launchAt = -1;
      b.mesh.visible = b.shooter.alive;
      if (b.shooter.alive) b.mesh.position.copy(b.shooter.ballStart(BALL_R));
    }
  }

  // repère de la jauge : puissance exacte pour le centre de la cage
  function computeDuelGoalFrac() {
    const s = solveShot(aimShooter().ballStart(BALL_R),
      new THREE.Vector3(0, TARGET_ROOF_Y + GOAL_H * 0.45, world.goalLineZ() - 0.2));
    game.goalFrac = Math.min(1, (s.v / POWER_MAX) ** 2);
  }

  function beginAim() {
    game.state = 'aim';
    // duel à 2 : la main revient au premier joueur local encore debout
    if (game.locals) {
      game.activeLocal = game.shooters[game.locals[0]].alive ? 0 : 1;
      ui.flash(`À toi, ${aimShooter().nation.name} !`, 'small', 1.3);
    }
    computeDuelGoalFrac();
    // ne PAS toucher à game.aiming : une visée commencée pendant la bannière
    // doit survivre à la transition (sinon le tir du joueur est avalé)
    audio.whistle();
    if (!game.hintShown) {
      game.hintShown = true;
      ui.hint('Glissez vers le bas pour viser, relâchez pour tirer');
    }
  }

  // ----------------------------------------------------------------- tir ---

  function scheduleShot(idx, vel, kickDelay) {
    const b = game.balls[idx];
    b.pendingVel = vel;
    b.kickAt = kickDelay;
    b.launchAt = kickDelay + 0.2;
    b.state = 'wait';
    b.resolved = false;
    b.t = 0;
  }

  // Aide à la visée : si le tir frôle la cage (à ~40 cm près), on le rentre.
  // Calcul analytique du point de passage sur la ligne de but, vent compris.
  // `goal` : { x, lineZ, roofY } — cage du Duel ou du trou en cours.
  function applyAssist(start, vel, goal, wind) {
    if (vel.z >= -1) return vel;
    const t = (goal.lineZ - start.z) / vel.z;
    if (t <= 0.2 || t > 6.5) return vel;
    const x = start.x + vel.x * t + 0.5 * wind * t * t;
    const y = start.y + vel.y * t - 0.5 * G * t * t;
    const yLo = goal.roofY + 0.2;
    const yHi = goal.roofY + GOAL_H - 0.25;
    const xLim = GOAL_W / 2 - 0.3;
    const out = vel.clone();
    const graceY = 0.3 * diff().assist;
    const graceX = 0.32 * diff().assist;
    const cy = Math.max(yLo, Math.min(yHi, y));
    if (cy !== y && Math.abs(cy - y) <= graceY) out.y += (cy - y) / t;
    const cx = Math.max(goal.x - xLim, Math.min(goal.x + xLim, x));
    if (cx !== x && Math.abs(cx - x) <= graceX) out.x += (cx - x) / t;
    return out;
  }

  const duelGoal = () => ({ x: 0, lineZ: world.goalLineZ(), roofY: TARGET_ROOF_Y });

  function playerShoot() {
    ui.hint(null);
    hidePreview();
    const idx = aimIdx();
    const start = game.shooters[idx].ballStart(BALL_R);
    const vel = applyAssist(start, velocityFrom(game.aimPower, game.aimYaw), duelGoal(), game.wind);
    scheduleShot(idx, vel, 0);
    game.followIdx = idx;

    // duel à 2 : le second joueur local vise pendant que le ballon vole
    if (game.locals && game.activeLocal === 0 && game.shooters[game.locals[1]].alive) {
      game.activeLocal = 1;
      game.aimPower = 0;
      game.aimYaw = 0;
      game.rawPower = 0;
      game.rawYaw = 0;
      computeDuelGoalFrac();
      ui.flash(`À toi, ${aimShooter().nation.name} !`, 'small', 1.4);
      return; // on reste en phase de visée
    }

    // dernier humain servi : les IA frappent dans la foulée
    game.shooters.forEach((s, i) => {
      if (!isHuman(s) && s.alive) {
        scheduleShot(i, aiVelocity(s), 0.08 + Math.random() * 0.45);
      }
    });
    game.state = 'flight';
    game.t = 0;
  }

  // L'IA exécute parfaitement mais vise un point dispersé autour de la cage :
  // sa dispersion (en mètres) se resserre au fil des manches.
  function aiVelocity(shooter) {
    const prog = Math.min(1, (game.round - 1) / Math.max(1, game.roundsMax - 1));
    const start = shooter.ballStart(BALL_R);
    // Tournoi : les adversaires gagnent en précision à chaque tour
    const tf = game.tournament ? TOURNEY_AI[game.tournament.stage] : 1;
    const sigX = (0.95 - 0.35 * prog) * diff().aiSig * tf;
    const sigY = (0.72 - 0.28 * prog) * diff().aiSig * tf;
    const cy = TARGET_ROOF_Y + GOAL_H * 0.45;
    const sign = Math.random() < 0.5 ? -1 : 1;
    let tx;
    let ty;
    if (game.round >= 4 && Math.random() < 0.25) {
      // tentative de lucarne : risqué mais double
      tx = sign * (GOAL_W / 2 - 0.55) + gauss() * sigX * 0.5;
      ty = TARGET_ROOF_Y + GOAL_H - 0.42 + gauss() * sigY * 0.5;
    } else if (world.keeperActive()) {
      // gardien en place : l'IA écarte son tir du centre
      tx = sign * (0.9 + Math.random() * 0.7) + gauss() * sigX * 0.7;
      ty = cy + gauss() * sigY;
    } else {
      tx = gauss() * sigX;
      ty = cy + gauss() * sigY;
    }
    const target = new THREE.Vector3(
      tx,
      Math.max(TARGET_ROOF_Y - 0.6, ty),
      world.goalLineZ() - 0.2,
    );
    // compensation (imparfaite) du vent
    const first = solveShot(start, target);
    const windRead = Math.min(0.97, 0.65 + 0.25 * prog + Math.random() * 0.15);
    target.x -= 0.5 * game.wind * first.t * first.t * windRead;
    return shotVector(solveShot(start, target));
  }

  // ------------------------------------------------------------- visée -----

  function showPreview() {
    let start, yaw, glz, glRoofY, floorY, trig = T_TENDU;
    if (game.mode === 'golf' && game.golf) {
      start = game.golf.rest.clone();
      yaw = game.golf.heading + game.aimYaw;
      glz = game.golf.course.goalInfo.lineZ;
      glRoofY = game.golf.course.goalInfo.roofY;
      floorY = -20;
      trig = clubTrig();
    } else {
      start = aimShooter().ballStart(BALL_R);
      yaw = game.aimYaw;
      glz = world.goalLineZ();
      glRoofY = TARGET_ROOF_Y;
      floorY = TARGET_ROOF_Y - 8;
    }
    // surface (toit) sous un point, selon le mode
    const surfaceAt = (p) => {
      if (game.mode === 'golf' && game.golf) {
        for (const pf of game.golf.course.platforms) {
          if (Math.abs(p.x - pf.x) < pf.hw && Math.abs(p.z - pf.z) < pf.hd) return pf.topY;
        }
        return null;
      }
      if (p.z > -5 && p.z < 21 && Math.abs(p.x) < 16) return 0; // notre toit
      if (p.z < world.towerFrontZ() && p.z > world.towerBackZ()
        && Math.abs(p.x) < TARGET_HALF_W) return TARGET_ROOF_Y;
      return null;
    };

    const vel = velocityFrom(game.aimPower, yaw, trig);
    const pos = start.clone();
    const prev = start.clone();
    const v = vel.clone();
    const dt = 1 / 25;
    let di = 0;
    let hit = false;
    for (let step = 0; step < 110 && di < previewDots.length; step++) {
      prev.copy(pos);
      // même intégration exacte que le vol réel ; le vent n'apparaît pas :
      // à vous de compenser
      pos.x += v.x * dt;
      pos.y += v.y * dt - 0.5 * G * dt * dt;
      pos.z += v.z * dt;
      v.y -= G * dt;
      if (step % 3 === 0) {
        const dot = previewDots[di++];
        dot.position.copy(pos);
        dot.visible = true;
        // les points grossissent avec la distance pour compenser la perspective
        dot.scale.setScalar(1 + di * 0.09);
        dot.material.opacity = 0.95 - (di / previewDots.length) * 0.4;
      }
      // anneau d'impact : sur le plan de but (seulement au-dessus du toit —
      // en dessous, le ballon frappera la façade et tombera)
      if (prev.z >= glz && pos.z < glz) {
        const f = (prev.z - glz) / (prev.z - pos.z);
        const iy = prev.y + (pos.y - prev.y) * f;
        if (iy > glRoofY) {
          marker.position.set(prev.x + (pos.x - prev.x) * f, iy, glz + 0.06);
          marker.rotation.set(0, 0, 0);
          hit = true;
        }
        break;
      }
      // …ou à plat sur le toit d'atterrissage
      const sy = surfaceAt(pos);
      if (sy !== null && pos.y - BALL_R < sy && v.y < 0) {
        marker.position.set(pos.x, sy + 0.04, pos.z);
        marker.rotation.set(-Math.PI / 2, 0, 0);
        hit = true;
        break;
      }
      if (pos.z < glz - 1.2 || pos.y < floorY) break;
    }
    for (; di < previewDots.length; di++) previewDots[di].visible = false;
    marker.visible = hit;
    if (hit) marker.scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.12);
  }

  function hidePreview() {
    for (const dot of previewDots) dot.visible = false;
    marker.visible = false;
  }

  // ------------------------------------------------------------ ballons ----

  function updateBall(b, dt) {
    if (b.state === 'wait') {
      b.t += dt;
      if (b.kickAt >= 0 && b.t >= b.kickAt) {
        b.shooter.startKick();
        b.kickAt = -1;
      }
      if (b.t >= b.launchAt) {
        b.vel.copy(b.pendingVel);
        b.state = 'flying';
        b.t = 0;
        audio.kick();
      }
      return;
    }
    if (b.state !== 'flying') return;
    b.t += dt;

    const prev = b.mesh.position.clone();
    // intégration cinématique exacte (accélération constante) : la trajectoire
    // ne dépend pas du framerate et colle aux calculs analytiques (IA, aide)
    const pos0 = b.mesh.position;
    pos0.x += b.vel.x * dt + 0.5 * game.wind * dt * dt;
    pos0.y += b.vel.y * dt - 0.5 * G * dt * dt;
    pos0.z += b.vel.z * dt;
    b.vel.x += game.wind * dt;
    b.vel.y -= G * dt;
    b.mesh.rotation.x -= (b.vel.length() / BALL_R) * dt * 0.35;

    if (b.state === 'flying') {
      // émission le long du segment parcouru : pas de trous même à bas FPS
      const moved = prev.distanceTo(b.mesh.position);
      const n = Math.max(1, Math.min(6, Math.ceil(moved / 0.5)));
      for (let i = 1; i <= n; i++) {
        fx.trail(prev.clone().lerp(b.mesh.position, i / n), b.shooter.nation.trail);
      }
    }

    const pos = b.mesh.position;
    const glz = world.goalLineZ();
    const tfz = world.towerFrontZ();
    const tbz = world.towerBackZ();

    // franchit-il la ligne de but ?
    if (!b.scored && b.state === 'flying' && prev.z >= glz && pos.z < glz) {
      const f = (prev.z - glz) / (prev.z - pos.z);
      const ix = prev.x + (pos.x - prev.x) * f;
      const iy = prev.y + (pos.y - prev.y) * f;
      const mine = isHuman(b.shooter);
      if (world.keeperActive() && Math.abs(ix - world.keeperX()) < 0.6
        && iy < TARGET_ROOF_Y + 1.55) {
        // arrêt du gardien : le ballon est repoussé vers le vide
        pos.z = glz + BALL_R;
        b.vel.z = Math.abs(b.vel.z) * 0.25;
        b.vel.x = (Math.random() - 0.5) * 4;
        b.vel.y = Math.abs(b.vel.y) * 0.2;
        audio.save();
        if (mine) ui.flash('Arrêt du gardien !', 'small', 1.3);
      } else if (Math.abs(ix) < GOAL_W / 2 - BALL_R * 0.35
        && iy > TARGET_ROOF_Y && iy < TARGET_ROOF_Y + GOAL_H - BALL_R * 0.25) {
        b.scored = true;
        // lucarne : les coins hauts valent double
        const lucarne = Math.abs(ix) > GOAL_W / 2 - 0.85
          && iy > TARGET_ROOF_Y + GOAL_H - 0.62;
        resolveBall(b, true, lucarne ? 2 : 1);
        audio.goal();
        if (mine) audio.cheer();
        fx.burst(new THREE.Vector3(ix, iy, glz),
          [0xffffff, b.shooter.nation.trail, 0xffe08a], lucarne ? 64 : 40, lucarne ? 7 : 5);
        if (mine) {
          ui.flash(lucarne ? 'LUCARNE ! +2 🎯' : 'BUT ⚽ !', 'goal', lucarne ? 1.9 : 1.5);
          game.slowmo = 0.85;
          game.goalCamPoint = new THREE.Vector3(ix, iy, glz);
        } else {
          ui.flash(`${lucarne ? 'Lucarne' : 'But'} — ${b.shooter.nation.name}`, 'small', 1.1);
        }
        b.shooter.celebrate();
      }
    }

    // fond du filet
    if (b.scored && pos.z < glz - 0.85) {
      pos.z = glz - 0.85;
      b.vel.z *= -0.12;
      b.vel.x *= 0.3;
      b.vel.y *= 0.5;
    }

    // façade de la tour cible
    if (!b.scored && prev.z >= tfz && pos.z < tfz) {
      const f = (prev.z - tfz) / (prev.z - pos.z);
      const iy = prev.y + (pos.y - prev.y) * f;
      if (iy < TARGET_ROOF_Y - BALL_R * 0.3 && Math.abs(pos.x) < TARGET_HALF_W + BALL_R * 0.4) {
        pos.z = tfz + BALL_R;
        b.vel.z *= -0.3;
        b.vel.x *= 0.5;
        b.vel.y *= 0.4;
      }
    }

    // rebond sur le toit adverse (uniquement en arrivant par le dessus)
    if (pos.z < tfz && pos.z > tbz && Math.abs(pos.x) < TARGET_HALF_W
      && pos.y - BALL_R < TARGET_ROOF_Y && prev.y - BALL_R >= TARGET_ROOF_Y - 0.02
      && b.vel.y < 0) {
      pos.y = TARGET_ROOF_Y + BALL_R;
      bounce(b);
    }

    // tir trop court : retombe sur notre toit
    if (pos.z > -5 && pos.z < 21 && Math.abs(pos.x) < 16
      && pos.y - BALL_R < 0 && b.vel.y < 0) {
      pos.y = BALL_R;
      bounce(b);
    }

    // perdu dans le vide / sécurité
    if (pos.y < -45 || b.t > 7.5) {
      b.mesh.visible = false;
      b.state = 'done';
      resolveBall(b, b.scored);
    }
  }

  function bounce(b) {
    b.vel.y *= -0.45;
    b.vel.x *= 0.72;
    b.vel.z *= 0.72;
    if (b.vel.length() < 2.2) {
      b.state = 'done'; // au repos : plus d'intégration physique
      b.vel.set(0, 0, 0);
      resolveBall(b, b.scored);
    }
  }

  function resolveBall(b, scored, pts = 1) {
    if (b.resolved) return;
    b.resolved = true;
    b.missed = !scored;
    if (scored) {
      b.shooter.score += pts;
      ui.updateChips(game.shooters);
    } else if (isHuman(b.shooter)) {
      ui.flash(game.locals ? `Raté — ${b.shooter.nation.name}` : 'Raté…', 'small', 1);
      audio.miss();
    }
  }

  // --------------------------------------------------------- résolution ----

  function applyMisses() {
    for (const b of game.balls) {
      if (!b.shooter.alive || !b.missed) continue;
      const left = b.shooter.breakPlank(fx);
      audio.crack();
      if (left <= 0) {
        b.shooter.fallOff(fx);
        audio.fall();
        const mine = isHuman(b.shooter);
        ui.flash(
          mine && !game.locals ? 'Vos planches cèdent !' : `${b.shooter.nation.name} tombe !`,
          mine ? 'lose-msg' : 'small', 1.8,
        );
      }
      b.missed = false;
    }
    ui.updateChips(game.shooters);
  }

  function evaluateEnd() {
    const humans = (game.locals || [game.playerIdx]).map((i) => game.shooters[i]);
    const bots = game.shooters.filter((s) => !humans.includes(s));
    const alive = game.shooters.filter((s) => s.alive);

    if (humans.every((s) => !s.alive)) {
      return {
        done: true, cls: 'lose', sound: 'lose',
        title: game.locals ? '💥 LES DEUX JOUEURS SONT TOMBÉS…' : '💥 DÉFAITE…',
      };
    }
    if (alive.length === 1) {
      const last = alive[0];
      return humans.includes(last)
        ? {
          done: true, cls: 'win', sound: 'win',
          title: game.locals ? `🏆 ${last.nation.name.toUpperCase()} GAGNE !` : '🏆 VICTOIRE !',
        }
        : { done: true, title: '💥 DÉFAITE…', cls: 'lose', sound: 'lose' };
    }
    // solo : les deux IA tombées = victoire immédiate
    if (!game.locals && bots.every((s) => !s.alive)) {
      return { done: true, title: '🏆 VICTOIRE !', cls: 'win', sound: 'win' };
    }
    if (game.round >= game.roundsMax) {
      const top = Math.max(...alive.map((s) => s.score));
      const leaders = alive.filter((s) => s.score === top);
      if (leaders.length === 1) {
        const leader = leaders[0];
        const win = humans.includes(leader);
        const title = game.locals
          ? (win ? `🏆 ${leader.nation.name.toUpperCase()} GAGNE !` : `💥 L'IA (${leader.nation.name}) vous a battus…`)
          : (win ? '🏆 VICTOIRE !' : '💥 DÉFAITE…');
        return { done: true, title, cls: win ? 'win' : 'lose', sound: win ? 'win' : 'lose' };
      }
      // solo : le joueur hors du peloton de tête n'a plus rien à jouer
      if (!game.locals && !leaders.includes(playerShooter())) {
        return { done: true, title: '💥 DÉFAITE…', cls: 'lose', sound: 'lose' };
      }
      // toujours ex æquo en tête : mort subite, mais pas indéfiniment —
      // le verdict d'une manche décisive est rendu AVANT le plafond
      if (game.round >= game.hardCap) {
        return { done: true, title: 'ÉGALITÉ', cls: '', sound: 'lose' };
      }
      return { done: false };
    }
    return { done: false };
  }

  // ============================================================= TOURNOI ===

  function startTournament(teamIdx) {
    clearMatch();
    // six adversaires distincts tirés des sept nations restantes :
    // deux par tour (quart, demie, finale)
    const pool = NATIONS.map((_, i) => i).filter((i) => i !== teamIdx);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    game.tournament = { teamIdx, stage: 0, foes: pool.slice(0, 6), pendingNext: false };
    startTournamentMatch();
  }

  function startTournamentMatch() {
    clearMatch();
    game.mode = 'duel';
    setMatchFormat(5, 7); // 5 manches, la cage recule vite : mêmes distances qu'en duel
    const t = game.tournament;
    t.pendingNext = false;
    game.roster = [
      NATIONS[t.foes[t.stage * 2]],
      NATIONS[t.teamIdx],
      NATIONS[t.foes[t.stage * 2 + 1]],
    ];
    game.playerIdx = 1;
    ui.buildChips(game.roster, 1);
    game.roster.forEach((nation, i) => {
      const s = new Shooter(scene, nation, SHOOTER_X[i], i === game.playerIdx);
      game.shooters.push(s);
      game.balls.push(makeBall(s));
    });
    game.round = 1;
    game.hintShown = false;
    game.windAnnounced = false;
    ui.startMatch();
    ui.updateChips(game.shooters);
    ui.flash(`🏆 ${TOURNEY_STAGES[t.stage]} — face à ${game.roster[0].name} et ${game.roster[2].name}`,
      'round', 2.4);
    startRound();
  }

  // verdict du match replacé dans le contexte du tournoi ; appelé à l'écran
  // de fin, il prépare aussi l'éventuel match suivant (bouton CONTINUER)
  function tournamentVerdict(end) {
    const t = game.tournament;
    const won = end.cls === 'win'; // l'égalité au plafond élimine aussi
    if (won && t.stage < 2) {
      t.pendingNext = true;
      const nf = [NATIONS[t.foes[(t.stage + 1) * 2]], NATIONS[t.foes[(t.stage + 1) * 2 + 1]]];
      return {
        title: t.stage === 0 ? '✅ QUART DE FINALE REMPORTÉ !' : '✅ DEMI-FINALE REMPORTÉE !',
        cls: 'win',
        result: { mode: 'tourney', won: true, next: { stage: TOURNEY_STAGES[t.stage + 1], foes: [nf[0].name, nf[1].name] } },
      };
    }
    if (won) {
      return {
        title: '🏆 CHAMPION DU TOURNOI !',
        cls: 'win',
        result: { mode: 'tourney', won: true, champion: true },
      };
    }
    return {
      title: `💥 ÉLIMINATION EN ${TOURNEY_STAGES[t.stage].toUpperCase()}…`,
      cls: 'lose',
      result: { mode: 'tourney', won: false, eliminated: TOURNEY_STAGES[t.stage] },
    };
  }

  function tournamentNext() {
    const t = game.tournament;
    if (!t || !t.pendingNext) return;
    t.stage += 1;
    startTournamentMatch();
  }

  // ============================================================ PARCOURS ===

  function startGolf(teamIdx, golfOpts = {}) {
    clearMatch();
    game.tournament = null;
    game.mode = 'golf';
    world.setDuelTargetVisible(false);
    // Parcours du jour : même graine (date UTC), même vent, même difficulté
    // pour tout le monde — sinon graine aléatoire et 3 ou 9 trous au choix
    const daily = !!golfOpts.daily;
    const count = daily ? 3 : (golfOpts.count === 9 ? 9 : 3);
    const seed = daily ? dateSeed() : ((Math.random() * 0x7fffffff) | 0);
    if (daily) game.difficulty = 'normal';
    buildRoster(teamIdx);
    // les trois nations jouent le parcours ; pas de planches au golf
    game.roster.forEach((nation, i) => {
      const s = new Shooter(scene, nation, 0, i === game.playerIdx, { planks: false });
      game.shooters.push(s);
      const b = makeBall(s);
      b.isPlayerBall = i === game.playerIdx;
      game.balls.push(b);
    });
    game.golf = {
      hole: 0, scores: [], course: null, strokes: 0,
      holes: generateCourse(seed, count),
      daily,
      date: new Date().toISOString().slice(0, 10),
      kind: daily ? 'daily' : (count === 9 ? 'p9' : 'p3'),
      totals: [0, 0, 0],
      rivals: [0, 2].map((i) => ({
        i, rest: new THREE.Vector3(), groundY: 0,
        strokes: 0, holed: false, capped: false, think: 0,
      })),
      frozen: false,
    };
    ui.startGolf(game.playerIdx);
    ui.syncClub(game.club);
    startHole(0);
  }

  function startHole(i) {
    const g = game.golf;
    if (g.course) {
      g.course.dispose();
      world.restoreCity();
    }
    g.hole = i;
    g.strokes = 0;
    g.spec = g.holes[i];
    g.course = buildCourse(scene, g.spec);
    world.clearCorridor(g.course.boxes);
    g.rest = new THREE.Vector3(0, BALL_R, 1.5);
    g.groundY = 0;
    g.frozen = false;
    // la lumière tombe d'un cran à chaque trou
    world.setDayNight(i / Math.max(1, g.holes.length - 1));
    // vent seedé avec le trou ; le Parcours du jour l'applique tel quel pour
    // que tous les joueurs affrontent exactement les mêmes conditions
    g.wind = g.daily ? g.spec.wind
      : Math.round(g.spec.wind * diff().wind * 10) / 10;
    ui.setWind(g.wind);
    // les rivales démarrent de part et d'autre du joueur
    g.rivals.forEach((r, k) => {
      r.rest.set(k === 0 ? -3.5 : 3.5, BALL_R, 1.5);
      r.groundY = 0;
      r.strokes = 0;
      r.holed = false;
      r.capped = false;
      r.think = 1.4 + k * 1.2 + Math.random();
      const b = game.balls[r.i];
      b.state = 'idle';
      b.resolved = true;
      b.scored = false;
      b.mesh.visible = true;
      b.mesh.position.copy(r.rest);
      game.shooters[r.i].standAt(r.rest, r.groundY, headingTo(r.rest));
    });
    golfChips();
    game.state = 'g_intro';
    game.t = 0;
    ui.flash(`⛳ ${g.spec.name} / ${g.holes.length} — Par ${g.spec.par}`, 'round', 1.9);
    placeGolfShot();
  }

  function headingTo(from) {
    const gi = game.golf.course.goalInfo;
    return Math.atan2(gi.x - from.x, -(gi.lineZ - from.z));
  }

  // au golf, la puce d'équipe affiche le cumul de coups (moins = mieux)
  function golfChips() {
    const g = game.golf;
    game.shooters.forEach((s, i) => {
      const cur = i === game.playerIdx ? g.strokes
        : g.rivals.find((r) => r.i === i).strokes;
      s.score = g.totals[i] + cur;
    });
    ui.updateChips(game.shooters);
  }

  // repositionne tireur, ballon, caméra et HUD pour le coup à jouer
  function placeGolfShot() {
    const g = game.golf;
    const gi = g.course.goalInfo;
    const dx = gi.x - g.rest.x;
    const dz = gi.lineZ - g.rest.z;
    g.heading = Math.atan2(dx, -dz);
    g.distToGoal = Math.hypot(dx, dz);
    updateGolfGoalFrac();
    ui.setGolfHud(g.spec, g.holes.length, g.strokes, g.distToGoal);
    playerShooter().standAt(g.rest, g.groundY, g.heading);
    const b = playerBall();
    b.mesh.visible = true;
    b.mesh.position.copy(g.rest);
    b.state = 'idle';
    b.resolved = true;
    b.scored = false;
  }

  const clubTrig = () => (game.club === 'cloche' ? T_CLOCHE : T_TENDU);

  // repère de jauge seulement quand la cage est à portée (dépend du club)
  function updateGolfGoalFrac() {
    const g = game.golf;
    const gi = g.course.goalInfo;
    if (g.distToGoal < 55) {
      const s = solveShot(g.rest, new THREE.Vector3(gi.x, gi.roofY + GOAL_H * 0.45, gi.lineZ - 0.2), clubTrig());
      game.goalFrac = Math.min(1, (s.v / POWER_MAX) ** 2);
    } else {
      game.goalFrac = null;
    }
  }

  function setClub(club) {
    game.club = club;
    if (game.mode === 'golf' && game.golf && game.golf.course) updateGolfGoalFrac();
  }

  function golfShoot() {
    ui.hint(null);
    hidePreview();
    const g = game.golf;
    const gi = g.course.goalInfo;
    const start = g.rest.clone();
    let vel = velocityFrom(game.aimPower, g.heading + game.aimYaw, clubTrig());
    vel = applyAssist(start, vel, gi, g.wind);
    g.strokes += 1;
    ui.setGolfHud(g.spec, g.holes.length, g.strokes, g.distToGoal);
    golfChips();
    const b = playerBall();
    b.pendingVel = vel;
    b.kickAt = 0;
    b.launchAt = 0.2;
    b.state = 'wait';
    b.resolved = false;
    b.t = 0;
    b.onResolve = (outcome, platform) => { game.golfOutcome = { outcome, platform }; };
    game.golfOutcome = null;
    game.state = 'g_flight';
    game.t = 0;
  }

  function resolveGolf(b, outcome, platform) {
    if (b.resolved) return;
    b.resolved = true;
    if (b.onResolve) b.onResolve(outcome, platform);
  }

  function golfBounce(b, platform) {
    // atterrissage « golf » : le toit absorbe l'élan (les frappes tendues
    // arrivent à ~20 m/s, sans fort amortissement le ballon roulerait
    // toujours hors de la plateforme) — mais un ballon trop long peut
    // encore finir dans le vide : c'est le jeu
    b.vel.y *= -0.26;
    b.vel.x *= 0.22;
    b.vel.z *= 0.22;
    if (b.vel.length() < 3) {
      b.state = 'done';
      b.vel.set(0, 0, 0);
      resolveGolf(b, b.scored ? 'goal' : 'landed', platform);
    }
  }

  function updateGolfBall(b, dt) {
    if (b.state === 'wait') {
      b.t += dt;
      if (b.kickAt >= 0 && b.t >= b.kickAt) {
        b.shooter.startKick();
        b.kickAt = -1;
      }
      if (b.t >= b.launchAt) {
        b.vel.copy(b.pendingVel);
        b.state = 'flying';
        b.t = 0;
        audio.kick();
      }
      return;
    }
    if (b.state !== 'flying') return;
    b.t += dt;

    const g = game.golf;
    const gi = g.course.goalInfo;
    const prev = b.mesh.position.clone();
    const pos = b.mesh.position;
    pos.x += b.vel.x * dt + 0.5 * g.wind * dt * dt;
    pos.y += b.vel.y * dt - 0.5 * G * dt * dt;
    pos.z += b.vel.z * dt;
    b.vel.x += g.wind * dt;
    b.vel.y -= G * dt;
    b.mesh.rotation.x -= (b.vel.length() / BALL_R) * dt * 0.35;

    const moved = prev.distanceTo(pos);
    const n = Math.max(1, Math.min(6, Math.ceil(moved / 0.5)));
    for (let i = 1; i <= n; i++) {
      fx.trail(prev.clone().lerp(pos, i / n), b.shooter.nation.trail);
    }

    // franchit-il la ligne de but ?
    if (!b.scored && prev.z >= gi.lineZ && pos.z < gi.lineZ) {
      const f = (prev.z - gi.lineZ) / (prev.z - pos.z);
      const ix = prev.x + (pos.x - prev.x) * f;
      const iy = prev.y + (pos.y - prev.y) * f;
      if (Math.abs(ix - gi.x) < GOAL_W / 2 - BALL_R * 0.35
        && iy > gi.roofY && iy < gi.roofY + GOAL_H - BALL_R * 0.25) {
        b.scored = true;
        audio.goal();
        fx.burst(new THREE.Vector3(ix, iy, gi.lineZ), [0xffffff, b.shooter.nation.trail, 0xffe08a], 44, 5);
        if (b.isPlayerBall) {
          ui.flash('BUT ⚽ !', 'goal', 1.6);
          audio.cheer();
          game.slowmo = 0.85;
          game.goalCamPoint = new THREE.Vector3(ix, iy, gi.lineZ);
        }
        b.shooter.celebrate();
        resolveGolf(b, 'goal', gi.platform);
      }
    }

    // fond du filet
    if (b.scored && pos.z < gi.lineZ - 0.85) {
      pos.z = gi.lineZ - 0.85;
      b.vel.z *= -0.12;
      b.vel.x *= 0.3;
      b.vel.y *= 0.5;
    }

    // plateformes : toits et façades
    for (const p of g.course.platforms) {
      const insideX = Math.abs(pos.x - p.x) < p.hw;
      const insideZ = Math.abs(pos.z - p.z) < p.hd;
      if (!(insideX && insideZ) || pos.y - BALL_R >= p.topY) continue;
      if (prev.y - BALL_R >= p.topY - 0.02 && b.vel.y < 0) {
        pos.y = p.topY + BALL_R;
        golfBounce(b, p);
      } else if (prev.z >= p.z + p.hd) {
        pos.z = p.z + p.hd + BALL_R;
        b.vel.z *= -0.3; b.vel.x *= 0.5; b.vel.y *= 0.4;
      } else if (prev.z <= p.z - p.hd) {
        pos.z = p.z - p.hd - BALL_R;
        b.vel.z *= -0.3; b.vel.x *= 0.5; b.vel.y *= 0.4;
      } else if (prev.x <= p.x - p.hw) {
        pos.x = p.x - p.hw - BALL_R;
        b.vel.x *= -0.3; b.vel.z *= 0.5; b.vel.y *= 0.4;
      } else if (prev.x >= p.x + p.hw) {
        pos.x = p.x + p.hw + BALL_R;
        b.vel.x *= -0.3; b.vel.z *= 0.5; b.vel.y *= 0.4;
      } else {
        pos.y = p.topY + BALL_R;
        golfBounce(b, p);
      }
    }

    // perdu dans le vide / sécurité
    if (pos.y < -60 || b.t > 9) {
      b.mesh.visible = false;
      b.state = 'done';
      resolveGolf(b, b.scored ? 'goal' : 'void', null);
    }
  }

  // ------------------------------------------------------ rivales IA -------

  // vitesse d'un coup rival : vise la prochaine plateforme (ou la cage à
  // portée) avec une dispersion gaussienne et une lecture partielle du vent
  function aiGolfVelocity(start) {
    const g = game.golf;
    const gi = g.course.goalInfo;
    const dist = Math.hypot(gi.x - start.x, gi.lineZ - start.z);
    let target;
    if (dist < 55) {
      target = new THREE.Vector3(
        gi.x + gauss() * 1.0,
        Math.max(gi.roofY - 0.5, gi.roofY + GOAL_H * 0.45 + gauss() * 0.68),
        gi.lineZ - 0.2,
      );
    } else {
      const ps = g.course.platforms;
      let idx = ps.findIndex((p) => Math.abs(start.x - p.x) < p.hw + 0.6
        && Math.abs(start.z - p.z) < p.hd + 0.6);
      if (idx < 0) idx = 0;
      const next = ps[Math.min(idx + 1, ps.length - 1)];
      const sig = Math.min(next.hw, next.hd) * 0.34;
      target = new THREE.Vector3(
        next.x + gauss() * sig,
        next.topY + BALL_R,
        next.z + gauss() * sig,
      );
    }
    // les rivales sortent la cloche pour grimper sur un toit bien plus haut
    const trig = target.y - start.y > 2 ? T_CLOCHE : T_TENDU;
    const first = solveShot(start, target, trig);
    const read = 0.6 + Math.random() * 0.3;
    target.x -= 0.5 * g.wind * first.t * first.t * read;
    return shotVector(solveShot(start, target, trig), trig);
  }

  function rivalShoot(r) {
    const g = game.golf;
    r.strokes += 1;
    golfChips();
    const b = game.balls[r.i];
    b.mesh.visible = true;
    b.mesh.position.copy(r.rest);
    b.pendingVel = aiGolfVelocity(r.rest.clone());
    b.kickAt = 0;
    b.launchAt = 0.2;
    b.state = 'wait';
    b.resolved = false;
    b.scored = false;
    b.t = 0;
    b.onResolve = (outcome, platform) => {
      if (outcome === 'goal') {
        r.holed = true;
        ui.flash(`⛳ ${game.roster[r.i].name} termine en ${r.strokes}`, 'small', 1.6);
      } else if (outcome === 'landed') {
        r.rest.copy(b.mesh.position);
        r.groundY = platform.topY;
        r.think = 1.8 + Math.random() * 1.6;
        game.shooters[r.i].standAt(r.rest, r.groundY, headingTo(r.rest));
      } else { // vide
        r.strokes += 1;
        golfChips();
        b.mesh.visible = false;
        r.think = 1.5 + Math.random();
      }
      if (!r.holed && r.strokes >= g.spec.par + 5) {
        r.capped = true;
        r.strokes = g.spec.par + 5;
        b.mesh.visible = false;
        golfChips();
      }
    };
  }

  // fait vivre les rivales à leur rythme, dans tous les états du parcours
  // (reçoit déjà le dt ralenti de la boucle principale)
  function updateRivals(dt) {
    const g = game.golf;
    if (!g) return;
    for (const r of g.rivals) {
      const b = game.balls[r.i];
      updateGolfBall(b, dt);
      if (g.frozen || r.holed || r.capped) continue;
      if (b.state === 'idle' || b.state === 'done') {
        r.think -= dt;
        if (r.think <= 0) rivalShoot(r);
      }
    }
  }

  // Résolution analytique d'un vol (sans animation) : but, toit ou vide.
  // Sert à terminer les trous des rivales quand le joueur a fini avant elles.
  function simFlight(start, vel) {
    const g = game.golf;
    const gi = g.course.goalInfo;
    let tGoal = Infinity;
    if (vel.z < -0.5) {
      const t = (gi.lineZ - start.z) / vel.z;
      if (t > 0.05) {
        const x = start.x + vel.x * t + 0.5 * g.wind * t * t;
        const y = start.y + vel.y * t - 0.5 * G * t * t;
        if (Math.abs(x - gi.x) < GOAL_W / 2 - BALL_R * 0.35
          && y > gi.roofY && y < gi.roofY + GOAL_H - BALL_R * 0.25) {
          tGoal = t;
        }
      }
    }
    let best = null;
    for (const p of g.course.platforms) {
      const yp = p.topY + BALL_R;
      const disc = vel.y * vel.y - 2 * G * (yp - start.y);
      if (disc <= 0) continue;
      const t = (vel.y + Math.sqrt(disc)) / G; // branche descendante
      if (t <= 0.05) continue;
      const x = start.x + vel.x * t + 0.5 * g.wind * t * t;
      const z = start.z + vel.z * t;
      if (Math.abs(x - p.x) < p.hw - 0.4 && Math.abs(z - p.z) < p.hd - 0.4
        && (best === null || t < best.t)) {
        best = { t, point: new THREE.Vector3(x, yp, z), platform: p };
      }
    }
    if (tGoal < (best ? best.t : Infinity)) return { type: 'goal' };
    if (best) return { type: 'landed', point: best.point, platform: best.platform };
    return { type: 'void' };
  }

  function fastForwardRivals() {
    const g = game.golf;
    for (const r of g.rivals) {
      const b = game.balls[r.i];
      let pending = null; // vol en cours au moment du gel
      if (b.state === 'flying' || b.state === 'wait') {
        pending = b.state === 'flying'
          ? { start: b.mesh.position.clone(), vel: b.vel.clone() }
          : { start: r.rest.clone(), vel: b.pendingVel.clone() };
        b.state = 'done';
      }
      let safety = 0;
      while (!r.holed && !r.capped && safety++ < 12) {
        let out;
        if (pending) {
          out = simFlight(pending.start, pending.vel); // coup déjà compté
          pending = null;
        } else {
          r.strokes += 1;
          out = simFlight(r.rest.clone(), aiGolfVelocity(r.rest.clone()));
        }
        if (out.type === 'goal') r.holed = true;
        else if (out.type === 'landed') { r.rest.copy(out.point); r.groundY = out.platform.topY; }
        else r.strokes += 1; // vide : pénalité
        if (!r.holed && r.strokes >= g.spec.par + 5) {
          r.capped = true;
          r.strokes = g.spec.par + 5;
        }
      }
      b.mesh.visible = false;
    }
    golfChips();
  }

  function finishHole() {
    const g = game.golf;
    fastForwardRivals();
    const strokes = [0, 1, 2].map((i) => (i === game.playerIdx ? g.strokes
      : g.rivals.find((r) => r.i === i).strokes));
    g.scores.push({ name: g.spec.name, par: g.spec.par, strokes });
    strokes.forEach((s, i) => { g.totals[i] += s; });
    g.rivals.forEach((r) => { r.strokes = 0; });
    g.strokes = 0;
    golfChips();
    const diff = strokes[game.playerIdx] - g.spec.par;
    ui.flash(golfLabel(strokes[game.playerIdx], diff), diff <= 0 ? 'goal' : 'small', 2);
    const others = g.rivals.map((r) => `${game.roster[r.i].name} ${strokes[r.i]}`).join(' · ');
    ui.flash(others, 'small', 2.4);
    if (diff <= -1) audio.win();
  }

  function golfLabel(strokes, diff) {
    if (strokes === 1) return 'TROU EN UN ! 🎯';
    if (diff <= -2) return 'EAGLE 🦅';
    if (diff === -1) return 'BIRDIE 🐦';
    if (diff === 0) return 'PAR ✔';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double bogey';
    return `+${diff}`;
  }

  function golfEnd() {
    const g = game.golf;
    const parTotal = g.scores.reduce((a, r) => a + r.par, 0);
    const totals = g.totals;
    const best = Math.min(...totals);
    const winners = [0, 1, 2].filter((i) => totals[i] === best);
    let verdict;
    if (winners.length === 1 && winners[0] === game.playerIdx) {
      verdict = { title: '🏆 VICTOIRE !', cls: 'win', sound: 'win' };
    } else if (winners.includes(game.playerIdx)) {
      verdict = { title: 'ÉGALITÉ EN TÊTE', cls: 'win', sound: 'win' };
    } else {
      verdict = { title: '💥 DÉFAITE…', cls: 'lose', sound: 'lose' };
    }
    audio[verdict.sound]();
    ui.showGolfEnd(g.scores, totals, parTotal, game.playerIdx, verdict, game.roster,
      { kind: g.kind, date: g.date });
    game.state = 'over';
    game.endInfo = null;
  }

  // ------------------------------------------------------------- caméra ----

  function updateCamera(dt) {
    let wantPos, wantLook;
    if (game.state === 'title') {
      const sway = Math.sin(performance.now() * 0.0002) * 2;
      wantPos = new THREE.Vector3(sway, 7.5, 16.5);
      wantLook = new THREE.Vector3(0, 1.5, -30);
    } else if (game.slowmo > 0 && game.goalCamPoint) {
      // ralenti de but : la caméra plonge vers la cage
      const p = game.goalCamPoint;
      wantPos = new THREE.Vector3(p.x * 0.5, p.y + 1.6, p.z + 10);
      wantLook = p.clone();
    } else if (game.mode === 'golf' && game.golf) {
      // derrière le ballon, orientée vers le but du trou
      const g = game.golf;
      const D = new THREE.Vector3(Math.sin(g.heading), 0, -Math.cos(g.heading));
      wantPos = g.rest.clone().addScaledVector(D, -10.5);
      wantPos.y = g.groundY + 6.2;
      wantLook = g.rest.clone().addScaledVector(D, 26);
      wantLook.y = g.groundY + 0.5;
      const pb = game.balls[0];
      if ((game.state === 'g_flight' || game.state === 'g_hole') && pb && pb.state === 'flying') {
        wantLook.lerp(pb.mesh.position, 0.6);
      }
    } else {
      const px = aimShooter().homeX;
      wantPos = new THREE.Vector3(px * 0.55, 6.4, 13);
      wantLook = new THREE.Vector3(px * 0.25, 1.0, -20);
      const pb = game.balls[game.followIdx ?? game.playerIdx];
      if (game.state === 'flight' && pb && pb.state === 'flying') {
        wantLook.lerp(pb.mesh.position, 0.6);
      }
    }
    const k = Math.min(1, dt * (game.slowmo > 0 ? 6 : 3));
    game.camPos.lerp(wantPos, k);
    game.camLook.lerp(wantLook, k);
    camera.position.copy(game.camPos);
    camera.lookAt(game.camLook);
  }

  // ------------------------------------------------------------ pointeur ---

  const AIM_STATES = ['aim', 'intro', 'g_aim', 'g_intro'];

  function pointerDown(x, y) {
    audio.unlock();
    // on tolère un début de visée pendant la bannière de manche
    if (!AIM_STATES.includes(game.state) || game.aiming) return;
    game.aiming = true;
    game.aimStart.x = x;
    game.aimStart.y = y;
    game.aimPower = 0;
    game.aimYaw = 0;
    game.rawPower = 0;
    game.rawYaw = 0;
  }

  function pointerMove(x, y) {
    if (!game.aiming) return;
    const h = window.innerHeight;
    const w = window.innerWidth;
    const dx = x - game.aimStart.x;
    const dy = y - game.aimStart.y;
    // axes découplés : le vertical règle la puissance, l'horizontal la
    // direction — sinon viser de biais gonfle la puissance à son insu.
    // La portée croît en v² : v ∝ √(glisser) rend la relation
    // doigt → distance LINÉAIRE (2× plus long = 2× plus loin).
    const frac = Math.min(1, (Math.max(0, dy) / h) / DRAG_FULL);
    game.rawPower = POWER_MAX * Math.sqrt(frac);
    game.rawYaw = Math.max(-0.55, Math.min(0.55, -(dx / w) * 1.15));
  }

  // annulation système (pointercancel, perte de capture) : pas de tir
  function pointerCancel() {
    game.aiming = false;
    hidePreview();
    ui.setGauge(false);
  }

  function pointerUp() {
    if (!game.aiming) return;
    game.aiming = false;
    ui.setGauge(false);
    // le tir ne peut partir qu'une fois la manche réellement lancée
    if (game.state === 'aim' && game.aimPower >= POWER_MIN) {
      playerShoot();
    } else if (game.state === 'g_aim' && game.aimPower >= POWER_MIN) {
      golfShoot();
    } else {
      hidePreview();
    }
  }

  // ------------------------------------------------------------- update ----

  // Lissage de la visée à constante de temps (~70 ms) : indépendant du
  // framerate et des événements pointeur coalescés ; la prévisualisation
  // reflète exactement la valeur qu'utilisera le tir.
  function updateAiming(dt) {
    if (!game.aiming) return;
    const k = 1 - Math.exp(-dt * 14);
    game.aimPower += (game.rawPower - game.aimPower) * k;
    game.aimYaw += (game.rawYaw - game.aimYaw) * k;
    if (game.aimPower > POWER_MIN * 0.55) showPreview();
    else hidePreview();
    // la jauge affiche la fraction de PORTÉE (linéaire avec le glisser)
    ui.setGauge(true, (game.aimPower / POWER_MAX) ** 2, game.goalFrac);
  }

  function update(dt) {
    const t = performance.now() * 0.001;
    // ralenti cinématique après un but du joueur : la physique passe à 35 %
    if (game.slowmo > 0) game.slowmo -= dt;
    const sdt = game.slowmo > 0 ? dt * 0.35 : dt;
    for (const s of game.shooters) s.update(sdt, t);
    // en phase de visée, le badge du tireur actif laisse la vue dégagée
    if (game.shooters.length) {
      const active = AIM_STATES.includes(game.state) ? aimShooter() : null;
      for (const s of game.shooters) s.setBadgeFaded(s === active);
    }
    // le vent s'entend pendant la visée, proportionnel à sa force
    const windNow = game.mode === 'golf' && game.golf ? game.golf.wind : game.wind;
    audio.setWind(AIM_STATES.includes(game.state) ? windNow : 0);
    updateCamera(dt);

    switch (game.state) {
      case 'intro':
        game.t += dt;
        updateAiming(dt);
        if (game.t > 1.5) beginAim();
        break;
      case 'aim':
        updateAiming(dt);
        // duel à 2 : le ballon du premier joueur vole pendant la visée du second
        for (const b of game.balls) updateBall(b, sdt);
        break;
      case 'flight': {
        game.t += dt;
        for (const b of game.balls) updateBall(b, sdt);
        const allDone = game.balls.every((b) => b.resolved);
        if (allDone || game.t > 9) {
          game.state = 'resolve';
          game.t = 0;
          game.resolvePhase = 0;
        }
        break;
      }
      case 'resolve':
        game.t += dt;
        for (const b of game.balls) updateBall(b, sdt); // les ballons finissent de rouler
        if (game.resolvePhase === 0 && game.t > 0.8) {
          game.resolvePhase = 1;
          applyMisses();
        }
        if (game.resolvePhase === 1 && game.t > 2.2) {
          game.resolvePhase = 2;
          const end = evaluateEnd();
          if (end.done) {
            game.state = 'over';
            game.t = 0;
            game.endInfo = end;
          } else {
            game.round += 1;
            startRound();
          }
        }
        break;
      case 'g_intro':
        game.t += dt;
        updateAiming(dt);
        updateRivals(sdt);
        if (game.t > 1.7) {
          game.state = 'g_aim';
          audio.whistle();
          if (game.golf.hole === 0 && game.golf.strokes === 0 && !game.golfHintShown) {
            game.golfHintShown = true;
            ui.hint('Enchaînez les toits jusqu’au but — le vide coûte +1 coup');
          }
        }
        break;
      case 'g_aim':
        updateAiming(dt);
        updateRivals(sdt);
        break;
      case 'g_flight': {
        game.t += dt;
        const b = playerBall();
        updateGolfBall(b, sdt);
        updateRivals(sdt);
        if (b.resolved && game.golfOutcome) {
          const { outcome, platform } = game.golfOutcome;
          game.golfOutcome = null;
          const g = game.golf;
          if (outcome === 'landed') {
            g.rest.copy(b.mesh.position);
            g.groundY = platform.topY;
            game.state = 'g_move';
          } else if (outcome === 'void') {
            g.strokes += 1;
            ui.flash('Dans le vide ! +1 coup', 'lose-msg', 1.7);
            audio.miss();
            game.state = 'g_move';
          } else { // but !
            game.state = 'g_hole';
            game.holeDone = false;
            g.frozen = true; // les rivales seront résolues en accéléré
          }
          // limite golf : à par+5, le trou est ramassé
          if (outcome !== 'goal' && g.strokes >= g.spec.par + 5) {
            ui.flash('Limite de coups atteinte…', 'small', 1.9);
            game.state = 'g_hole';
            game.holeDone = false;
            g.frozen = true;
          }
          game.t = 0;
        }
        break;
      }
      case 'g_move':
        game.t += dt;
        updateGolfBall(playerBall(), sdt);
        updateRivals(sdt);
        if (game.t > 1.2) {
          placeGolfShot();
          game.state = 'g_aim';
        }
        break;
      case 'g_hole':
        game.t += dt;
        updateGolfBall(playerBall(), sdt); // le ballon finit sa course au filet
        updateRivals(sdt); // les vols rivaux en cours se terminent à l'écran
        if (!game.holeDone && game.t > 1.3) {
          game.holeDone = true;
          finishHole();
        }
        if (game.holeDone && game.t > 3.9) {
          if (game.golf.hole < game.golf.holes.length - 1) startHole(game.golf.hole + 1);
          else golfEnd();
        }
        break;
      case 'over':
        game.t += dt;
        if (game.t > 0.9 && game.endInfo) {
          const end = game.endInfo;
          game.endInfo = null;
          audio[end.sound]();
          const meMap = game.locals
            ? { [game.locals[0]]: ' (J1)', [game.locals[1]]: ' (J2)' }
            : { [game.playerIdx]: ' (vous)' };
          let { title, cls } = end;
          let result = {
            mode: game.locals ? 'duel2' : 'duel',
            playerScore: playerShooter().score,
            won: cls === 'win',
            nation: playerShooter().nation.name,
          };
          if (game.tournament) {
            const tv = tournamentVerdict(end);
            title = tv.title;
            cls = tv.cls;
            result = { ...tv.result, playerScore: playerShooter().score, nation: result.nation };
          }
          ui.showEnd(title, cls, game.shooters, meMap, result);
        }
        break;
      default:
        break;
    }
  }

  function toTitle() {
    clearMatch();
    game.tournament = null;
    hidePreview();
    game.aiming = false;
    game.state = 'title';
  }

  return {
    update, pointerDown, pointerMove, pointerUp, pointerCancel,
    startMatch, startMatch2, startGolf, startTournament, tournamentNext, toTitle, setClub,
    hasTournamentNext() { return !!(game.tournament && game.tournament.pendingNext); },
    setDifficulty(d) { game.difficulty = d === 'hard' ? 'hard' : 'normal'; },
    get state() { return game.state; },
    debug: game,
  };
}
