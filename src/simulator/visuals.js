import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Texture detail is generated once; no image downloads or per-frame allocations.
export function surfaceTexture(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  let seed = 95;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  ctx.fillStyle =
    kind === "wood" ? "#dbbc91" : kind === "bedding" ? "#d8bd8b" : "#dad4c8";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < (kind === "fur" ? 4500 : 1600); i++) {
    const x = random() * 256,
      y = random() * 256;
    ctx.strokeStyle =
      kind === "wood"
        ? `rgba(104,65,31,${0.02 + random() * 0.12})`
        : `rgba(${random() > 0.5 ? "255,249,226" : "90,66,42"},${0.04 + random() * 0.2})`;
    ctx.lineWidth = kind === "fur" ? 0.6 : 0.5 + random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (kind === "wood")
      ctx.bezierCurveTo(
        x + 20,
        y - 2,
        x + 35,
        y + 3,
        x + 45 + random() * 80,
        y,
      );
    else
      ctx.lineTo(
        x + (kind === "fur" ? 1 : random() * 8),
        y + 2 + random() * (kind === "fur" ? 6 : 5),
      );
    ctx.stroke();
  }
  if (kind === "wood") {
    for (let row = 0; row < 160; row++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(78,45,20,${0.035 + random() * 0.075})`;
      ctx.lineWidth = 0.35 + random() * 0.7;
      for (let x = 0; x <= 256; x += 4) {
        const y = row * 1.6 + Math.sin(x / 45 + row * 0.09) * 2;
        if (!x) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.setScalar(kind === "bedding" ? 12 : kind === "fur" ? 3 : 1);
  texture.anisotropy = 4;
  return texture;
}
export function furMaterial(color) {
  const texture = surfaceTexture("fur");
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    map: texture,
    bumpMap: texture,
    bumpScale: 0.022,
  });
}
// Static props share a handful of draw calls instead of hundreds. Exclusions
// retain their transforms for the wheel animation, roof fade and moving paws.
export function batchStatic(root, excluded = new Set()) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(),
    groups = new Map();
  root.traverse((object) => {
    if (
      !object.isMesh ||
      object.isInstancedMesh ||
      Array.isArray(object.material)
    )
      return;
    for (let parent = object; parent; parent = parent.parent) {
      if (excluded.has(parent)) return;
      if (parent === root) break;
    }
    const id = object.material.uuid;
    if (!groups.has(id))
      groups.set(id, {
        material: object.material,
        objects: [],
        geometries: [],
        cast: false,
      });
    const group = groups.get(id);
    group.objects.push(object);
    group.cast ||= object.castShadow;
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();
    group.geometries.push(
      geometry.applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld),
      ),
    );
  });
  for (const group of groups.values()) {
    const geometry = mergeGeometries(group.geometries, false);
    if (!geometry) throw new Error("Unable to batch static geometry");
    const merged = new THREE.Mesh(geometry, group.material);
    merged.castShadow = group.cast;
    merged.receiveShadow = true;
    group.objects.forEach((object) => object.removeFromParent());
    group.geometries.forEach((g) => g.dispose());
    root.add(merged);
  }
}
export function contactShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d"),
    gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, "rgba(49,34,17,.34)");
  gradient.addColorStop(0.5, "rgba(49,34,17,.16)");
  gradient.addColorStop(1, "rgba(49,34,17,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 2),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.12;
  return shadow;
}

// Short tapered hairs follow the actual ellipsoid surface, including its silhouette.
// One geometry per animal keeps the coat affordable and free of transparent layers.
export function furCoat(patches, color) {
  const positions = [],
    colors = [];
  const base = new THREE.Color(color);
  let seed = 418;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const normal = new THREE.Vector3(),
    tangent = new THREE.Vector3();
  for (const [cx, cy, cz, sx, sy, sz, count] of patches) {
    for (let i = 0; i < count; i++) {
      const y = random() * 2 - 1,
        angle = random() * Math.PI * 2;
      const radius = Math.sqrt(1 - y * y);
      const x = radius * Math.cos(angle),
        z = radius * Math.sin(angle);
      normal.set(x / sx, y / sy, z / sz).normalize();
      tangent.set(normal.z, 0, -normal.x).normalize();
      const p = new THREE.Vector3(cx + x * sx, cy + y * sy, cz + z * sz);
      const width = 0.003 + random() * 0.003;
      const length = 0.025 + random() * 0.045;
      const tip = p.clone().addScaledVector(normal, length);
      tip.y -= length * 0.23;
      const a = p.clone().addScaledVector(tangent, width);
      const b = p.clone().addScaledVector(tangent, -width);
      positions.push(...a.toArray(), ...b.toArray(), ...tip.toArray());
      const shade = 0.55 + random() * 0.65;
      const c = base.clone().multiplyScalar(shade);
      for (let v = 0; v < 3; v++) colors.push(c.r, c.g, c.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      side: THREE.DoubleSide,
    }),
  );
}

export function shavingGeometry() {
  const points = [],
    indices = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const height = Math.sin(t * Math.PI * 1.35) * 0.26;
    const width = 0.5 * (0.65 + Math.sin(t * Math.PI) * 0.35);
    points.push(t - 0.5, height, -width, t - 0.5, height + 0.025, width);
    if (i < 6) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
