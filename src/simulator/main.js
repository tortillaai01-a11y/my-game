import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import "./style.css";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Tunnels } from "./tunnels.js";
import {
  createSupply,
  consumeSupply,
  advanceSupply,
  claimedPlace,
  wantsPlace,
  MAX_TUNNEL_LEVEL,
  tunnelCell,
  TUNNEL_DEPTH,
  TUNNEL_SIZE,
} from "./world.js";
import { MovementInput } from "./controls.js";
import { resolvePenetration } from "./collision.js";
import {
  surfaceTexture,
  furCoat,
  shavingGeometry,
  furMaterial,
  batchStatic,
  contactShadow,
} from "./visuals.js";
import {
  freshNeeds,
  tickNeeds,
  fallDamage,
  hurt,
  fight,
  MAX_CAPACITY,
} from "./model.js";

const $ = (id) => document.getElementById(id);
document.querySelector("#app").innerHTML =
  `<div id="interface"><div class="top"><div class="brand"><div class="logo">🐹</div><div><h1>Хомячьи будни</h1><p>Маленькая жизнь · большой уют</p></div></div><div class="top-right"><div class="pill"><i></i>Свободный день <span id="time">08:00</span></div><button class="quality-button" id="quality" title="Переключить качество изображения">Графика: авто</button><button class="icon-button" id="pause" title="Пауза и управление">II</button></div></div><div class="side-note"><strong>Твой маленький мир</strong>Одна клетка. Два характера.<br>Никаких заданий и спешки.<br><span id="neighbor">Сосед осматривается</span></div><div class="bottom"><button id="prompt"></button><div class="stats">${[
    ["health", "Здоровье", "♡", "#d58c7d"],
    ["stamina", "Выносливость", "ϟ", "#8f9eb5"],
    ["food", "Сытость", "◒", "#c6a36c"],
    ["water", "Вода", "◈", "#7daeb7"],
  ]
    .map(
      ([id, title, icon, color]) =>
        `<div class="stat" id="card-${id}" style="--color:${color}"><div class="stat-head">${title}<span>${icon}</span></div><b id="${id}">100</b> <small id="max-${id}">/ 100</small><div class="bar"><div id="bar-${id}" style="width:100%"></div></div></div>`,
    )
    .join(
      "",
    )}</div><div class="controls"><span><b>WASD / ↑↓←→</b> ходить</span><span><b>SHIFT</b> бежать</span><span><b>ПРОБЕЛ</b> прыгнуть</span><span><b>E</b> действие</span><span><b>F</b> толкнуть</span><span><b>B</b> рыть</span><span><b>МЫШЬ + ЗАЖАТИЕ</b> обзор</span></div></div></div><div id="toast"></div><div id="hurt"></div><div id="mobile"><div class="dpad"><span></span><button data-key="KeyW">↑</button><span></span><button data-key="KeyA">←</button><button data-key="KeyS">↓</button><button data-key="KeyD">→</button></div><div class="actions"><button data-action="jump">↟</button><button data-action="interact">E</button><button data-action="fight">F</button><button data-action="dig">B</button><button data-action="deeper">Q ↓</button><button data-action="higher">R ↑</button></div></div><div id="veil"><div class="welcome"><div class="eyebrow">Симулятор хомячьей жизни</div><h2 id="modal-title">Просто быть<br>хомяком.</h2><p id="modal-text">Пошурши наполнителем, поешь, попей и покрути колесо. Рядом живёт ещё один хомяк — колесо у вас общее. Здесь некуда спешить и нечего выигрывать.</p><div class="keys">Приблизься к миске, поилке, домику или колесу и нажми <b>E</b>. Повторное нажатие завершает действие.<br><b>Колесо</b> тренирует запас выносливости до 250, но утомляет и вдвое быстрее расходует воду.<br><b>F</b> — толкнуть соседа. Плюш требует дом или колесо, только когда сам хочет спать или бегать.<br><b>B</b> — рыть тоннель / выбраться; WASD — прокладывать ход, <b>Q / R</b> — глубже / выше (5 уровней). Тоннели показаны в разрезе.<br>Пустые миски и поилки пополняются через 30 секунд.</div><button id="start">Заселиться в клетку →</button><a href="./rocket.html">Новая игра: «До орбиты» 🚀</a><br><a href="./shooter.html">Перейти к игре «Кормовой переворот»</a><p class="sub">Состояние сохраняется автоматически в этом браузере</p></div></div>`;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#dfe8df");
scene.fog = new THREE.Fog("#dfe8df", 32, 68);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
let qualityMode = "auto";
try {
  const saved = localStorage.getItem("hamster-graphics");
  if (["auto", "high", "fast"].includes(saved)) qualityMode = saved;
} catch {}
let resolutionScale =
  qualityMode === "fast"
    ? 0.75
    : Math.min(devicePixelRatio, qualityMode === "high" ? 2 : 1.5);
renderer.setPixelRatio(resolutionScale);
function updateQualityLabel() {
  $("quality").textContent =
    "Графика: " + { auto: "авто", high: "чётче", fast: "быстрее" }[qualityMode];
}
updateQualityLabel();
$("quality").onclick = () => {
  qualityMode = { auto: "high", high: "fast", fast: "auto" }[qualityMode];
  resolutionScale =
    qualityMode === "fast"
      ? 0.75
      : Math.min(devicePixelRatio, qualityMode === "high" ? 2 : 1.5);
  renderer.setPixelRatio(resolutionScale);
  updateQualityLabel();
  renderer.shadowMap.needsUpdate = true;
  try {
    localStorage.setItem("hamster-graphics", qualityMode);
  } catch {}
  renderer.domElement.focus({ preventScroll: true });
};
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// Cage lighting is fixed. Bake static shadows once; moving hamsters use soft
// contact shadows so low-end machines do not redraw the whole cage twice.
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.94;
const environmentGenerator = new THREE.PMREMGenerator(renderer);
const environmentRoom = new RoomEnvironment();
const environmentMap = environmentGenerator.fromScene(environmentRoom, 0.04);
scene.environment = environmentMap.texture;
scene.environmentIntensity = 0.38;
environmentRoom.dispose();
environmentGenerator.dispose();
document.querySelector("#app").prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(
  52,
  innerWidth / innerHeight,
  0.1,
  90,
);
scene.add(new THREE.HemisphereLight("#e9f2ff", "#655340", 0.85));
const sun = new THREE.DirectionalLight("#fff0db", 3.2);
sun.position.set(-12, 19, -8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -17,
  right: 17,
  top: 17,
  bottom: -17,
  near: 1,
  far: 65,
});
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.025;
sun.shadow.radius = 3;
scene.add(sun);
const material = (color, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const M = {
  bedding: material("#d6bc88"),
  chip: material("#e4cba0"),
  cream: furMaterial("#fff0cf"),
  fur: furMaterial("#ce985b"),
  pale: furMaterial("#b9ada1"),
  pink: material("#d8a198"),
  dark: material("#201c19", 0.18),
  green: material("#91aa93"),
  wood: material("#c89e72"),
  roof: material("#8fa7a0"),
  metal: material("#c4c9cd", 0.25, 0.88),
  water: material("#95c5c9", 0.25),
  food: material("#a98a50"),
};
M.wood.map = surfaceTexture("wood");
M.wood.bumpMap = M.wood.map;
M.wood.bumpScale = 0.045;
M.wood.color.set("#f0d2a5");
M.bedding.map = surfaceTexture("bedding");
M.bedding.color.set("#fff5d9");
M.bedding.bumpMap = M.bedding.map;
M.bedding.bumpScale = 0.05;
M.dark = new THREE.MeshPhysicalMaterial({
  color: "#100e0c",
  roughness: 0.08,
  clearcoat: 1,
  clearcoatRoughness: 0.03,
});
M.pink.roughness = 0.52;
M.chip.side = THREE.DoubleSide;
M.chip.map = surfaceTexture("wood");
M.water = new THREE.MeshPhysicalMaterial({
  color: "#8cc6cf",
  roughness: 0.15,
  metalness: 0.1,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
});
const boxGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.035),
  sphereGeo = new THREE.SphereGeometry(1, 28, 20);
function mesh(geo, mat, parent = scene, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = !mat.transparent;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(w, h, d, mat, p = scene, x = 0, y = 0, z = 0) {
  const m = mesh(boxGeo, mat, p, x, y, z);
  m.scale.set(w, h, d);
  return m;
}
function ball(x, y, z, sx, sy, sz, mat, p = scene) {
  const m = mesh(sphereGeo, mat, p, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function cyl(top, bottom, height, mat, p = scene, x = 0, y = 0, z = 0) {
  return mesh(
    new THREE.CylinderGeometry(top, bottom, height, 32),
    mat,
    p,
    x,
    y,
    z,
  );
}
function textLabel(text, x, y, z) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff9e9";
  ctx.beginPath();
  ctx.roundRect(0, 0, 512, 96, 30);
  ctx.fill();
  ctx.fillStyle = "#5c6d5d";
  ctx.textAlign = "center";
  ctx.font = "600 32px Arial";
  ctx.fillText(text, 256, 59);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, depthWrite: false }),
  );
  s.scale.set(3, 0.56, 1);
  s.position.set(x, y, z);
  s.userData.text = text;
  s.userData.setText = (value) => {
    if (s.userData.text === value) return;
    s.userData.text = value;
    ctx.clearRect(0, 0, 512, 96);
    ctx.fillStyle = "#fff9e9";
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 96, 30);
    ctx.fill();
    ctx.fillStyle = "#5c6d5d";
    ctx.font = "600 28px Arial";
    ctx.fillText(value, 256, 59);
    map.needsUpdate = true;
  };
  scene.add(s);
  return s;
}
const tunnels = new Tunnels(scene, M.bedding);
const baseMaterial = M.green.clone(),
  tableMaterial = material("#c2c5b1");
for (const m of [baseMaterial, tableMaterial, M.bedding, M.chip])
  tunnels.cut(m);
box(26, 1, 22, baseMaterial, scene, 0, -0.6, 0);
box(25, 0.18, 21, M.bedding, scene, 0, -0.04, 0);
box(45, 0.7, 37, tableMaterial, scene, 0, -1.45, 0);
let seed = 713;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const chips = new THREE.InstancedMesh(shavingGeometry(), M.chip, 3800),
  dummy = new THREE.Object3D();
for (let i = 0; i < 3800; i++) {
  dummy.position.set(
    (rand() - 0.5) * 24.7,
    0.05 + rand() * 0.06,
    (rand() - 0.5) * 20.7,
  );
  dummy.rotation.set(rand() * 0.25, rand() * 6.28, rand() * 0.3);
  dummy.scale.set(
    0.13 + rand() * 0.5,
    0.16 + rand() * 0.18,
    0.06 + rand() * 0.2,
  );
  dummy.updateMatrix();
  chips.setMatrixAt(i, dummy.matrix);
  chips.setColorAt(
    i,
    new THREE.Color().setHSL(0.105 + rand() * 0.02, 0.35, 0.65 + rand() * 0.15),
  );
}
chips.receiveShadow = true;
scene.add(chips);
const frontRail = material("#b7c7bb");
frontRail.transparent = true;
frontRail.opacity = 0.12;
frontRail.depthWrite = false;
for (const z of [-10.8, 10.8]) {
  box(25.8, 0.65, 0.2, M.green, scene, 0, 0.25, z);
  for (let x = -12.5; x <= 12.5; x += 1.15)
    cyl(0.035, 0.035, 9, z > 0 ? frontRail : M.metal, scene, x, 4.7, z);
  box(25.8, 0.1, 0.1, z > 0 ? frontRail : M.metal, scene, 0, 9.2, z);
}
for (const x of [-12.8, 12.8]) {
  box(0.2, 0.65, 21.8, M.green, scene, x, 0.25, 0);
  for (let z = -10.5; z <= 10.5; z += 1.15)
    cyl(0.035, 0.035, 9, frontRail, scene, x, 4.7, z);
  box(0.1, 0.1, 21.8, M.metal, scene, x, 9.2, 0);
}
// One shared wheel, with independently rotating treads.
const wheelPosition = new THREE.Vector3(-6, 0, -5);
const wheel = new THREE.Group();
wheel.position.copy(wheelPosition);
scene.add(wheel);
box(4.9, 0.25, 2.7, M.green, wheel, 0, 0.18, 0);
box(0.2, 3.2, 0.35, M.metal, wheel, 0, 1.7, -0.8);
const spin = new THREE.Group();
spin.position.y = 2.55;
wheel.add(spin);
for (const z of [-0.8, 0.8])
  mesh(new THREE.TorusGeometry(2.25, 0.13, 12, 64), M.roof, spin, 0, 0, z);
for (let i = 0; i < 32; i++) {
  const a = (i * Math.PI) / 16;
  const tread = box(
    0.34,
    0.12,
    1.65,
    M.wood,
    spin,
    Math.sin(a) * 2.25,
    Math.cos(a) * 2.25,
    0,
  );
  tread.rotation.z = -a;
}
for (let i = 0; i < 6; i++) {
  const spoke = box(0.085, 4.5, 0.09, M.metal, spin, 0, 0, -0.82);
  spoke.rotation.z = (i * Math.PI) / 3;
}
textLabel("Общее колесо", -6, 5.4, -5);
// One house, an open doorway, a flat roof and a walkable ramp.
const home = new THREE.Group();
home.position.set(6, 0, -5);
scene.add(home);
box(0.25, 3, 6, M.wood, home, -3, 1.5, 0);
box(0.25, 3, 6, M.wood, home, 3, 1.5, 0);
box(6, 3, 0.25, M.wood, home, 0, 1.5, -3);
box(1.8, 3, 0.25, M.wood, home, -2.1, 1.5, 3);
box(1.8, 3, 0.25, M.wood, home, 2.1, 1.5, 3);
box(2.4, 0.9, 0.25, M.wood, home, 0, 2.55, 3);
const houseRoof = box(6.5, 0.2, 6.5, M.roof.clone(), home, 0, 3.1, 0);
houseRoof.material.transparent = true;
const bed = ball(0, 0.15, 0, 1.2, 0.15, 1.3, M.cream, home);
const ramp = box(1.7, 0.14, Math.hypot(6, 3.2), M.wood, scene, 8, 1.6, 1);
ramp.rotation.x = Math.atan2(3.2, 6);
for (let i = 0; i < 11; i++)
  box(1.7, 0.09, 0.13, M.cream, scene, 8, 0.15 + i * 0.29, 3.8 - i * 0.55);
textLabel("Дом · отдых и сон", 6, 4.2, -5);
const stations = [];
const dynamicSupplies = new Set();
for (const [i, x] of [-8, 8].entries()) {
  const g = new THREE.Group();
  g.position.set(x, 0, 5.4);
  scene.add(g);
  cyl(1.1, 0.9, 0.52, i ? M.roof : M.green, g, 0, 0.3, 0);
  const contents = new THREE.Group();
  contents.position.y = 0.57;
  g.add(contents);
  dynamicSupplies.add(contents);
  cyl(0.94, 0.94, 0.06, M.food, contents, 0, 0, 0);
  const rim = mesh(
    new THREE.TorusGeometry(1.02, 0.065, 8, 32),
    i ? M.roof : M.green,
    g,
    0,
    0.56,
    0,
  );
  rim.rotation.x = Math.PI / 2;
  for (let j = 0; j < 28; j++) {
    const a = rand() * 6.28,
      r = rand() * 0.8;
    ball(
      Math.cos(a) * r,
      0.08 + rand() * 0.06,
      Math.sin(a) * r,
      0.12,
      0.07,
      0.08,
      j % 2 ? M.wood : M.cream,
      contents,
    );
  }
  stations.push({
    id: `food-${i}`,
    type: "food",
    x,
    z: 5.4,
    name: "Поесть из миски",
    supply: createSupply(),
    visual: contents,
    label: textLabel("Корм · 60 / 60", x, 1.8, 5.4),
  });
}
for (const [i, x] of [-10, 10].entries()) {
  const g = new THREE.Group();
  g.position.set(x, 0, -0.3);
  scene.add(g);
  box(0.16, 3, 0.16, M.metal, g, 0, 1.5, -0.3);
  const glass = material("#d6eaeb", 0.2);
  glass.transparent = true;
  glass.opacity = 0.22;
  glass.depthWrite = false;
  cyl(0.45, 0.45, 1.9, glass, g, 0, 2.3, 0);
  const bottle = cyl(0.4, 0.4, 1.8, M.water, g, 0, 2.3, 0);
  dynamicSupplies.add(bottle);
  cyl(0.46, 0.46, 0.2, i ? M.roof : M.green, g, 0, 3.3, 0);
  const nozzle = cyl(0.09, 0.09, 0.7, M.metal, g, 0, 1.2, 0.25);
  nozzle.rotation.x = -0.6;
  ball(0, 0.87, 0.46, 0.12, 0.13, 0.12, M.water, g);
  stations.push({
    id: `water-${i}`,
    type: "water",
    x,
    z: 0.3,
    name: "Попить из поилки",
    supply: createSupply(),
    visual: bottle,
    label: textLabel("Вода · 60 / 60", x, 3.9, -0.3),
  });
}
// A sunlit room beyond the cage gives the small habitat a sense of scale.
const roomWall = material("#e0d6c0");
box(48, 23, 0.5, roomWall, scene, 0, 8, -16);
box(14, 11, 0.3, material("#f7edd8"), scene, -9, 9, -15.6);
box(12.8, 9.8, 0.15, material("#a8c8ce"), scene, -9, 9, -15.35);
box(0.22, 10, 0.22, M.cream, scene, -9, 9, -15.15);
box(13, 0.22, 0.22, M.cream, scene, -9, 9, -15.15);
box(14, 0.3, 1.6, M.cream, scene, -9, 3.6, -15);
for (const x of [-3.08, 3.08]) box(0.18, 3, 0.18, M.cream, home, x, 1.5, 3.1);
box(2.6, 0.15, 0.35, M.cream, home, 0, 2.12, 3.13);
for (const z of [-3.25, 3.25]) box(6.7, 0.12, 0.14, M.green, home, 0, 2.98, z);
for (const x of [-3.25, 3.25]) box(0.14, 0.12, 6.7, M.green, home, x, 2.98, 0);
const houseWindow = mesh(
  new THREE.TorusGeometry(0.46, 0.08, 10, 32),
  M.cream,
  home,
  -1.98,
  1.7,
  3.14,
);
const windowPane = cyl(
  0.4,
  0.4,
  0.045,
  material("#536659"),
  home,
  -1.98,
  1.7,
  3.16,
);
windowPane.rotation.x = Math.PI / 2;
box(0.055, 0.76, 0.07, M.cream, home, -1.98, 1.7, 3.2);
box(0.76, 0.055, 0.07, M.cream, home, -1.98, 1.7, 3.2);
batchStatic(scene, new Set([spin, houseRoof, ...dynamicSupplies]));
batchStatic(spin);
for (const station of stations)
  if (station.type === "food") batchStatic(station.visual);
spin.traverse((o) => {
  if (o.isMesh) o.castShadow = false;
});
function hamster(fur) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  ball(0, 0.65, 0, 0.55, 0.59, 0.7, fur, body);
  ball(0, 0.65, 0.58, 0.42, 0.39, 0.19, M.cream, body);
  ball(0, 1.17, 0.28, 0.57, 0.48, 0.49, fur, body);
  for (const x of [-0.4, 0.4]) {
    ball(x, 1.55, 0.24, 0.2, 0.24, 0.13, fur, body);
    ball(x, 1.56, 0.35, 0.12, 0.15, 0.035, M.pink, body);
    ball(x * 0.65, 1.25, 0.69, 0.075, 0.09, 0.055, M.dark, body);
    ball(x * 0.65 - 0.018, 1.278, 0.735, 0.023, 0.025, 0.014, M.cream, body);
    ball(x * 0.75, 1.02, 0.68, 0.21, 0.18, 0.13, M.cream, body);
  }
  ball(0, 1.11, 0.8, 0.08, 0.06, 0.06, M.pink, body);
  const feet = [];
  for (const x of [-0.3, 0.3])
    for (const z of [-0.3, 0.38])
      feet.push(ball(x, 0.13, z, 0.17, 0.13, 0.23, fur, body));
  ball(0, 0.4, -0.68, 0.12, 0.12, 0.15, M.pink, body);
  // Fine whiskers, nose bridge and a little mouth, all visible at close range.
  const whiskers = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      whiskers.push(
        side * 0.25,
        1.04,
        0.77,
        side * (0.68 + i * 0.055),
        1.01 + (i - 1) * 0.075,
        0.82,
      );
    }
  whiskers.push(
    -0.1,
    0.985,
    0.795,
    0,
    0.96,
    0.81,
    0,
    0.96,
    0.81,
    0.1,
    0.985,
    0.795,
  );
  const lines = new THREE.BufferGeometry();
  lines.setAttribute("position", new THREE.Float32BufferAttribute(whiskers, 3));
  body.add(
    new THREE.LineSegments(
      lines,
      new THREE.LineBasicMaterial({
        color: "#73604b",
        transparent: true,
        opacity: 0.65,
      }),
    ),
  );
  const outerCoat = furCoat(
    [
      [0, 0.65, 0, 0.55, 0.59, 0.7, 10000],
      [0, 1.17, 0.28, 0.57, 0.48, 0.49, 8500],
      [-0.4, 1.55, 0.24, 0.2, 0.24, 0.13, 800],
      [0.4, 1.55, 0.24, 0.2, 0.24, 0.13, 800],
    ],
    fur.color,
  );
  const coat = new THREE.Group();
  coat.add(
    outerCoat,
    furCoat(
      [
        [0, 0.65, 0.58, 0.42, 0.39, 0.19, 3000],
        [-0.3, 1.02, 0.68, 0.21, 0.18, 0.13, 1300],
        [0.3, 1.02, 0.68, 0.21, 0.18, 0.13, 1300],
      ],
      M.cream.color,
    ),
  );
  body.add(coat);
  for (const foot of feet) {
    for (let toe = -1; toe <= 1; toe++)
      ball(toe * 0.22, -0.12, 0.65, 0.15, 0.25, 0.35, M.pink, foot);
  }
  const shadow = contactShadow();
  scene.add(shadow);
  batchStatic(body, new Set([...feet, coat]));
  body.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  return { root, body, feet, shadow, coat };
}
const player = hamster(M.fur),
  bot = hamster(M.pale);
scene.add(player.root, bot.root);
player.root.position.set(0, 0, 4);
bot.root.position.set(-4, 0, -3);
const botLabel = textLabel("Плюш · сосед", -4, 2.3, -3);
const keys = new MovementInput();
let needs = freshNeeds(),
  botNeeds = freshNeeds();
let paused = true,
  dead = false,
  activity = "rest",
  botActivity = "wander",
  wheelOwner = null;
let t = 0,
  worldTime = 0,
  verticalSpeed = 0,
  peak = 0,
  grounded = true,
  yaw = 0,
  distance = 10,
  drag = false,
  pitch = 0.54,
  lastFrame = performance.now(),
  actionCooldown = 0,
  botCooldown = 0,
  botTimer = 4,
  saveTimer = 0,
  toastTimer = 0;
let botTarget = new THREE.Vector3(-4, 0, -3);
let lastCapacity = 100;
let activeStation = null,
  botStation = null,
  burrowing = false,
  digTarget = null,
  digProgress = 0;
let savedTunnels = [],
  savedBurrowing = false,
  territory = null,
  tunnelLevel = 1,
  botDesire = null;

let storageWorks = true;
function notify(message) {
  $("toast").textContent = message;
  $("toast").style.opacity = 1;
  toastTimer = 3;
}
function save() {
  if (dead) return;
  try {
    localStorage.setItem(
      "hamster-life-v1",
      JSON.stringify({
        needs,
        position:
          activity === "wheel" ? [-6, 0, -2.9] : player.root.position.toArray(),
        worldTime,
        supplies: stations.map((s) => ({ id: s.id, ...s.supply })),
        tunnels: tunnels.snapshot(),
        burrowing,
        tunnelLevel,
      }),
    );
  } catch {
    storageWorks = false;
  }
}
try {
  const s = JSON.parse(localStorage.getItem("hamster-life-v1"));
  if (
    s &&
    s.needs &&
    Object.keys(freshNeeds()).every((k) => Number.isFinite(s.needs[k]))
  ) {
    needs = { ...freshNeeds(), ...s.needs };
    needs.capacity = THREE.MathUtils.clamp(needs.capacity, 100, MAX_CAPACITY);
    for (const k of ["health", "food", "water"])
      needs[k] = THREE.MathUtils.clamp(needs[k], 0, 100);
    needs.stamina = THREE.MathUtils.clamp(needs.stamina, 0, needs.capacity);
    if (needs.health <= 0) needs = freshNeeds();
    if (
      Array.isArray(s.position) &&
      s.position.length === 3 &&
      s.position.every(Number.isFinite)
    ) {
      player.root.position.set(
        THREE.MathUtils.clamp(s.position[0], -11.5, 11.5),
        Math.max(0, Math.min(3.2, s.position[1])),
        THREE.MathUtils.clamp(s.position[2], -9.5, 9.5),
      );
      grounded = false;
    }
    worldTime = Number.isFinite(s.worldTime) ? s.worldTime : 0;
    lastCapacity = Math.floor(needs.capacity);
    for (const station of stations)
      station.supply = createSupply(
        s.supplies?.find?.((v) => v.id === station.id),
      );
    savedTunnels = s.tunnels || [];
    savedBurrowing = s.burrowing === true;
    tunnelLevel = Number.isInteger(s.tunnelLevel)
      ? THREE.MathUtils.clamp(s.tunnelLevel, 1, MAX_TUNNEL_LEVEL)
      : 1;
  }
} catch {
  storageWorks = false;
}
const solids = [
  { x: -6, z: -5, rx: 2.5, rz: 1.05, h: 4.8 },
  { x: 3, z: -5, rx: 0.15, rz: 3, h: 3 },
  { x: 9, z: -5, rx: 0.15, rz: 3, h: 3 },
  { x: 6, z: -8, rx: 3, rz: 0.15, h: 3 },
  { x: 3.9, z: -2, rx: 0.9, rz: 0.15, h: 3 },
  { x: 8.1, z: -2, rx: 0.9, rz: 0.15, h: 3 },
  ...stations.map((s) => ({
    x: s.x,
    z: s.type === "water" ? -0.3 : s.z,
    rx: s.type === "water" ? 0.35 : 1.05,
    rz: s.type === "water" ? 0.35 : 1.05,
    h: s.type === "water" ? 3.5 : 0.6,
  })),
];
tunnels.obstacles = solids;
tunnels.restore(savedTunnels);
tunnels.setLevel(tunnelLevel);
if (
  savedBurrowing &&
  tunnels.has(player.root.position.x, player.root.position.z)
) {
  burrowing = true;
  activity = "dig";
  grounded = true;
  player.root.position.y = TUNNEL_DEPTH * tunnelLevel;
}
function canMove(x, z, y) {
  return (
    Math.abs(x) < 12.1 &&
    Math.abs(z) < 10.1 &&
    !solids.some(
      (o) =>
        y < o.h - 0.05 &&
        Math.abs(x - o.x) < o.rx + 0.38 &&
        Math.abs(z - o.z) < o.rz + 0.38,
    )
  );
}
function surface(x, z, y) {
  if (x > 7.12 && x < 8.88 && z >= -2.2 && z <= 4.15)
    return THREE.MathUtils.clamp(((4 - z) / 6) * 3.2, 0, 3.2);
  if (x > 2.75 && x < 9.25 && z > -8.25 && z < -1.75 && y >= 2.95) return 3.2;
  return 0;
}
function move(root, dx, dz) {
  const p = root.position;
  const sy = surface(p.x + dx, p.z + dz, p.y);
  const y =
    grounded && root === player.root && sy - p.y < 0.3
      ? Math.max(p.y, sy)
      : p.y;
  if (canMove(p.x + dx, p.z, y)) p.x += dx;
  if (canMove(p.x, p.z + dz, y)) p.z += dz;
}
function stop() {
  if (wheelOwner === "player") {
    wheelOwner = null;
    player.root.position.set(-6, 0, -2.9);
    grounded = true;
  }
  if (burrowing) {
    burrowing = false;
    tunnelLevel = 1;
    tunnels.setLevel(1);
    player.root.position.y = 0;
    verticalSpeed = 0;
    grounded = true;
    digTarget = null;
    digProgress = 0;
  }
  activeStation = null;
  activity = "rest";
}
function nearby() {
  const p = player.root.position;
  if (activity !== "rest")
    return {
      type: "stop",
      name:
        activity === "wheel"
          ? "Сойти с колеса"
          : activity === "dig"
            ? "Выбраться из тоннеля"
            : activity === "sleep"
              ? "Проснуться"
              : "Закончить",
    };
  if (p.y < 0.7) {
    for (const s of stations)
      if (Math.hypot(p.x - s.x, p.z - s.z) < 2.25)
        return {
          ...s,
          name:
            s.supply.stock > 0
              ? `${s.name} · ${Math.ceil(s.supply.stock)} / 60`
              : `Пусто · пополнение через ${Math.ceil(s.supply.refill)} с`,
        };
    if (Math.hypot(p.x + 6, p.z + 5) < 3.7)
      return {
        type: "wheel",
        name:
          wheelOwner === "bot"
            ? "Колесо занято Плюшем · F — прогнать"
            : "Бежать в колесе",
      };
    if (p.x > 4.3 && p.x < 7.5 && p.z < -1 && p.z > -7)
      return { type: "sleep", name: "Отдохнуть в домике" };
  }
  return null;
}
function interact() {
  if (paused || dead) return;
  const n = nearby();
  if (!n) return;
  if (n.type === "stop") {
    stop();
    return;
  }
  if (n.type === "wheel") {
    if (wheelOwner === "bot") {
      notify("Плюш занят. Можно подождать или толкнуть его клавишей F.");
      return;
    }
    if (needs.stamina < 12) {
      notify("Сначала немного отдохни: мало выносливости.");
      return;
    }
    wheelOwner = "player";
    player.root.position.set(-6, 0.45, -5);
    player.root.rotation.y = Math.PI / 2;
    verticalSpeed = 0;
  }
  if (n.type === "food" || n.type === "water") {
    activeStation = stations.find((s) => s.id === n.id);
    if (!activeStation.supply.stock) {
      notify(
        `Запас появится через ${Math.ceil(activeStation.supply.refill)} с.`,
      );
      activeStation = null;
      return;
    }
  }
  activity = n.type;
  if (activity === "sleep") {
    player.root.position.set(6, 0, -4.5);
    verticalSpeed = 0;
    grounded = true;
    notify(
      "Сон восстанавливает здоровье. Плюш придёт сюда, когда захочет отдохнуть.",
    );
  }
}
function toggleDig() {
  if (paused || dead) return;
  if (burrowing) {
    stop();
    notify("Ты выбрался на поверхность.");
    return;
  }
  const p = player.root.position;
  if (!grounded || p.y > 0.2 || !tunnels.allowed(p.x, p.z)) {
    notify("Рыть можно в свободном наполнителе, подальше от предметов.");
    return;
  }
  if (needs.stamina < 10) {
    notify("Для рытья нужно немного отдохнуть.");
    return;
  }
  stop();
  needs.stamina -= 5;
  burrowing = true;
  activity = "dig";
  verticalSpeed = 0;
  if (tunnels.has(p.x, p.z)) {
    p.y = TUNNEL_DEPTH * tunnelLevel;
    digTarget = null;
  } else {
    const c = tunnelCell(p.x, p.z);
    digTarget = { x: c.x * TUNNEL_SIZE, z: c.z * TUNNEL_SIZE };
    digProgress = 0;
  }
  notify("WASD — рыть, Q — глубже, R — выше, B — поверхность.");
}
function changeDepth(direction) {
  if (paused || dead || !burrowing || digTarget) return;
  const level = tunnelLevel + direction;
  if (level < 1 || level > MAX_TUNNEL_LEVEL) {
    notify(
      level < 1
        ? "B — выбраться на поверхность."
        : "Это самое дно: пятый уровень.",
    );
    return;
  }
  if (needs.stamina < 10) {
    notify("Сначала отдохни.");
    return;
  }
  const c = tunnelCell(player.root.position.x, player.root.position.z);
  digTarget = { x: c.x * TUNNEL_SIZE, z: c.z * TUNNEL_SIZE, level };
  digProgress = 0;
}
function updateDig(dt, dx, dz) {
  const p = player.root.position;
  if (needs.stamina < 1) {
    stop();
    notify("Лапки устали — пора отдохнуть.");
    return;
  }
  if (digTarget) {
    digProgress += dt;
    player.body.rotation.x = Math.sin(t * 18) * 0.12;
    if (digProgress >= 0.7) {
      if (
        tunnels.carve(digTarget.x, digTarget.z, digTarget.level ?? tunnelLevel)
      ) {
        tunnelLevel = digTarget.level ?? tunnelLevel;
        tunnels.setLevel(tunnelLevel);
        p.set(digTarget.x, TUNNEL_DEPTH * tunnelLevel, digTarget.z);
      } else notify("Здесь мешает предмет или край клетки.");
      digTarget = null;
      digProgress = 0;
    }
  } else if (dx || dz) {
    const wx = dx * Math.cos(yaw) + dz * Math.sin(yaw),
      wz = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const x = p.x + wx * 1.9 * dt,
      z = p.z + wz * 1.9 * dt;
    player.root.rotation.y = Math.atan2(wx, wz);
    if (tunnels.allowed(x, z)) {
      if (tunnels.has(x, z)) {
        p.x = x;
        p.z = z;
      } else {
        const previous = tunnelCell(p.x, p.z),
          next = tunnelCell(x, z);
        // Carve one cardinal neighbor at a time: diagonal input cannot create disconnected holes.
        if (previous.x !== next.x && previous.z !== next.z) next.z = previous.z;
        digTarget = { x: next.x * TUNNEL_SIZE, z: next.z * TUNNEL_SIZE };
        digProgress = 0;
      }
    }
  }
  animateHamster(player, !!(digTarget || dx || dz), t * 1.4);
}
function jump() {
  if (paused || dead || !grounded) return;
  if (burrowing) {
    stop();
    return;
  }
  if (activity !== "rest") stop();
  if (needs.stamina < 8) {
    notify("Не хватает сил для прыжка.");
    return;
  }
  needs.stamina -= 8;
  verticalSpeed = 6;
  grounded = false;
  peak = player.root.position.y;
}
function damage(amount) {
  if (!amount) return;
  needs = hurt(needs, amount);
  $("hurt").style.opacity = 0.6;
  setTimeout(() => ($("hurt").style.opacity = 0), 230);
}
function pushBot() {
  if (paused || dead || actionCooldown > 0) return;
  const dist = player.root.position.distanceTo(bot.root.position);
  if (dist > (wheelOwner === "bot" ? 3.7 : 2.2)) {
    notify("Плюш слишком далеко. Подойди ближе.");
    return;
  }
  const hit = fight(needs, botNeeds);
  if (!hit) {
    notify("Для толчка нужно 15 выносливости.");
    return;
  }
  stop();
  needs = hit.attacker;
  botNeeds = hit.defender;
  actionCooldown = 1.2;
  botCooldown = 0.65;
  botActivity = "angry";
  botTimer = 4;
  if (wheelOwner === "bot") {
    wheelOwner = null;
    bot.root.position.set(-4, 0, -2.5);
  }
  const away = bot.root.position
    .clone()
    .sub(player.root.position)
    .setY(0)
    .normalize();
  move(bot.root, away.x * 0.6, away.z * 0.6);
  notify("Плюш сердится! Драки отнимают здоровье у вас обоих.");
}
function modal(title, text, button) {
  $("modal-title").textContent = title;
  $("modal-text").textContent = text;
  $("start").textContent = button;
  $("veil").classList.remove("hidden");
}
function setPause(value) {
  paused = value;
  resetInput();
  save();
  if (paused)
    modal(
      "Тихий час",
      "Жизнь в клетке на паузе. Голод, жажда и сосед подождут.",
      "Вернуться к хомяку →",
    );
  else {
    $("veil").classList.add("hidden");
    renderer.domElement.focus({ preventScroll: true });
  }
}
$("start").onclick = () => {
  if (dead) {
    needs = freshNeeds();
    botNeeds = freshNeeds();
    player.root.position.set(0, 0, 4);
    bot.root.position.set(-4, 0, -3);
    botActivity = "wander";
    botTimer = 3;
    wheelOwner = null;
    activity = "rest";
    verticalSpeed = 0;
    grounded = true;
    peak = 0;
    burrowing = false;
    digTarget = null;
    digProgress = 0;
    ((territory = null), (tunnelLevel = 1), (botDesire = null));
    activeStation = botStation = null;
    tunnels.setLevel(1);
    tunnels.clear();
    for (const station of stations) station.supply = createSupply();
    dead = false;
    save();
  }
  setPause(false);
  if (!storageWorks)
    notify(
      "Браузер не разрешает сохранения: прогресс останется только до закрытия вкладки.",
    );
};
$("pause").onclick = () => {
  if (!dead) setPause(!paused);
};
$("prompt").onclick = interact;
const movementCodes = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
]);
const actionCodes = new Set([
  "Space",
  "KeyE",
  "KeyF",
  "KeyB",
  "KeyQ",
  "KeyR",
  "Escape",
]);
let cameraPointer = null,
  pointerX = 0,
  pointerY = 0;
renderer.domElement.tabIndex = 0;
renderer.domElement.style.outline = "none";
function resetInput() {
  keys.clear();
  drag = false;
  cameraPointer = null;
  document
    .querySelectorAll("[data-key]")
    .forEach((b) => b.classList.remove("pressed"));
}
window.addEventListener(
  "keydown",
  (e) => {
    if (e.code === "Escape") {
      e.preventDefault();
      if (!e.repeat && !dead) setPause(!paused);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      resetInput();
      return;
    }
    if (
      paused ||
      dead ||
      e.target.closest?.('input,textarea,select,[contenteditable="true"]')
    )
      return;
    if (!movementCodes.has(e.code) && !actionCodes.has(e.code)) return;
    e.preventDefault();
    if (movementCodes.has(e.code)) keys.press(e.code, e.repeat);
    if (e.repeat) return;
    if (e.code === "KeyE") interact();
    if (e.code === "Space") jump();
    if (e.code === "KeyF") pushBot();
    if (e.code === "KeyB") toggleDig();
    if (e.code === "KeyQ") changeDepth(1);
    if (e.code === "KeyR") changeDepth(-1);
  },
  { capture: true },
);
window.addEventListener(
  "keyup",
  (e) => {
    keys.release(e.code);
  },
  { capture: true },
);
window.addEventListener("blur", () => {
  resetInput();
  if (!paused && !dead) setPause(true);
});
window.addEventListener("focus", resetInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    resetInput();
    if (!paused && !dead) setPause(true);
  }
});
window.addEventListener("pagehide", () => {
  resetInput();
  save();
});
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
renderer.domElement.addEventListener("pointerdown", (e) => {
  if (paused || dead || cameraPointer !== null) return;
  renderer.domElement.focus({ preventScroll: true });
  cameraPointer = e.pointerId;
  pointerX = e.clientX;
  pointerY = e.clientY;
  drag = true;
  renderer.domElement.setPointerCapture(e.pointerId);
});
function releasePointer(e) {
  keys.releasePointer(e.pointerId);
  if (cameraPointer === e.pointerId) {
    cameraPointer = null;
    drag = false;
  }
  document
    .querySelectorAll("[data-key]")
    .forEach((b) => b.classList.toggle("pressed", keys.has(b.dataset.key)));
}
window.addEventListener("pointerup", releasePointer, { capture: true });
window.addEventListener("pointercancel", releasePointer, { capture: true });
window.addEventListener("lostpointercapture", releasePointer, {
  capture: true,
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== cameraPointer) return;
  yaw -= (e.clientX - pointerX) * 0.006;
  pitch = THREE.MathUtils.clamp(
    pitch + (e.clientY - pointerY) * 0.003,
    0.22,
    1.1,
  );
  pointerX = e.clientX;
  pointerY = e.clientY;
});
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    distance = THREE.MathUtils.clamp(distance + e.deltaY * 0.008, 5, 17);
  },
  { passive: false },
);
for (const b of document.querySelectorAll("[data-key]")) {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (paused || dead) return;
    keys.holdPointer(e.pointerId, b.dataset.key);
    b.classList.add("pressed");
    b.setPointerCapture(e.pointerId);
  });
  b.addEventListener("pointerleave", releasePointer);
}
for (const b of document.querySelectorAll("[data-action]"))
  b.onclick = () =>
    ({
      jump,
      interact,
      fight: pushBot,
      dig: toggleDig,
      deeper: () => changeDepth(1),
      higher: () => changeDepth(-1),
    })[b.dataset.action]();
function animateHamster(h, moving, time) {
  h.body.position.y = moving
    ? Math.sin(time * 15) * 0.045
    : Math.sin(time * 2) * 0.013;
  h.feet.forEach(
    (f, i) =>
      (f.position.y =
        0.13 +
        (moving ? Math.max(0, Math.sin(time * 15 + i * Math.PI)) * 0.1 : 0)),
  );
}
function walkBotTo(target, dt, speed = 1.7) {
  const p = bot.root.position,
    direction = target.clone().sub(p).setY(0);
  if (direction.length() < 0.25) {
    animateHamster(bot, false, t);
    return;
  }
  direction.normalize();
  const before = p.clone();
  move(bot.root, direction.x * dt * speed, direction.z * dt * speed);
  if (p.distanceToSquared(before) < 0.00001)
    move(bot.root, -direction.z * dt * speed, direction.x * dt * speed);
  bot.root.rotation.y = Math.atan2(direction.x, direction.z);
  animateHamster(bot, true, t);
}
function defendTerritory(dt) {
  const resource = burrowing
    ? null
    : claimedPlace(player.root.position, activity, wheelOwner);
  if (resource && resource === botDesire && botNeeds.health > 0) {
    if (territory !== resource) {
      territory = resource;
      botCooldown = Math.max(0.8, botCooldown);
      notify(
        resource === "wheel"
          ? "Плюш требует колесо! Сойди с него, чтобы прекратить драку."
          : "Плюш защищает дом! Выйди наружу, чтобы он успокоился.",
      );
    }
    if (wheelOwner === "bot") {
      wheelOwner = null;
      bot.root.position.set(-4, 0, -2.5);
    }
    botActivity = "territorial";
    bot.body.rotation.z = 0;
    const target = player.root.position.clone();
    if (resource === "wheel") target.set(-6, 0, -2.7);
    else if (claimedPlace(bot.root.position, "rest", null) !== "house") {
      const p = bot.root.position;
      if (Math.abs(p.x - 6) > 1 || p.z > -0.6) target.set(6, 0, -0.8);
      else target.set(6, 0, -3.2);
    }
    walkBotTo(target, dt, 2.9);
    const sameRoom = claimedPlace(bot.root.position, "rest", null) === "house";
    const distance = bot.root.position.distanceTo(player.root.position);
    if (
      distance < (resource === "wheel" ? 3.15 : 2.2) &&
      (resource === "wheel" || sameRoom) &&
      botCooldown <= 0
    ) {
      const hit = fight(botNeeds, needs);
      if (hit) {
        botNeeds = hit.attacker;
        damage(12);
        botCooldown = 1.4;
      }
    }
    return true;
  }
  if (territory) {
    territory = null;
    botActivity = botDesire === "wheel" ? "seek-wheel" : "seek-sleep";
    botTimer = 20;
    botCooldown = 1;
    botTarget.set(...(botDesire === "wheel" ? [-6, 0, -2.9] : [6, 0, -0.8]));
    notify("Ты освободил место. Плюш успокоился.");
  }
  return false;
}
function botUpdate(dt) {
  botTimer -= dt;
  botCooldown -= dt;
  botNeeds = tickNeeds(
    botNeeds,
    dt,
    botActivity === "wheel"
      ? "wheel"
      : botActivity === "sleep"
        ? "sleep"
        : "rest",
  );
  if (botActivity !== "territorial") botDesire = wantsPlace(botActivity);
  if (defendTerritory(dt)) return;
  const p = bot.root.position;
  const distanceToPlayer = p.distanceTo(player.root.position);
  if (botNeeds.health < 15 && botActivity !== "sleep") {
    if (wheelOwner === "bot") wheelOwner = null;
    botActivity = "seek-sleep";
    botTimer = 30;
    botTarget.set(6, 0, -0.8);
  }
  if (botActivity === "angry") {
    if (distanceToPlayer < 2.2 && botCooldown <= 0 && botNeeds.stamina >= 15) {
      const hit = fight(botNeeds, needs);
      if (hit) {
        botNeeds = hit.attacker;
        damage(12);
        botCooldown = 1.4;
      }
    }
    if (botTimer > 0) botTarget.copy(player.root.position);
    else {
      botActivity = "wander";
      botTimer = 3;
      botTarget.set(-2, 0, 1);
    }
  }
  if (botActivity === "wheel") {
    if (wheelOwner !== "bot" || botNeeds.stamina < 3 || botTimer <= 0) {
      if (wheelOwner === "bot") wheelOwner = null;
      p.set(-4, 0, -2.5);
      botActivity = "seek-sleep";
      botTimer = 20;
      botTarget.set(6, 0, -0.8);
    } else {
      animateHamster(bot, true, t);
      return;
    }
  }
  if (botActivity === "food" || botActivity === "water") {
    const key = botActivity;
    if (botStation)
      botNeeds[key] += consumeSupply(
        botStation.supply,
        Math.min(100 - botNeeds[key], dt * 13),
      );
    if (botNeeds[key] >= 99 || !botStation || botStation.supply.stock <= 0) {
      botActivity = "wander";
      botTimer = 3;
    }
    animateHamster(bot, false, t);
    return;
  }
  if (botActivity === "sleep") {
    if (botTimer <= 0 && botNeeds.health > 60 && botNeeds.stamina > 85) {
      botActivity = "wander";
      p.set(6, 0, -0.8);
      botTimer = 3;
    }
    bot.body.rotation.z = 0.7;
    return;
  }
  bot.body.rotation.z = 0;
  if (botTimer <= 0 && botActivity !== "angry") {
    const available = (type) =>
      stations
        .filter((s) => s.type === type && s.supply.stock > 0)
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
        )[0];
    if (botNeeds.water < 65 && available("water")) {
      botStation = available("water");
      botTarget.set(botStation.x, 0, 1.6);
      botActivity = "seek-water";
    } else if (botNeeds.food < 65 && available("food")) {
      botStation = available("food");
      botTarget.set(botStation.x, 0, 7);
      botActivity = "seek-food";
    } else if (botNeeds.stamina < 65 || botNeeds.health < 70) {
      botTarget.set(6, 0, -0.8);
      botActivity = "seek-sleep";
    } else if (botNeeds.stamina > 75 && rand() < 0.65) {
      botTarget.set(-6, 0, -2.9);
      botActivity = "seek-wheel";
    } else {
      botActivity = "wander";
      botTarget.set((rand() - 0.5) * 19, 0, (rand() - 0.5) * 15);
    }
    botTimer = 10 + rand() * 7;
  }
  const direction = botTarget.clone().sub(p).setY(0),
    d = direction.length();
  let moving = false;
  if (d > 0.35) {
    direction.normalize();
    const before = p.clone();
    move(bot.root, direction.x * dt * 1.7, direction.z * dt * 1.7);
    if (p.distanceToSquared(before) < 0.00001)
      move(bot.root, -direction.z * dt * 1.7, direction.x * dt * 1.7);
    bot.root.rotation.y = Math.atan2(direction.x, direction.z);
    moving = true;
  } else if (botActivity === "seek-wheel") {
    if (!wheelOwner) {
      wheelOwner = "bot";
      botActivity = "wheel";
      botTimer = 8;
      p.set(-6, 0.45, -5);
      bot.root.rotation.y = Math.PI / 2;
    } else {
      botActivity = "wander";
      botTimer = 0;
    }
  } else if (botActivity === "seek-sleep") {
    if (claimedPlace(player.root.position, activity, wheelOwner) !== "house") {
      botActivity = "sleep";
      botTimer = 20;
      p.set(6, 0, -5);
    }
  } else if (botActivity === "seek-water") botActivity = "water";
  else if (botActivity === "seek-food") botActivity = "food";
  animateHamster(bot, moving, t);
}
function update(dt, resourceDt = dt) {
  for (const station of stations) advanceSupply(station.supply, resourceDt);
  t += dt;
  worldTime += dt;
  actionCooldown = Math.max(0, actionCooldown - dt);
  const p = player.root.position;
  const { x: inputX, z: inputZ } = keys.axes();
  let dx = inputX,
    dz = inputZ;
  const moving = !!(dx || dz);
  if (moving && activity !== "rest" && !burrowing) stop();
  const sprint =
    moving &&
    (keys.has("ShiftLeft") || keys.has("ShiftRight")) &&
    needs.stamina > 1;
  needs = tickNeeds(
    needs,
    dt,
    burrowing
      ? moving || digTarget
        ? "dig"
        : "rest"
      : activity === "rest"
        ? sprint
          ? "sprint"
          : "rest"
        : activity,
  );
  if (burrowing) {
    updateDig(dt, dx, dz);
  } else if (activity === "wheel") {
    spin.rotation.z -= dt * 5;
    animateHamster(player, true, t);
    if (needs.stamina < 1) {
      stop();
      notify("Лапки устали. Отдохни и попей воды.");
    }
    if (Math.floor(needs.capacity) >= lastCapacity + 5) {
      lastCapacity = Math.floor(needs.capacity);
      notify(
        `Тренировка: запас выносливости вырос до ${lastCapacity} / ${MAX_CAPACITY}`,
      );
    }
  } else if (activity === "sleep") {
    player.body.rotation.z = 0.8;
  } else {
    player.body.rotation.z = 0;
    player.body.rotation.x = 0;
    if (activity === "food" || activity === "water") {
      if (activeStation)
        needs[activity] += consumeSupply(
          activeStation.supply,
          Math.min(100 - needs[activity], dt * 15),
        );
      if (!activeStation || activeStation.supply.stock <= 0) {
        notify("Запас закончился. Пополнение через 30 секунд.");
        stop();
      }
      if (
        (activity === "food" || activity === "water") &&
        needs[activity] >= 100
      ) {
        notify(activity === "food" ? "Вкусно! Ты наелся." : "Жажда утолена.");
        stop();
      }
    }
    if (moving) {
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      const wx = dx * Math.cos(yaw) + dz * Math.sin(yaw),
        wz = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const speed = sprint ? 5 : 2.6;
      move(player.root, wx * speed * dt, wz * speed * dt);
      const wanted = Math.atan2(wx, wz);
      const turn = Math.atan2(
        Math.sin(wanted - player.root.rotation.y),
        Math.cos(wanted - player.root.rotation.y),
      );
      player.root.rotation.y += turn * (1 - Math.exp(-dt * 18));
    }
    const floor = surface(p.x, p.z, p.y);
    if (grounded && floor >= p.y - 0.15 && floor <= p.y + 0.35) {
      p.y = floor;
      peak = p.y;
    } else {
      if (grounded) {
        peak = p.y;
        grounded = false;
      }
      verticalSpeed -= 14 * dt;
      p.y += verticalSpeed * dt;
      peak = Math.max(peak, p.y);
      if (p.y <= floor && verticalSpeed <= 0) {
        const amount = fallDamage(peak - floor);
        if (amount) {
          damage(amount);
          notify(`Больно приземлился: −${amount} здоровья`);
        }
        p.y = floor;
        verticalSpeed = 0;
        grounded = true;
        peak = floor;
      }
    }
    if (grounded) {
      const free = resolvePenetration(p, solids);
      p.x = free.x;
      p.z = free.z;
    }
    animateHamster(player, moving, t);
  }
  if (wheelOwner === "bot") spin.rotation.z -= dt * 5;
  botUpdate(dt);
  botLabel.position.copy(bot.root.position).add(new THREE.Vector3(0, 2.3, 0));
  botLabel.visible = botActivity !== "sleep";
  $("neighbor").textContent =
    {
      wheel: "Плюш крутит колесо",
      angry: "Плюш сердится",
      territorial:
        territory === "wheel"
          ? "Плюш требует освободить колесо!"
          : "Плюш требует выйти из дома!",
      sleep: "Плюш спит в домике",
      food: "Плюш ест",
      water: "Плюш пьёт",
      "seek-wheel": "Плюш идёт к колесу",
      "seek-sleep": "Плюш хочет отдохнуть в домике",
    }[botActivity] || "Плюш гуляет по клетке";
  if (needs.health <= 0) {
    dead = true;
    paused = true;
    stop();
    try {
      localStorage.removeItem("hamster-life-v1");
    } catch {}
    modal(
      "Хомяк совсем устал",
      "Жизнь в клетке начнётся заново. Следи за водой и кормом, отдыхай в домике и береги лапки при прыжках.",
      "Начать новую жизнь →",
    );
  }
  saveTimer += dt;
  if (saveTimer > 5) {
    saveTimer = 0;
    save();
  }
}
function hud() {
  for (const s of stations) {
    const fraction = s.supply.stock / s.supply.capacity;
    s.visual.visible = fraction > 0;
    s.visual.scale.y = Math.max(0.02, fraction);
    if (s.type === "water") s.visual.position.y = 1.4 + 0.9 * fraction;
    s.label.userData.setText(
      s.supply.stock > 0
        ? `${s.type === "food" ? "Корм" : "Вода"} · ${Math.ceil(s.supply.stock)} / 60`
        : `Пополнение · ${Math.ceil(s.supply.refill)} с`,
    );
  }
  for (const key of ["health", "stamina", "food", "water"]) {
    const max = key === "stamina" ? needs.capacity : 100;
    $(key).textContent =
      key === "stamina" ? Math.floor(needs[key]) : Math.ceil(needs[key]);
    $("max-" + key).textContent = "/ " + Math.floor(max);
    $("bar-" + key).style.width = Math.min(100, (needs[key] / max) * 100) + "%";
    $("card-" + key).classList.toggle("low", needs[key] < 20);
  }
  const n = nearby();
  if (burrowing && n)
    n.name = digTarget
      ? `Рою ход… ${Math.min(100, Math.round((digProgress / 0.7) * 100))}% · B — выбраться`
      : `Глубина ${tunnelLevel}/5 · WASD — рыть · Q — глубже · R — выше · B — поверхность`;
  $("prompt").innerHTML = paused ? "" : n ? `<kbd>E</kbd>${n.name}` : "";
  const minutes = 8 * 60 + Math.floor(worldTime * 2);
  $("time").textContent =
    String(Math.floor(minutes / 60) % 24).padStart(2, "0") +
    ":" +
    String(minutes % 60).padStart(2, "0");
}
const target = new THREE.Vector3();
let hudAccumulator = 0.1;
let frameSamples = 0,
  frameSeconds = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.max(0, (now - lastFrame) / 1000);
  const dt = Math.min(elapsed, 0.05);
  // Favor responsive input over unnecessary pixels on slower GPUs.
  if (elapsed < 1) {
    frameSamples++;
    frameSeconds += elapsed;
  }
  if (frameSamples >= 16) {
    if (
      qualityMode === "auto" &&
      frameSeconds / frameSamples > 0.04 &&
      resolutionScale > 0.65
    ) {
      resolutionScale = Math.max(0.65, resolutionScale - 0.25);
      renderer.setPixelRatio(resolutionScale);
    }
    frameSamples = 0;
    frameSeconds = 0;
  }
  lastFrame = now;
  if (!paused) update(dt, elapsed);
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $("toast").style.opacity = 0;
  }
  hudAccumulator += dt;
  if (hudAccumulator >= 0.1) {
    hud();
    hudAccumulator = 0;
  }
  renderer.shadowMap.autoUpdate = qualityMode === "high" && !burrowing;
  for (const h of [player, bot]) {
    h.coat.visible = qualityMode !== "fast";
    h.body.traverse((o) => {
      if (o.isMesh && o.parent !== h.coat)
        o.castShadow = qualityMode === "high" && !burrowing;
    });
    const p = h.root.position,
      ground = surface(p.x, p.z, p.y);
    h.shadow.visible = h !== player || !burrowing;
    h.shadow.position.set(p.x, ground + 0.13, p.z);
    h.shadow.material.opacity = Math.max(0.15, 1 - (p.y - ground) * 0.23);
  }
  target.copy(player.root.position).add(new THREE.Vector3(0, 0.85, 0));
  const viewPitch = burrowing ? Math.PI / 2 : pitch;
  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(viewPitch) * distance,
    Math.sin(viewPitch) * distance,
    Math.cos(yaw) * Math.cos(viewPitch) * distance,
  );
  // Follow translation exactly: releasing a key also stops the view immediately.
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  const p = player.root.position;
  houseRoof.material.opacity =
    p.x > 3 && p.x < 9 && p.z > -8 && p.z < -1.8 && p.y < 2.8 ? 0.2 : 1;
  renderer.render(scene, camera);
}
camera.position.set(2, 8, 14);
requestAnimationFrame(frame);
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
window.simulatorState = () => ({
  needs: { ...needs },
  botNeeds: { ...botNeeds },
  position: player.root.position.toArray(),
  botPosition: bot.root.position.toArray(),
  paused,
  input: keys.axes(),
  renderCalls: renderer.info.render.calls,
  resolutionScale,
  qualityMode,
  activity,
  botActivity,
  wheelOwner,
  burrowing,
  tunnelLevel,
  botDesire,
  digProgress,
  territory,
  tunnels: tunnels.snapshot(),
  supplies: stations.map((s) => ({ id: s.id, type: s.type, ...s.supply })),
  dead,
  objects: { hamsters: 2, wheels: 1, houses: 1, bowls: 2, drinkers: 2 },
});
