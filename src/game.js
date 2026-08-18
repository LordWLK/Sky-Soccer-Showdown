// Cœur du jeu : machine à états, balistique, IA, score, caméra.
import * as THREE from 'three';
import { NATIONS } from './nations.js';
import { Shooter } from './players.js';
import { ballTexture } from './assets.js';
import { ui } from './ui.js';
import { audio } from './audio.js';
import {
  TARGET_ROOF_Y, GOAL_W, GOAL_H, TARGET_HALF_W,
} from './world.js';

const G = 18;                    // gravité arcade
const ELEV = (48 * Math.PI) / 180; // élévation fixe des tirs
const BALL_R = 0.38;
const POWER_MIN = 10;
const POWER_MAX = 38;
const ROUNDS_MAX = 8;
const ROUNDS_HARD_CAP = 14;      // au-delà : égalité
const SHOOTER_X = [-5, 0, 5];

const sinE = Math.sin(ELEV);
const cosE = Math.cos(ELEV);
const tanE = Math.tan(ELEV);

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(-2.5, Math.min(2.5, n));
}

// Vitesse initiale pour atteindre `target` depuis `start` avec l'élévation fixe.
export function solveShot(start, target) {
  const dx = target.x - start.x;
  const dz = target.z - start.z;
  const dh = Math.hypot(dx, dz);
  const h = target.y - start.y;
  const denom = 2 * cosE * cosE * (dh * tanE - h);
  const v = Math.sqrt((G * dh * dh) / denom);
  const t = dh / (v * cosE);
  return { v, t, dirX: dx / dh, dirZ: dz / dh };
}

function velocityFrom(power, yaw) {
  return new THREE.Vector3(
    Math.sin(yaw) * cosE * power,
    sinE * power,
    -Math.cos(yaw) * cosE * power,
  );
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

  const game = {
    state: 'title',
    t: 0,
    round: 1,
    wind: 0,
    playerIdx: 0,
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

  const distanceForRound = (r) => Math.min(58, 26 + (r - 1) * 4);
  const playerShooter = () => game.shooters[game.playerIdx];
  const playerBall = () => game.balls[game.playerIdx];

  function rollWind() {
    if (game.round < 3) return 0;
    const level = game.round < 5 ? 0.5 : game.round < 7 ? 0.85 : 1.2;
    const mag = level * (0.4 + Math.random() * 0.6);
    return Math.round(mag * (Math.random() < 0.5 ? -1 : 1) * 10) / 10;
  }

  function clearMatch() {
    for (const s of game.shooters) scene.remove(s.group);
    for (const b of game.balls) scene.remove(b.mesh);
    game.shooters = [];
    game.balls = [];
  }

  function startMatch(teamIdx) {
    clearMatch();
    game.playerIdx = teamIdx;
    NATIONS.forEach((nation, i) => {
      const s = new Shooter(scene, nation, SHOOTER_X[i], i === teamIdx);
      game.shooters.push(s);
      const mesh = new THREE.Mesh(ballGeo, new THREE.MeshLambertMaterial({ map: ballTex }));
      mesh.castShadow = true;
      scene.add(mesh);
      game.balls.push({
        mesh, shooter: s, vel: new THREE.Vector3(),
        state: 'idle', scored: false, resolved: true, t: 0,
        kickAt: -1, launchAt: -1, pendingVel: null,
      });
    });
    game.round = 1;
    game.hintShown = false;
    game.windAnnounced = false;
    ui.startMatch(teamIdx);
    ui.updateChips(game.shooters);
    startRound();
  }

  function startRound() {
    game.state = 'intro';
    game.t = 0;
    game.wind = rollWind();
    world.setDistance(distanceForRound(game.round));
    ui.setRound(game.round, ROUNDS_MAX, game.round > ROUNDS_MAX);
    ui.setWind(game.wind);
    ui.flash(game.round > ROUNDS_MAX ? '⚡ Mort subite !' : `Manche ${game.round}`, 'round', 1.4);
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

  function beginAim() {
    game.state = 'aim';
    game.aiming = false;
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
  function applyAssist(start, vel) {
    const glz = world.goalLineZ();
    if (vel.z >= -1) return vel;
    const t = (glz - start.z) / vel.z;
    if (t <= 0.2 || t > 6) return vel;
    const x = start.x + vel.x * t + 0.5 * game.wind * t * t;
    const y = start.y + vel.y * t - 0.5 * G * t * t;
    const yLo = TARGET_ROOF_Y + 0.2;
    const yHi = TARGET_ROOF_Y + GOAL_H - 0.25;
    const xLim = GOAL_W / 2 - 0.3;
    const out = vel.clone();
    const cy = Math.max(yLo, Math.min(yHi, y));
    if (cy !== y && Math.abs(cy - y) <= 0.42) out.y += (cy - y) / t;
    const cx = Math.max(-xLim, Math.min(xLim, x));
    if (cx !== x && Math.abs(cx - x) <= 0.45) out.x += (cx - x) / t;
    return out;
  }

  function playerShoot() {
    ui.hint(null);
    hidePreview();
    const start = playerShooter().ballStart(BALL_R);
    const vel = applyAssist(start, velocityFrom(game.aimPower, game.aimYaw));
    scheduleShot(game.playerIdx, vel, 0);
    game.shooters.forEach((s, i) => {
      if (i !== game.playerIdx && s.alive) {
        scheduleShot(i, aiVelocity(s), 0.08 + Math.random() * 0.45);
      }
    });
    game.state = 'flight';
    game.t = 0;
  }

  // L'IA exécute parfaitement mais vise un point dispersé autour de la cage :
  // sa dispersion (en mètres) se resserre au fil des manches.
  function aiVelocity(shooter) {
    const prog = Math.min(1, (game.round - 1) / 7);
    const start = shooter.ballStart(BALL_R);
    const sigX = 1.1 - 0.4 * prog;
    const sigY = 0.85 - 0.35 * prog;
    const target = new THREE.Vector3(
      gauss() * sigX,
      Math.max(TARGET_ROOF_Y - 0.6, TARGET_ROOF_Y + GOAL_H * 0.45 + gauss() * sigY),
      world.goalLineZ() - 0.2,
    );
    // compensation (imparfaite) du vent
    const first = solveShot(start, target);
    const windRead = Math.min(0.95, 0.55 + 0.25 * prog + Math.random() * 0.2);
    target.x -= 0.5 * game.wind * first.t * first.t * windRead;
    const shot = solveShot(start, target);
    return new THREE.Vector3(shot.dirX * cosE * shot.v, sinE * shot.v, shot.dirZ * cosE * shot.v);
  }

  // ------------------------------------------------------------- visée -----

  function showPreview() {
    const start = playerShooter().ballStart(BALL_R);
    const vel = velocityFrom(game.aimPower, game.aimYaw);
    const pos = start.clone();
    const v = vel.clone();
    const dt = 1 / 25;
    const glz = world.goalLineZ();
    let di = 0;
    for (let step = 0; step < 110 && di < previewDots.length; step++) {
      v.y -= G * dt; // le vent n'apparaît pas : à vous de compenser
      pos.addScaledVector(v, dt);
      if (step % 3 === 0) {
        const dot = previewDots[di++];
        dot.position.copy(pos);
        dot.visible = true;
        // les points grossissent avec la distance pour compenser la perspective
        dot.scale.setScalar(1 + di * 0.09);
        dot.material.opacity = 0.95 - (di / previewDots.length) * 0.4;
      }
      if (pos.z < glz - 1.2 || pos.y < TARGET_ROOF_Y - 8) break;
    }
    for (; di < previewDots.length; di++) previewDots[di].visible = false;
  }

  function hidePreview() {
    for (const dot of previewDots) dot.visible = false;
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
    b.vel.y -= G * dt;
    b.vel.x += game.wind * dt;
    b.mesh.position.addScaledVector(b.vel, dt);
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
      if (Math.abs(ix) < GOAL_W / 2 - BALL_R * 0.35
        && iy > TARGET_ROOF_Y && iy < TARGET_ROOF_Y + GOAL_H - BALL_R * 0.25) {
        b.scored = true;
        resolveBall(b, true);
        audio.goal();
        fx.burst(new THREE.Vector3(ix, iy, glz), [0xffffff, b.shooter.nation.trail, 0xffe08a], 40, 5);
        const mine = b.shooter === playerShooter();
        ui.flash(mine ? 'BUT ⚽ !' : `But — ${b.shooter.nation.name}`, mine ? 'goal' : 'small', mine ? 1.5 : 1.1);
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
      if (iy < TARGET_ROOF_Y - BALL_R * 0.3 && Math.abs(pos.x) < TARGET_HALF_W + 1) {
        pos.z = tfz + BALL_R;
        b.vel.z *= -0.3;
        b.vel.x *= 0.5;
        b.vel.y *= 0.4;
      }
    }

    // rebond sur le toit adverse
    if (pos.z < tfz && pos.z > tbz && Math.abs(pos.x) < TARGET_HALF_W
      && pos.y - BALL_R < TARGET_ROOF_Y && b.vel.y < 0) {
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

  function resolveBall(b, scored) {
    if (b.resolved) return;
    b.resolved = true;
    b.missed = !scored;
    if (scored) {
      b.shooter.score += 1;
      ui.updateChips(game.shooters);
    } else if (b.shooter === playerShooter()) {
      ui.flash('Raté…', 'small', 1);
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
        const mine = b.shooter === playerShooter();
        ui.flash(
          mine ? 'Vos planches cèdent !' : `${b.shooter.nation.name} tombe !`,
          mine ? 'lose-msg' : 'small', 1.8,
        );
      }
      b.missed = false;
    }
    ui.updateChips(game.shooters);
  }

  function evaluateEnd() {
    const player = playerShooter();
    const others = game.shooters.filter((s) => s !== player);
    if (!player.alive) return { done: true, title: '💥 DÉFAITE…', cls: 'lose', sound: 'lose' };
    if (others.every((s) => !s.alive)) {
      return { done: true, title: '🏆 VICTOIRE !', cls: 'win', sound: 'win' };
    }
    if (game.round >= ROUNDS_HARD_CAP) return { done: true, title: 'ÉGALITÉ', cls: '', sound: 'lose' };
    if (game.round >= ROUNDS_MAX) {
      const alive = game.shooters.filter((s) => s.alive);
      const top = Math.max(...alive.map((s) => s.score));
      const leaders = alive.filter((s) => s.score === top);
      if (leaders.length === 1) {
        return leaders[0] === player
          ? { done: true, title: '🏆 VICTOIRE !', cls: 'win', sound: 'win' }
          : { done: true, title: '💥 DÉFAITE…', cls: 'lose', sound: 'lose' };
      }
      if (!leaders.includes(player)) {
        return { done: true, title: '💥 DÉFAITE…', cls: 'lose', sound: 'lose' };
      }
      return { done: false }; // mort subite entre leaders ex æquo
    }
    return { done: false };
  }

  // ------------------------------------------------------------- caméra ----

  function updateCamera(dt) {
    const px = game.state === 'title' ? 0 : playerShooter().homeX;
    let wantPos, wantLook;
    if (game.state === 'title') {
      const sway = Math.sin(performance.now() * 0.0002) * 2;
      wantPos = new THREE.Vector3(sway, 7.5, 16.5);
      wantLook = new THREE.Vector3(0, 1.5, -30);
    } else {
      wantPos = new THREE.Vector3(px * 0.55, 6.4, 13);
      wantLook = new THREE.Vector3(px * 0.25, 1.0, -20);
      const pb = playerBall();
      if (game.state === 'flight' && pb && pb.state === 'flying') {
        wantLook.lerp(pb.mesh.position, 0.6);
      }
    }
    const k = Math.min(1, dt * 3);
    game.camPos.lerp(wantPos, k);
    game.camLook.lerp(wantLook, k);
    camera.position.copy(game.camPos);
    camera.lookAt(game.camLook);
  }

  // ------------------------------------------------------------ pointeur ---

  function pointerDown(x, y) {
    audio.unlock();
    // on tolère un début de visée pendant la bannière de manche
    if ((game.state !== 'aim' && game.state !== 'intro') || game.aiming) return;
    game.aiming = true;
    game.aimStart.x = x;
    game.aimStart.y = y;
    game.aimPower = 0;
    game.aimYaw = 0;
  }

  function pointerMove(x, y) {
    if (!game.aiming) return;
    const h = window.innerHeight;
    const w = window.innerWidth;
    const dx = x - game.aimStart.x;
    const dy = y - game.aimStart.y;
    const len = Math.hypot(dx, dy);
    // lissage : filtre les tremblements de la main sur les longs tirs
    const rawPower = Math.min(POWER_MAX, (len / h) * 56);
    const rawYaw = Math.max(-0.55, Math.min(0.55, -(dx / w) * 1.15));
    game.aimPower += (rawPower - game.aimPower) * 0.5;
    game.aimYaw += (rawYaw - game.aimYaw) * 0.6;
    if (game.aimPower > POWER_MIN * 0.55) showPreview();
    else hidePreview();
  }

  function pointerUp() {
    if (!game.aiming) return;
    game.aiming = false;
    // le tir ne peut partir qu'une fois la manche réellement lancée
    if (game.state === 'aim' && game.aimPower >= POWER_MIN) {
      playerShoot();
    } else {
      hidePreview();
    }
  }

  // ------------------------------------------------------------- update ----

  function update(dt) {
    const t = performance.now() * 0.001;
    for (const s of game.shooters) s.update(dt, t);
    updateCamera(dt);

    switch (game.state) {
      case 'intro':
        game.t += dt;
        if (game.t > 1.5) beginAim();
        break;
      case 'aim':
        break;
      case 'flight': {
        game.t += dt;
        for (const b of game.balls) updateBall(b, dt);
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
        for (const b of game.balls) updateBall(b, dt); // les ballons finissent de rouler
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
      case 'over':
        game.t += dt;
        if (game.t > 0.9 && game.endInfo) {
          const { title, cls, sound } = game.endInfo;
          game.endInfo = null;
          audio[sound]();
          ui.showEnd(title, cls, game.shooters, game.playerIdx);
        }
        break;
      default:
        break;
    }
  }

  return {
    update, pointerDown, pointerMove, pointerUp, startMatch,
    get state() { return game.state; },
    debug: game,
  };
}
