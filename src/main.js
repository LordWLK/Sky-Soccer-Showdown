// Point d'entrée : rendu, boucle, entrées.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { createFx } from './fx.js';
import { createGame } from './game.js';
import { initUI, ui } from './ui.js';
import { audio } from './audio.js';
import { loadPrefs, savePrefs } from './records.js';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 7.5, 16);

const world = buildWorld(scene);
const fx = createFx(scene);
const game = createGame({ scene, camera, world, fx });
window.__game = game; // utilisés par les tests automatisés
window.__world = world;

// au tout premier lancement, un écran « comment jouer » précède la partie ;
// le drapeau de session évite de le remontrer à chaque partie quand le
// stockage local est indisponible (données de site bloquées)
let pendingPlay = null;
let tutoSeenSession = false;

initUI({
  onPlay: (teamIdx, mode, difficulty, team2Idx) => {
    audio.unlock();
    audio.click();
    const launch = () => {
      game.setDifficulty(difficulty);
      if (mode === 'golf') game.startGolf(teamIdx);
      else if (mode === 'golf9') game.startGolf(teamIdx, { count: 9 });
      else if (mode === 'daily') game.startGolf(teamIdx, { daily: true });
      else if (mode === 'tourney') game.startTournament(teamIdx);
      else if (mode === 'duel2') game.startMatch2(teamIdx, team2Idx);
      else game.startMatch(teamIdx);
    };
    if (!tutoSeenSession && !loadPrefs().tutorialSeen) {
      pendingPlay = launch;
      ui.show('#tuto-screen');
      return;
    }
    launch();
  },
  onClub: (club) => {
    audio.click();
    game.setClub(club);
  },
  onReplay: () => {
    audio.click();
    // en plein tournoi, le bouton enchaîne sur le match suivant
    if (game.hasTournamentNext()) {
      ui.hide('#end-screen');
      game.tournamentNext();
      return;
    }
    game.toTitle();
    ui.hide('#end-screen');
    ui.hide('#hud');
    ui.show('#title-screen');
  },
  onSelectSound: () => {
    audio.unlock();
    audio.click();
  },
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const canvas = renderer.domElement;
canvas.style.touchAction = 'none';
// un seul pointeur pilote la visée : un second doigt est ignoré,
// et une annulation système n'expédie jamais le tir
let aimPointerId = null;
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (paused || aimPointerId !== null) return;
  aimPointerId = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  game.pointerDown(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== aimPointerId) return;
  game.pointerMove(e.clientX, e.clientY);
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerId !== aimPointerId) return;
  aimPointerId = null;
  game.pointerUp();
});
canvas.addEventListener('pointercancel', (e) => {
  if (e.pointerId !== aimPointerId) return;
  aimPointerId = null;
  game.pointerCancel();
});

// --- pause en jeu, réglages (volume / vibrations), tutoriel ---------------
const prefs = loadPrefs();
audio.setVolume(prefs.volume);
audio.setHaptics(prefs.haptics);

const $id = (s) => document.getElementById(s);
$id('vol-range').value = Math.round(prefs.volume * 100);
$id('vib-check').checked = prefs.haptics;

let paused = false;
// le même panneau sert de pause en jeu et de réglages depuis l'écran titre
function openPanel(fromGame) {
  $id('pause-title').textContent = fromGame ? 'PAUSE' : 'RÉGLAGES';
  $id('resume-btn').innerHTML = fromGame ? '▶&nbsp;&nbsp;REPRENDRE' : '✔&nbsp;&nbsp;FERMER';
  $id('quit-btn').classList.toggle('hidden', !fromGame);
  ui.show('#pause-screen');
  if (fromGame) {
    paused = true;
    // une visée en cours est annulée proprement : pas de tir surprise
    aimPointerId = null;
    game.pointerCancel();
    audio.setWind(0); // le souffle s'arrête, la partie est figée
  }
}
function closePanel() {
  ui.hide('#pause-screen');
  paused = false;
}
$id('pause-btn').addEventListener('click', () => { audio.click(); openPanel(true); });
$id('settings-btn').addEventListener('click', () => {
  audio.unlock();
  audio.click();
  openPanel(false);
});
$id('resume-btn').addEventListener('click', () => { audio.click(); closePanel(); });
$id('quit-btn').addEventListener('click', () => {
  audio.click();
  closePanel();
  game.toTitle();
  ui.hide('#hud');
  ui.hide('#end-screen');
  ui.show('#title-screen');
});
$id('vol-range').addEventListener('input', (e) => {
  const v = e.target.value / 100;
  audio.setVolume(v);
  savePrefs({ volume: v });
  audio.click(); // aperçu immédiat du nouveau volume
});
$id('vib-check').addEventListener('change', (e) => {
  audio.setHaptics(e.target.checked);
  savePrefs({ haptics: e.target.checked });
  audio.click();
});
$id('tuto-btn').addEventListener('click', () => {
  audio.click();
  tutoSeenSession = true;
  savePrefs({ tutorialSeen: true });
  ui.hide('#tuto-screen');
  const p = pendingPlay;
  pendingPlay = null;
  if (p) p();
});

// Écran de démarrage : le logo reste au moins ~2,2 s depuis l'ouverture de
// la page (performance.now() compte depuis la navigation), puis fondu.
{
  const splash = document.getElementById('splash');
  const remaining = Math.max(350, 2200 - performance.now());
  setTimeout(() => {
    splash.classList.add('out');
    setTimeout(() => splash.remove(), 750);
  }, remaining);
}

// PWA : installable et jouable hors-ligne
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* hors PWA */ });
  });
}

const clock = new THREE.Clock();
let elapsed = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  if (paused) { renderer.render(scene, camera); return; } // image figée
  elapsed += dt;
  game.update(dt);
  world.update(dt, elapsed);
  fx.update(dt);
  renderer.render(scene, camera);
});
