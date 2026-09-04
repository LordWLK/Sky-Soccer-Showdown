// Effets : traînées comète, débris de planches, confettis de but.
import * as THREE from 'three';
import { softDotTexture } from './assets.js';

export function createFx(scene) {
  const dotTex = softDotTexture();
  const trailMats = new Map(); // couleur -> matériau partagé

  const trails = [];   // {sprite, life, maxLife, size}
  const debris = [];   // {mesh, vel, spin, life}
  const confetti = []; // {mesh, vel, spin, life, maxLife}
  const rings = [];    // ondes de choc des buts {mesh, life, maxLife}

  const confettiGeo = new THREE.PlaneGeometry(0.16, 0.24);
  const ringGeo = new THREE.RingGeometry(0.55, 0.72, 40);

  // ---- ambiance : poussières dorées du crépuscule, feuilles au vent -------
  let dusk = 0;
  let windAmb = 0;
  const motes = [];
  const leaves = [];
  const AMB_BOX = { x: 26, yLo: 0.5, yHi: 14, zLo: -66, zHi: 14 };
  {
    for (let i = 0; i < 34; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: dotTex, color: 0xffe2a0, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      const s = 0.16 + Math.random() * 0.2;
      sp.scale.set(s, s, 1);
      sp.position.set(
        (Math.random() * 2 - 1) * AMB_BOX.x,
        AMB_BOX.yLo + Math.random() * (AMB_BOX.yHi - AMB_BOX.yLo),
        AMB_BOX.zLo + Math.random() * (AMB_BOX.zHi - AMB_BOX.zLo),
      );
      scene.add(sp);
      motes.push({ sp, phase: Math.random() * 9, base: 0.2 + Math.random() * 0.3 });
    }
    const leafGeo = new THREE.PlaneGeometry(0.3, 0.2);
    const leafCols = [0xc9762c, 0x9aa04a, 0xd8d3c2, 0xb4552e];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(leafGeo, new THREE.MeshBasicMaterial({
        color: leafCols[i % leafCols.length], side: THREE.DoubleSide,
        transparent: true, opacity: 0,
      }));
      m.position.set((Math.random() * 2 - 1) * 24, 2 + Math.random() * 10, -8 - Math.random() * 40);
      scene.add(m);
      leaves.push({
        m,
        vy: -0.5 - Math.random() * 0.5,
        spin: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
        wob: Math.random() * 9,
      });
    }
  }

  // ---- météo : gouttes filantes ou flocons dérivants, purement visuels ----
  let weather = 'clear';
  let weatherK = 0; // fondu d'apparition
  const drops = [];
  {
    // la pluie : traits fins étirés ; la neige : les mêmes sprites en rond
    const dropGeo = new THREE.PlaneGeometry(0.02, 0.55);
    const dropMat = new THREE.MeshBasicMaterial({
      color: 0xbdd4ee, transparent: true, opacity: 0.55, depthWrite: false,
    });
    for (let i = 0; i < 170; i++) {
      const m = new THREE.Mesh(dropGeo, dropMat);
      m.visible = false;
      scene.add(m);
      const flake = new THREE.Sprite(new THREE.SpriteMaterial({
        map: dotTex, color: 0xf4f8ff, transparent: true, opacity: 0.85, depthWrite: false,
      }));
      const fs = 0.1 + Math.random() * 0.12;
      flake.scale.set(fs, fs, 1);
      flake.visible = false;
      scene.add(flake);
      drops.push({
        m, flake,
        x: (Math.random() * 2 - 1) * 30,
        y: Math.random() * 20,
        z: 16 - Math.random() * 80,
        v: 16 + Math.random() * 8, // vitesse de chute (pluie)
        sway: Math.random() * 9,
      });
    }
  }

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

    // heure du jour et vent courant : pilotent poussières et feuilles
    ambience(tod, wind) {
      dusk = 4 * tod * (1 - tod); // maximal au crépuscule
      windAmb = wind || 0;
    },

    // météo visuelle : 'clear', 'rain', 'snow' (la brume est gérée par world)
    setWeather(type) {
      weather = type === 'rain' || type === 'snow' ? type : 'clear';
      if (weather === 'clear') weatherK = 0; // coupure nette au retour au calme
    },

    // onde de choc lumineuse dans le plan du but
    shockwave(pos, color = 0xfff2c0) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      m.position.copy(pos);
      scene.add(m);
      rings.push({ mesh: m, life: 0, maxLife: 0.55 });
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
      // poussières : dérive lente + poussée du vent, halo au crépuscule
      const now = performance.now() * 0.001;
      for (const p of motes) {
        p.sp.position.x += (Math.sin(now * 0.5 + p.phase) * 0.12 + windAmb * 0.5) * dt;
        p.sp.position.y += Math.cos(now * 0.4 + p.phase * 2) * 0.08 * dt;
        if (p.sp.position.x > AMB_BOX.x) p.sp.position.x = -AMB_BOX.x;
        if (p.sp.position.x < -AMB_BOX.x) p.sp.position.x = AMB_BOX.x;
        p.sp.material.opacity = dusk * p.base * (0.6 + 0.4 * Math.sin(now * 0.8 + p.phase));
      }
      // feuilles : chute tournoyante, portées par le vent RÉEL de la manche
      const wStr = Math.min(1, Math.abs(windAmb) * 1.3);
      for (const L of leaves) {
        L.m.position.x += (windAmb * 2.4 + Math.sin(now * 2 + L.wob) * 0.5) * dt;
        L.m.position.y += (L.vy + Math.sin(now * 3 + L.wob * 2) * 0.4) * dt;
        L.m.rotation.x += L.spin.x * dt;
        L.m.rotation.y += L.spin.y * dt;
        L.m.rotation.z += L.spin.z * dt;
        if (L.m.position.y < -6 || Math.abs(L.m.position.x) > 30) {
          L.m.position.set(
            windAmb >= 0 ? -28 : 28,
            6 + Math.random() * 9,
            -6 - Math.random() * 44,
          );
        }
        L.m.material.opacity = wStr * 0.85;
      }
      // météo : gouttes filantes (pluie) ou flocons portés par le vent (neige)
      weatherK += ((weather === 'clear' ? 0 : 1) - weatherK) * Math.min(1, dt * 1.5);
      if (weatherK > 0.02) {
        const rain = weather === 'rain';
        for (const D of drops) {
          if (rain) {
            D.y -= D.v * dt;
            D.x += windAmb * 1.2 * dt;
            D.m.rotation.z = -windAmb * 0.07;
          } else {
            D.y -= (0.9 + D.v * 0.05) * dt;
            D.x += (windAmb * 1.8 + Math.sin(now * 1.6 + D.sway) * 0.7) * dt;
          }
          if (D.y < -2) { D.y = 19 + Math.random() * 3; D.x = (Math.random() * 2 - 1) * 30; }
          if (D.x > 32) D.x = -32;
          if (D.x < -32) D.x = 32;
          D.m.visible = rain;
          D.flake.visible = !rain;
          const tgt = rain ? D.m : D.flake;
          tgt.position.set(D.x, D.y, D.z);
          tgt.material.opacity = (rain ? 0.5 : 0.85) * weatherK;
        }
      } else {
        for (const D of drops) { D.m.visible = false; D.flake.visible = false; }
      }
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
          d.mesh.geometry.dispose();
          d.mesh.material.dispose();
          debris.splice(i, 1);
        }
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life += dt;
        const u = r.life / r.maxLife;
        if (u >= 1) {
          scene.remove(r.mesh);
          r.mesh.material.dispose();
          rings.splice(i, 1);
          continue;
        }
        const s = 1 + u * 7;
        r.mesh.scale.set(s, s, 1);
        r.mesh.material.opacity = 0.9 * (1 - u) * (1 - u);
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
