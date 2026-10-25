import * as THREE from "three";
import { batchStatic } from "../simulator/visuals.js";

function texture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  let seed = 191;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  ctx.fillStyle = {
    concrete: "#b2afa3",
    rust: "#978578",
    ground: "#9e977e",
    wall: "#d3cbb8",
    roof: "#89999b",
  }[kind];
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 22000; i++) {
    const x = random() * 512,
      y = random() * 512,
      r = 0.3 + random() * (kind === "ground" ? 3 : 1.5);
    ctx.fillStyle =
      random() > 0.5 ? "rgba(255,250,224,.14)" : "rgba(43,38,29,.16)";
    ctx.fillRect(x, y, r, r);
  }
  if (kind === "wall") {
    for (let y = 0; y < 512; y += 42) {
      ctx.fillStyle = "#b0a998";
      ctx.fillRect(0, y, 512, 2);
      for (let x = ((y / 42) % 2) * 55; x < 512; x += 110)
        ctx.fillRect(x, y, 2, 42);
    }
  }
  if (kind === "roof")
    for (let x = 0; x < 512; x += 24) {
      const g = ctx.createLinearGradient(x, 0, x + 24, 0);
      g.addColorStop(0, "#506363");
      g.addColorStop(0.5, "#9facaa");
      g.addColorStop(1, "#536565");
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 24, 512);
    }
  if (kind === "rust")
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = "rgba(126,61,29,.24)";
      ctx.beginPath();
      ctx.ellipse(
        random() * 512,
        random() * 512,
        2 + random() * 15,
        5 + random() * 25,
        random() * 3,
        0,
        7,
      );
      ctx.fill();
    }
  if (kind === "ground")
    for (let i = 0; i < 300; i++) {
      ctx.strokeStyle = "rgba(72,65,48,.18)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      const x = random() * 512,
        y = random() * 512;
      ctx.moveTo(x, y);
      ctx.lineTo(x + random() * 20, y + random() * 15);
      ctx.stroke();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.setScalar(kind === "ground" ? 10 : 2);
  t.anisotropy = 8;
  return t;
}
export function enhanceWorld(scene, renderer, materials) {
  for (const [key, kind] of [
    ["wall", "wall"],
    ["concrete", "concrete"],
    ["rust", "rust"],
    ["metal", "rust"],
    ["roof", "roof"],
    ["dirt", "ground"],
    ["grass", "ground"],
  ]) {
    const m = materials[key];
    m.map = texture(kind);
    m.bumpMap = m.map;
    m.bumpScale = key === "dirt" ? 0.045 : 0.025;
    m.color.set(key === "grass" ? "#9aa27c" : "#eeeeea");
  }
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(140, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader:
        "varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec3 direction;
    void main(){vec3 d=normalize(direction);float h=max(d.y,0.);
    vec3 col=mix(vec3(.81,.79,.68),vec3(.25,.48,.66),pow(h,.55));
    float sun=pow(max(dot(d,normalize(vec3(-25.,50.,20.))),0.),700.);
    col+=vec3(1.,.78,.4)*sun;gl_FragColor=vec4(col,1.);}`,
    }),
  );
  scene.add(sky);
  const decor = new THREE.Group();
  scene.add(decor);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const m = (color, roughness = 0.8, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const trim = m("#546b6a"),
    glass = new THREE.MeshPhysicalMaterial({
      color: "#92b9c1",
      roughness: 0.16,
      metalness: 0.35,
      clearcoat: 1,
    });
  const light = new THREE.MeshStandardMaterial({
    color: "#fff2c9",
    emissive: "#ffdd96",
    emissiveIntensity: 1.4,
  });
  const beam = materials.wood,
    dark = m("#343d3e");
  function box(w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    decor.add(mesh);
    return mesh;
  }
  for (const [x, z, w, d] of [
    [0, 7, 10, 12],
    [15, 6, 11, 12],
    [-16, 6, 10, 10],
    [32, -9, 10, 10],
  ]) {
    // Fascia, foundations and facade pilasters give buildings real depth.
    for (const dx of [-w / 2, w / 2]) {
      box(0.4, 3.6, 0.45, trim, x + dx, 1.8, z - d / 2 - 0.12);
      box(0.12, 0.28, d, trim, x + dx, 3.45, z);
      const pane = box(0.06, 1.35, 2, glass, x + dx * 1.012, 2, z + 0.5);
      box(0.13, 0.08, 2.25, trim, x + dx * 1.018, 2, z + 0.5);
      for (const dz of [-0.58, 1.58])
        box(0.13, 1.55, 0.1, trim, x + dx * 1.018, 2, z + dz);
      box(0.35, 0.12, 2.3, materials.concrete, x + dx * 1.018, 1.25, z + 0.5);
    }
    box(w + 0.7, 0.18, d + 0.7, trim, x, 3.85, z);
    box(w, 0.28, 0.32, materials.concrete, x, 0.14, z + d / 2);
    for (let dz = -d / 2 + 1; dz < d / 2; dz += 2.2)
      box(w - 0.3, 0.16, 0.14, beam, x, 3.28, z + dz);
    box(1.6, 0.07, 0.45, light, x, 3.12, z);
    const fill = new THREE.PointLight("#ffdcaa", 7, 9, 2);
    fill.position.set(x, 2.8, z);
    scene.add(fill);
  }
  // Details stay against walls, leaving the existing walking paths clear.
  for (let i = 0; i < 5; i++) {
    box(0.06, 0.75, 0.07, materials.metal, 13.3 + i * 0.7, 1.95, 11.8);
    box(0.3, 0.14, 0.12, dark, 13.3 + i * 0.7, 2.35, 11.8);
  }
  box(3, 0.9, 0.06, beam, 15, 2, 11.85);
  for (let i = 0; i < 7; i++)
    box(
      0.18,
      0.25 + Math.sin(i) * 0.06,
      0.4,
      m(["#a3674e", "#667c70", "#b29b6b"][i % 3]),
      2.4 + i * 0.2,
      1.82,
      10.95,
    );
  box(2, 0.025, 3, m("#8b6f55"), 0, 0.08, 6);
  for (const [x, z] of [
    [-12, -25],
    [12, -26],
    [-12, -38],
    [12, -40],
  ]) {
    for (let i = -3; i <= 3; i++)
      box(0.09, 1.7, 2.48, materials.rust, x + i * 0.55, 0.85, z);
    box(4.2, 0.12, 2.6, materials.metal, x, 1.75, z);
  }
  // Industrial silhouettes beyond the reachable yard.
  for (const x of [-33, -27, 42]) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 9, 24),
      materials.rust,
    );
    tank.position.set(x, 4.5, -51);
    tank.castShadow = true;
    decor.add(tank);
    for (const y of [1, 4, 7]) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(2.53, 0.07, 6, 32),
        materials.metal,
      );
      band.rotation.x = Math.PI / 2;
      band.position.set(x, y, -51);
      decor.add(band);
    }
  }
  // A layered distant treeline replaces the empty horizon.
  const foliage = m("#53694c"),
    bark = materials.wood;
  let seed = 721;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 35; i++) {
    const x = (i % 2 ? 1 : -1) * (40 + random() * 18),
      z = -62 + random() * 88,
      h = 4 + random() * 4;
    box(0.3, h, 0.3, bark, x, h / 2, z);
    for (let j = 0; j < 3; j++) {
      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        foliage,
      );
      crown.scale.set(2.1, 2.4, 2);
      crown.position.set(
        x + (random() - 0.5) * 2,
        h - 1 + j * 0.8,
        z + (random() - 0.5) * 2,
      );
      decor.add(crown);
    }
  }
  batchStatic(decor);
  // Instanced grass is one draw call and never obstructs navigation or pickups.
  const blade = new THREE.BufferGeometry();
  blade.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -0.07, 0, 0, 0.07, 0, 0, 0.02, 0.42, 0.05, 0, 0, -0.07, 0, 0, 0.07,
        0.05, 0.35, 0.01,
      ],
      3,
    ),
  );
  blade.computeVertexNormals();
  const grass = new THREE.InstancedMesh(
    blade,
    new THREE.MeshStandardMaterial({
      color: "#89935e",
      side: THREE.DoubleSide,
      roughness: 1,
    }),
    7000,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 7000; i++) {
    const x = (random() - 0.5) * 94,
      z = -55 + random() * 76;
    const path =
      Math.abs(x) < 7 ||
      (z > -7 && z < 1) ||
      (z > -18 && z < -12) ||
      (x > -22 && x < 39 && z > -15 && z < 14) ||
      (Math.abs(x) < 20 && z < -18);
    dummy.position.set(x, path ? -2 : 0, z);
    dummy.rotation.y = random() * 6.28;
    dummy.scale.setScalar(0.5 + random() * 1.4);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }
  grass.receiveShadow = true;
  scene.add(grass);
  // Soft pooled smoke sprites and a luminous exhaust, only active at launch.
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d"),
    g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(235,228,210,.6)");
  g.addColorStop(1, "rgba(235,228,210,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const smokeMap = new THREE.CanvasTexture(c),
    smoke = [];
  for (let i = 0; i < 28; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeMap,
        transparent: true,
        depthWrite: false,
      }),
    );
    sprite.visible = false;
    scene.add(sprite);
    smoke.push(sprite);
  }
  const exhaust = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 1.6, 16),
    new THREE.MeshBasicMaterial({
      color: "#ffd27b",
      transparent: true,
      opacity: 0.9,
    }),
  );
  exhaust.rotation.z = Math.PI;
  exhaust.visible = false;
  scene.add(exhaust);
  return {
    setQuality(fast) {
      grass.visible = !fast;
      renderer.setPixelRatio(fast ? 0.75 : Math.min(devicePixelRatio, 1.5));
    },
    update(flight, rocket) {
      const active = flight && flight.time > 3;
      exhaust.visible = !!active && flight.success;
      if (exhaust.visible) {
        exhaust.position.copy(rocket.position);
        exhaust.position.y -= 0.5;
        exhaust.scale.y = 0.8 + Math.sin(flight.time * 45) * 0.2;
      }
      for (let i = 0; i < smoke.length; i++) {
        const p = smoke[i];
        p.visible = !!active;
        if (!active) continue;
        const age = (flight.time - 3 + i * 0.12) % 2.8,
          angle = i * 2.399;
        p.position.set(
          26 + Math.cos(angle) * age * 0.9,
          0.2 + age * 0.55,
          7 + Math.sin(angle) * age * 0.9,
        );
        p.scale.setScalar(0.5 + age * 1.6);
        p.material.opacity = (1 - age / 2.8) * 0.6;
      }
    },
  };
}
