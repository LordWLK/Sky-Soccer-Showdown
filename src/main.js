// Point d'entrée : rendu, boucle, entrées.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { createFx } from './fx.js';
import { createGame } from './game.js';
import { initUI, ui } from './ui.js';
import { audio } from './audio.js';

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
window.__game = game; // utilisé par les tests automatisés

initUI({
  onPlay: (teamIdx) => {
    audio.unlock();
    audio.click();
    game.startMatch(teamIdx);
  },
  onReplay: () => {
    audio.click();
    ui.hide('#end-screen');
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
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  game.pointerDown(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => game.pointerMove(e.clientX, e.clientY));
canvas.addEventListener('pointerup', () => game.pointerUp());
canvas.addEventListener('pointercancel', () => game.pointerUp());

const clock = new THREE.Clock();
let elapsed = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;
  game.update(dt);
  world.update(dt, elapsed);
  fx.update(dt);
  renderer.render(scene, camera);
});
