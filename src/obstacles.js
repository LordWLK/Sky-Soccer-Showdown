// Obstacles aériens et colonnes d'air : visuels, colliders « vivants »
// (les drones bougent) et animation. Utilisé par le Parcours (specs seedées
// dans course.js) et par le Duel (specs tirées à chaque manche).
import * as THREE from 'three';

const CABLE_R = 0.12;

// specs : [{type:'cable', x,y,z, halfLen} | {type:'drone', x,y,z, range,speed,phase}
//          | {type:'crane', x,y,z, jib}], lifts : [{x,z,r,topY}]
export function buildObstacles(scene, specs = [], lifts = []) {
  const group = new THREE.Group();
  const colliders = [];
  const drones = [];
  const liftRings = [];

  const dark = new THREE.MeshLambertMaterial({ color: 0x2a3040 });
  const warn = new THREE.MeshLambertMaterial({ color: 0xe33f3f, emissive: 0x551111 });

  for (const s of specs) {
    if (s.type === 'cable') {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(CABLE_R * 0.75, CABLE_R * 0.75, s.halfLen * 2, 6),
        dark.clone(),
      );
      cable.rotation.z = Math.PI / 2;
      cable.position.set(s.x, s.y, s.z);
      group.add(cable);
      // balises rouges aux extrémités et au centre : le danger se lit de loin
      for (const fx of [-1, 0, 1]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), warn.clone());
        b.position.set(s.x + fx * s.halfLen * 0.9, s.y, s.z);
        group.add(b);
      }
      colliders.push({ type: 'cable', x: s.x, y: s.y, z: s.z, halfLen: s.halfLen });
    } else if (s.type === 'drone') {
      const body = new THREE.Group();
      const core = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 1.1), dark.clone());
      body.add(core);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), warn.clone());
      eye.position.set(0, -0.1, 0.5);
      body.add(eye);
      const rotors = [];
      for (const [rx, rz] of [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]]) {
        const r = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 0.05, 10),
          new THREE.MeshLambertMaterial({ color: 0x9aa4b8, transparent: true, opacity: 0.55 }),
        );
        r.position.set(rx, 0.26, rz);
        body.add(r);
        rotors.push(r);
      }
      body.position.set(s.x, s.y, s.z);
      group.add(body);
      const d = { mesh: body, baseX: s.x, range: s.range, speed: s.speed, phase: s.phase, rotors, wobble: 0 };
      drones.push(d);
      colliders.push({ type: 'box', kind: 'drone', mesh: body, hw: 0.85, hh: 0.35, hd: 0.85, drone: d });
    } else if (s.type === 'crane') {
      // mât hors du couloir + flèche horizontale qui déborde au-dessus du vide
      const mastH = 30;
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.9, mastH, 0.9), new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
      const side = Math.sign(s.x) || 1;
      const mastX = s.x + side * s.jib * 0.5;
      mast.position.set(mastX, s.y - mastH / 2 + 3, s.z);
      group.add(mast);
      const jib = new THREE.Mesh(new THREE.BoxGeometry(s.jib * 2, 0.6, 0.7), new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
      jib.position.set(s.x, s.y + 3, s.z);
      group.add(jib);
      // filin + charge suspendue sous la flèche
      const wireLen = 2.6;
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, wireLen, 5), dark.clone());
      const hookX = s.x - side * s.jib * 0.55;
      wire.position.set(hookX, s.y + 3 - wireLen / 2, s.z);
      group.add(wire);
      const load = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshLambertMaterial({ color: 0x7c8698 }));
      load.position.set(hookX, s.y + 3 - wireLen - 0.7, s.z);
      group.add(load);
      colliders.push({ type: 'box', kind: 'crane', mesh: jib, hw: s.jib, hh: 0.5, hd: 0.55 });
      colliders.push({ type: 'box', kind: 'crane', mesh: load, hw: 0.95, hh: 0.95, hd: 0.95 });
    }
  }

  // colonnes d'air : cylindre translucide + anneaux qui montent en boucle
  const liftZones = [];
  for (const L of lifts) {
    const h = 42;
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(L.r, L.r * 0.8, h, 18, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xbfe9ff, transparent: true, opacity: 0.09,
        side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    col.position.set(L.x, L.topY - h / 2 + 4, L.z);
    group.add(col);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(L.r * 0.82, 0.09, 6, 22),
        new THREE.MeshBasicMaterial({
          color: 0xdff4ff, transparent: true, opacity: 0.4,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(L.x, 0, L.z);
      group.add(ring);
      liftRings.push({ mesh: ring, base: L.topY - h + 5, top: L.topY + 3, off: i / 3, h });
    }
    liftZones.push({ x: L.x, z: L.z, r: L.r, topY: L.topY });
  }

  scene.add(group);
  let elapsed = 0;
  return {
    colliders,
    lifts: liftZones,
    update(dt) {
      elapsed += dt;
      for (const d of drones) {
        d.mesh.position.x = d.baseX + Math.sin(elapsed * d.speed + d.phase) * d.range;
        d.mesh.rotation.z = -Math.cos(elapsed * d.speed + d.phase) * 0.12 + d.wobble * Math.sin(elapsed * 22) * 0.5;
        if (d.wobble > 0) d.wobble = Math.max(0, d.wobble - dt * 1.4);
        for (const r of d.rotors) r.rotation.y += dt * 30;
      }
      for (const r of liftRings) {
        const f = ((elapsed * 0.22 + r.off) % 1);
        r.mesh.position.y = r.base + f * (r.top - r.base);
        r.mesh.material.opacity = 0.42 * (1 - f);
      }
    },
    dispose() {
      scene.remove(group);
      group.traverse((m) => {
        if (m.isMesh) {
          m.geometry.dispose();
          m.material.dispose();
        }
      });
    },
  };
}
