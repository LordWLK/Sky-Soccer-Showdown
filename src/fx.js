// Effets : traînées comète, débris de planches, confettis de but.
import * as THREE from 'three';
import { softDotTexture } from './assets.js';

export function createFx(scene) {
  const dotTex = softDotTexture();
  const trailMats = new Map(); // couleur -> matériau partagé

  const trails = [];   // {sprite, life, maxLife, size}
  const debris = [];   // {mesh, vel, spin, life}
  const confetti = []; // {mesh, vel, spin, life, maxLife}

  const confettiGeo = new THREE.PlaneGeometry(0.16, 0.24);

  function trailMat(color) {
    if (!trailMats.has(color)) {
      trailMats.set(color, new THREE.SpriteMaterial({
        map: dotTex, color, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
    }
    return trailMats.get(color);
  }

  return {
    // une bouffée de comète à la position du ballon
    trail(pos, color, size = 1) {
      const sprite = new THREE.Sprite(trailMat(color).clone());
      sprite.position.copy(pos);
      const s = (0.85 + Math.random() * 0.4) * size;
      sprite.scale.set(s, s, 1);
      scene.add(sprite);
      trails.push({ sprite, life: 0, maxLife: 0.5 + Math.random() * 0.2 });
      if (trails.length > 700) {
        const old = trails.shift();
        scene.remove(old.sprite);
        old.sprite.material.dispose();
      }
    },

    // fait dégringoler un mesh existant (planche…)
    tumble(mesh, worldPos, vel) {
      mesh.position.copy(worldPos);
      scene.add(mesh);
      debris.push({
        mesh, vel: vel.clone(),
        spin: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3),
        life: 0,
      });
    },

    // explosion de confettis (but !)
    burst(pos, colors, n = 36, speed = 6) {
      for (let i = 0; i < n; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: colors[i % colors.length], side: THREE.DoubleSide, transparent: true,
        });
        const m = new THREE.Mesh(confettiGeo, mat);
        m.position.copy(pos);
        scene.add(m);
        const a = Math.random() * Math.PI * 2;
        const up = Math.random() * speed * 0.9 + 1.5;
        confetti.push({
          mesh: m,
          vel: new THREE.Vector3(Math.cos(a) * speed * Math.random(), up, Math.sin(a) * speed * Math.random() * 0.6),
          spin: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9),
          life: 0, maxLife: 1.3 + Math.random() * 0.6,
        });
      }
    },

    update(dt) {
      for (let i = trails.length - 1; i >= 0; i--) {
        const p = trails[i];
        p.life += dt;
        const u = p.life / p.maxLife;
        if (u >= 1) {
          scene.remove(p.sprite);
          p.sprite.material.dispose();
          trails.splice(i, 1);
          continue;
        }
        p.sprite.material.opacity = 1 - u;
        const s = p.sprite.scale.x * (1 - dt * 1.6);
        p.sprite.scale.set(s, s, 1);
      }
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.life += dt;
        d.vel.y -= 20 * dt;
        d.mesh.position.addScaledVector(d.vel, dt);
        d.mesh.rotation.x += d.spin.x * dt;
        d.mesh.rotation.y += d.spin.y * dt;
        d.mesh.rotation.z += d.spin.z * dt;
        // les débris se posent sur le toit des tireurs au lieu de le traverser
        const p = d.mesh.position;
        if (p.y < 0.08 && d.vel.y < 0 && Math.abs(p.x) < 16 && p.z > -4.2 && p.z < 20) {
          p.y = 0.08;
          d.vel.y *= -0.3;
          d.vel.x *= 0.5;
          d.vel.z *= 0.5;
          d.spin.multiplyScalar(0.4);
          if (Math.abs(d.vel.y) < 1) { d.vel.set(0, 0, 0); d.spin.set(0, 0, 0); }
        }
        if (d.mesh.position.y < -70 || d.life > 6) {
          scene.remove(d.mesh);
          debris.splice(i, 1);
        }
      }
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.life += dt;
        const u = c.life / c.maxLife;
        if (u >= 1) {
          scene.remove(c.mesh);
          c.mesh.material.dispose();
          confetti.splice(i, 1);
          continue;
        }
        c.vel.y -= 7 * dt;
        c.vel.multiplyScalar(1 - dt * 0.7);
        c.mesh.position.addScaledVector(c.vel, dt);
        c.mesh.rotation.x += c.spin.x * dt;
        c.mesh.rotation.y += c.spin.y * dt;
        c.mesh.material.opacity = 1 - u * u;
      }
    },
  };
}
