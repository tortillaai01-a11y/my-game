import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MovementInput } from "../simulator/controls.js";
import { surfaceTexture, batchStatic } from "../simulator/visuals.js";
import {
  TYPES,
  YARD_TYPES,
  PRICES,
  RECIPES,
  buy,
  assemble,
  launchChance,
  launch,
  emptyCargo,
  validCargo,
  canStand,
  transfer,
} from "./model.js";
import "./style.css";

const $ = (id) => document.getElementById(id);
document.querySelector("#app").innerHTML = `
<div id="hud"><header><div class="brand">ДО ОРБИТЫ<small>БОЛЬШОЕ НАЧИНАЕТСЯ С МАЛОГО</small></div><div class="top-actions"><button id="wallet">0 ₽</button><button id="bag">Рюкзак · I</button><button id="pause">Ⅱ</button></div></header>
<div class="location"><small>ТВОЙ УЧАСТОК / 01</small><strong id="place">Дом</strong><p id="place-note">За дверью — целый мир ненужных вещей. Возможно, не таких уж ненужных.</p></div>
<div id="crosshair"></div><div id="prompt"></div><div id="toast"></div><div class="bottom"><div class="cargo"><small>СОБРАНО В РЮКЗАК</small><strong id="count">0 предметов</strong></div><div class="help">WASD — идти · SHIFT — бежать · МЫШЬ — осмотреться<br>E — взять / сложить · I — рюкзак · ESC — пауза</div></div></div>
<div id="inventory" hidden><button id="close-inventory">×</button><h2>Твои находки</h2><p>Рюкзак / запас в гараже. Подойди к верстаку, чтобы разгрузиться.</p><ul id="items"></ul><p>Здесь будут детали будущей космической ракеты. Собирай ракету на верстаке. Более качественные детали повышают шанс взлёта.</p></div>
<div id="menu"><div class="panel"><div class="eyebrow">ГЛАВА 01 · ПОКА МЫ НА ЗЕМЛЕ</div><h1>До<br><span>орбиты.</span></h1><p>Дом. Старый гараж. Мусорка за дорогой.<br>Всё необходимое, чтобы однажды построить космическую ракету из того, что другие выбросили.</p><button class="primary" id="start">Выйти навстречу идее →</button><a href="./index.html">К хомячьей жизни</a><div class="controls-note">Мусорка → работа → магазин → гараж → запуск. На карте появились магазин слева от дома и работа справа от мусорки.<br>WASD + мышь · E — взаимодействовать · I — рюкзак<br>Прогресс сохраняется в этом браузере.</div></div></div>
<div id="touch"><div class="pad"><span></span><button data-key="KeyW">↑</button><span></span><button data-key="KeyA">←</button><button data-key="KeyS">↓</button><button data-key="KeyD">→</button></div><button id="touch-use">E</button></div>`;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#bbc8c4");
scene.fog = new THREE.Fog("#bbc8c4", 45, 130);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
document.querySelector("#app").prepend(renderer.domElement);
const activityPanel = document.createElement("div");
activityPanel.id = "activity-panel";
activityPanel.hidden = true;
document.body.append(activityPanel);
renderer.domElement.tabIndex = 0;
const camera = new THREE.PerspectiveCamera(
  68,
  innerWidth / innerHeight,
  0.08,
  180,
);
camera.rotation.order = "YXZ";
const pmrem = new THREE.PMREMGenerator(renderer),
  room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.07).texture;
scene.environmentIntensity = 0.25;
room.dispose();
pmrem.dispose();
scene.add(new THREE.HemisphereLight("#e0edee", "#77715b", 1.7));
const sun = new THREE.DirectionalLight("#fff0cc", 3);
sun.position.set(-25, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -53,
  right: 53,
  top: 53,
  bottom: -53,
  near: 1,
  far: 130,
});
sun.shadow.normalBias = 0.04;
scene.add(sun);
const world = new THREE.Group();
scene.add(world);
const solids = [],
  pickups = [];
const mat = (color, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const M = {
  wall: mat("#cbc4af"),
  concrete: mat("#8f958c"),
  wood: mat("#b69c77"),
  roof: mat("#45595a", 0.65, 0.3),
  rust: mat("#85624c", 0.8, 0.4),
  metal: mat("#929e9a", 0.4, 0.7),
  dark: mat("#343c3b"),
  grass: mat("#8a9170"),
  dirt: mat("#a19a81"),
  cream: mat("#e7dfc5"),
  orange: mat("#dbac57"),
};
M.wood.map = surfaceTexture("wood");
M.wood.bumpMap = M.wood.map;
M.wood.bumpScale = 0.035;
M.dirt.map = surfaceTexture("bedding");
M.dirt.color.set("#b2ac98");
const cube = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, m, x, y, z, parent = world, solid = false) {
  const o = new THREE.Mesh(cube, m);
  o.scale.set(w, h, d);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  if (solid) solids.push({ x, z, w, d });
  return o;
}
function cylinder(r, h, m, x, y, z, parent = world) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function label(text, x, y, z, width = 4, height = 0.8, parent = world) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#263b3e";
  ctx.fillRect(0, 0, 768, 128);
  ctx.fillStyle = "#efc773";
  ctx.font = "bold 45px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, 384, 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const o = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
box(100, 0.2, 85, M.grass, 0, -0.18, -17);
box(12, 0.04, 55, M.dirt, 0, -0.05, -13);
box(37, 0.04, 5, M.dirt, 11, -0.03, -4);
box(39, 0.08, 31, M.dirt, 0, -0.03, -33);
function building(x, z, w, d, garage = false, title = "ГАРАЖ / МАСТЕРСКАЯ") {
  box(w, 0.16, d, M.concrete, x, -0.02, z);
  box(0.25, 3.5, d, M.wall, x - w / 2, 1.75, z, world, true);
  box(0.25, 3.5, d, M.wall, x + w / 2, 1.75, z, world, true);
  box(w, 3.5, 0.25, M.wall, x, 1.75, z + d / 2, world, true);
  const door = garage ? 5 : 2;
  for (const side of [-1, 1])
    box(
      (w - door) / 2,
      3.5,
      0.25,
      M.wall,
      x + side * (door / 2 + (w - door) / 4),
      1.75,
      z - d / 2,
      world,
      true,
    );
  box(door, 0.5, 0.25, M.wall, x, 3.25, z - d / 2);
  box(w + 0.6, 0.25, d + 0.6, M.roof, x, 3.65, z);
  if (garage) {
    label(title, x, 3, z - d / 2 - 0.16, 4.7, 0.6).rotation.y = Math.PI;
  } else {
    label("ДОМ", x, 3, z - d / 2 - 0.16, 1.6, 0.5).rotation.y = Math.PI;
    box(2.2, 0.45, 3.6, M.wood, x - 2.8, 0.25, z + 2, world, true);
    box(2.05, 0.25, 3.5, mat("#647d78"), x - 2.8, 0.58, z + 2);
    box(1.5, 0.18, 0.75, M.cream, x - 2.8, 0.8, z + 3.1);
    box(2.3, 1.6, 0.7, M.wood, x + 3.2, 0.8, z + 4, world, true);
    box(1.5, 0.1, 0.8, M.wood, x + 3, 1.05, z - 1, world, true);
    box(0.35, 1, 0.35, M.dark, x + 3, 0.5, z - 1);
    label(
      "СНАЧАЛА — НАЙТИ ДЕТАЛИ",
      x,
      2.2,
      z + d / 2 - 0.15,
      4,
      0.65,
    ).rotation.y = Math.PI;
    const windowMat = new THREE.MeshBasicMaterial({ color: "#c5e4e0" });
    box(0.02, 1.3, 2.7, windowMat, x + w / 2 - 0.14, 2, z + 1);
    box(0.05, 1.5, 0.08, M.wood, x + w / 2 - 0.18, 2, z + 1);
    box(0.05, 0.08, 2.9, M.wood, x + w / 2 - 0.18, 2, z + 1);
  }
}
building(0, 7, 10, 12);
building(15, 6, 11, 12, true);
const bench = box(4, 0.2, 1.3, M.wood, 15, 1.05, 10, world, true);
for (const x of [13.3, 16.7]) box(0.16, 1, 0.9, M.metal, x, 0.5, 10);
label("ВЕРСТАК · СКЛАД ДЕТАЛЕЙ", 15, 2.1, 11.8, 4.5, 0.65).rotation.y = Math.PI;
box(3, 0.1, 6, M.orange, 15, 0.1, 5);
for (const x of [12, 18])
  for (const z of [3, 5, 7]) box(0.7, 0.025, 0.1, M.cream, x, 0.15, z);
label("МЕСТО БУДУЩЕЙ РАКЕТЫ", 15, 0.17, 5, 3.2, 0.55).rotation.x = -Math.PI / 2;
for (let i = 0; i < 3; i++) {
  box(2.2, 0.12, 0.8, M.wood, 19.8, 0.6 + i * 0.75, 8);
  box(0.12, 2.5, 0.8, M.metal, 18.7, 1.25, 8);
  box(0.12, 2.5, 0.8, M.metal, 20.9, 1.25, 8);
}
// Two new destinations with open entrances facing the main path.
building(-16, 6, 10, 10, true, "МАГАЗИН · ВСЕ ДЕТАЛИ");
building(32, -9, 10, 10, true, "РАБОТА · СОРТИРОВОЧНЫЙ ЦЕХ");
box(3.5, 1, 1, M.wood, -16, 0.5, 9, world, true);
box(3.5, 1, 1, M.metal, 32, 0.5, -6, world, true);
for (let i = 0; i < 5; i++) {
  box(0.6, 0.5, 0.6, M.orange, 30 + i, 1.3, -5.7);
  box(0.6, 0.5, 0.5, i % 2 ? M.metal : M.rust, -18 + i, 1.4, 9);
}
box(38, 0.04, 4, M.dirt, 18, -0.02, -15);
box(32, 0.04, 4, M.dirt, -9, -0.02, -2);
label("← МАГАЗИН     РАБОТА →", 0, 2, -12, 6, 0.7);
box(0.12, 2, 0.12, M.wood, 0, 1, -12.1);
const launchPad = box(6, 0.12, 6, M.concrete, 26, 0.04, 7);
label("СТАРТОВАЯ ПЛОЩАДКА", 26, 0.12, 7, 4, 0.6).rotation.x = -Math.PI / 2;
const benchTarget = box(
  4,
  0.7,
  1.5,
  new THREE.MeshBasicMaterial({ visible: false }),
  15,
  1.1,
  9.9,
  scene,
);
benchTarget.userData.storage = true;
const stations = [benchTarget];
for (const [kind, x, z] of [
  ["shop", -16, 8.8],
  ["work", 32, -6.2],
]) {
  const target = box(
    3.5,
    1.6,
    1.2,
    new THREE.MeshBasicMaterial({ visible: false }),
    x,
    1,
    z,
    scene,
  );
  target.userData.station = kind;
  stations.push(target);
}
label("МУСОРКА ↑", 3, 1.9, -6, 3, 0.65);
box(0.12, 2.1, 0.12, M.wood, 3, 1, -6.05);
label("← ДОМ     ГАРАЖ →", 7, 1.7, -1, 4, 0.65);
box(0.12, 2, 0.12, M.wood, 7, 0.9, -1.05);
// Open gate faces the house; a footpath leads directly into the scrapyard.
for (const side of [-1, 1]) {
  box(13, 2.6, 0.18, M.rust, side * 12, 1.3, -18, world, true);
  for (let i = 0; i < 13; i++)
    box(0.06, 2.7, 0.24, M.metal, side * 12 - 6 + i, 1.35, -18);
}
for (const x of [-19, 19]) box(0.2, 2.6, 30, M.rust, x, 1.3, -33, world, true);
box(38, 2.6, 0.2, M.rust, 0, 1.3, -48, world, true);
label("МУСОРКА · НИЧЕГО ЛИШНЕГО", 0, 3.4, -18, 9, 0.85);
for (const x of [-5, 5]) box(0.18, 3.8, 0.18, M.metal, x, 1.9, -18);
let seed = 231;
const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
for (const [x, z] of [
  [-12, -25],
  [12, -26],
  [-12, -38],
  [12, -40],
]) {
  box(4, 1.7, 2.4, mat(x < 0 ? "#526d65" : "#82644c"), x, 0.85, z, world, true);
  for (const offset of [-1.6, 1.6])
    box(0.1, 1.8, 2.5, M.metal, x + offset, 0.9, z);
  for (let i = 0; i < 12; i++) {
    const piece = box(
      0.4 + random(),
      0.2 + random() * 0.4,
      0.5 + random(),
      i % 2 ? M.rust : M.dark,
      x + (random() - 0.5) * 3,
      1.6 + random() * 0.3,
      z + (random() - 0.5),
      world,
    );
    piece.rotation.set(random(), random() * 3, random());
  }
}
for (let i = 0; i < 14; i++) {
  const x = (i % 2 ? -1 : 1) * (21 + random() * 21),
    z = -45 + random() * 62;
  const trunk = cylinder(0.25, 4, M.wood, x, 2, z);
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(2 + random(), 6, 7),
    mat("#52664f"),
  );
  crown.position.set(x, 6, z);
  world.add(crown);
}
for (let i = 0; i < 24; i++) {
  const x = (random() - 0.5) * 32,
    z = -21 - random() * 24;
  if (Math.abs(x) < 3) continue;
  const crate = box(1.1, 0.7, 1, M.wood, x, 0.35, z, world, true);
  crate.rotation.y = 0;
  box(1.15, 0.12, 0.15, M.dark, x, 0.55, z - 0.5);
}
let cargo = emptyCargo(),
  storage = emptyCargo(),
  collected = new Set(),
  restored = null;
try {
  const saved = JSON.parse(localStorage.getItem("rocket-yard-v1"));
  if (saved) {
    cargo = validCargo(saved.cargo);
    storage = validCargo(saved.storage);
    collected = new Set(
      Array.isArray(saved.collected)
        ? saved.collected.filter(
            (n) => Number.isInteger(n) && n >= 0 && n < 160,
          )
        : [],
    );
    restored = saved;
  }
} catch {}
const materials = TYPES.map((t) =>
  mat(
    t.color,
    t.shape === "tire" ? 1 : 0.65,
    t.shape === "board" || t.shape === "tire" ? 0 : 0.5,
  ),
);
function makeItem(type, index) {
  const g = new THREE.Group(),
    m = materials[index];
  if (type.shape === "pipe") {
    const o = cylinder(0.12, 0.9, m, 0, 0.14, 0, g);
    o.rotation.z = Math.PI / 2;
  } else if (type.shape === "coil" || type.shape === "tire") {
    const o = new THREE.Mesh(
      new THREE.TorusGeometry(
        type.shape === "tire" ? 0.3 : 0.2,
        type.shape === "tire" ? 0.12 : 0.035,
        8,
        20,
      ),
      m,
    );
    o.rotation.x = Math.PI / 2;
    o.position.y = 0.13;
    g.add(o);
  } else if (type.shape === "tank") {
    cylinder(0.17, 0.65, m, 0, 0.33, 0, g);
    box(0.12, 0.1, 0.12, M.metal, 0, 0.7, 0, g);
  } else if (type.shape === "bolt") {
    cylinder(0.08, 0.28, m, 0, 0.14, 0, g);
    box(0.19, 0.08, 0.19, m, 0, 0.3, 0, g);
  } else
    box(
      type.shape === "board" ? 1.1 : 0.55,
      0.12,
      type.shape === "board" ? 0.2 : 0.4,
      m,
      0,
      0.1,
      0,
      g,
    );
  g.traverse((o) => {
    if (o.isMesh) {
      o.receiveShadow = true;
      o.castShadow = false;
    }
  });
  return g;
}
for (let i = 0; i < 160; i++) {
  const typeIndex = TYPES.findIndex(
      (t) => t.id === YARD_TYPES[i % YARD_TYPES.length],
    ),
    type = TYPES[typeIndex],
    g = makeItem(type, typeIndex);
  let x, z;
  do {
    x = (random() - 0.5) * 34;
    z = -20 - random() * 26;
  } while (!canStand(x, z, solids, 0.6));
  g.position.set(x, 0.02, z);
  g.rotation.y = random() * Math.PI * 2;
  g.userData = { pickup: i, type: type.id, name: type.name };
  if (!collected.has(i)) {
    scene.add(g);
    pickups.push(g);
  }
}
batchStatic(world);
camera.position.set(0, 1.65, 8);
let yaw = 0,
  pitch = 0,
  paused = true,
  nearest = null,
  walkTime = 0,
  saveTime = 0,
  toastTime = 0;
if (
  restored?.position?.length === 2 &&
  restored.position.every(Number.isFinite) &&
  canStand(...restored.position, solids)
)
  camera.position.set(restored.position[0], 1.65, restored.position[1]);
let money = Number.isSafeInteger(restored?.money)
  ? Math.max(0, restored.money)
  : 0;
let rocket = {};
for (const key of ["hull", "engine", "tank", "control"])
  if (restored?.rocket?.[key] === 0 || restored?.rocket?.[key] === 1)
    rocket[key] = restored.rocket[key];
let flights = Number.isSafeInteger(restored?.flights)
  ? Math.max(0, restored.flights)
  : 0;
let failures = Number.isSafeInteger(restored?.failures)
  ? Math.max(0, restored.failures)
  : 0;
let panelKind = null,
  workRemaining = 0,
  flight = null,
  rocketVisual = null;
let closingLock = false;
if (Number.isFinite(restored?.yaw)) yaw = restored.yaw;
if (Number.isFinite(restored?.pitch))
  pitch = THREE.MathUtils.clamp(restored.pitch, -1.35, 1.35);
const input = new MovementInput(),
  raycaster = new THREE.Raycaster();
raycaster.far = 3.2;
const total = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
function updateInventory() {
  $("wallet").textContent = money + " ₽";
  $("count").textContent = total(cargo) + " предметов";
  $("items").innerHTML = TYPES.map(
    (t) =>
      `<li><span>${t.name}</span><b>${cargo[t.id]} / ${storage[t.id]}</b></li>`,
  ).join("");
}
function save() {
  try {
    localStorage.setItem(
      "rocket-yard-v1",
      JSON.stringify({
        cargo,
        storage,
        money,
        rocket,
        flights,
        failures,
        collected: [...collected],
        position: [camera.position.x, camera.position.z],
        yaw,
        pitch,
      }),
    );
  } catch {
    notify("Браузер не разрешает сохранение прогресса.");
  }
}
function notify(text) {
  $("toast").textContent = text;
  $("toast").style.opacity = 1;
  toastTime = 3;
}
function pause() {
  paused = true;
  if (panelKind) closePanel();
  input.clear();
  $("menu").hidden = false;
  $("start").textContent = "Продолжить прогулку →";
  if (document.pointerLockElement) document.exitPointerLock();
  save();
}
const touch = matchMedia("(pointer:coarse)").matches;
async function start() {
  paused = false;
  $("menu").hidden = true;
  renderer.domElement.focus();
  if (!touch)
    try {
      await renderer.domElement.requestPointerLock();
    } catch {
      notify("Обзор: зажми мышь и двигай её.");
    }
}
$("start").onclick = start;
$("pause").onclick = pause;
function toggleInventory() {
  $("inventory").hidden = !$("inventory").hidden;
  input.clear();
}
$("bag").onclick = toggleInventory;
$("close-inventory").onclick = () => {
  $("inventory").hidden = true;
};
function interact() {
  if (paused || !nearest) return;
  if (nearest.userData.station) {
    openPanel(nearest.userData.station);
    return;
  }
  if (nearest.userData.storage) {
    if (total(cargo)) {
      const moved = total(cargo);
      ({ cargo, storage } = transfer(cargo, storage));
      notify("В гараж сложено: " + moved);
      updateInventory();
      save();
    }
    openPanel("build");
    return;
  } else {
    const { pickup, type, name } = nearest.userData;
    if (collected.has(pickup)) return;
    collected.add(pickup);
    cargo[type]++;
    nearest.removeFromParent();
    pickups.splice(pickups.indexOf(nearest), 1);
    notify("+1 · " + name);
  }
  nearest = null;
  updateInventory();
  save();
}
window.addEventListener("keydown", (e) => {
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyE",
      "KeyI",
      "Escape",
    ].includes(e.code)
  )
    e.preventDefault();
  if (e.code === "Escape") {
    if (panelKind) {
      closePanel();
      return;
    }
    pause();
    return;
  }
  if (paused || panelKind) return;
  input.press(e.code, e.repeat);
  if (!e.repeat && e.code === "KeyE") interact();
  if (!e.repeat && e.code === "KeyI") toggleInventory();
});
window.addEventListener("keyup", (e) => input.release(e.code));
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("pagehide", save);
document.addEventListener("pointerlockchange", () => {
  if (
    !document.pointerLockElement &&
    !touch &&
    !paused &&
    !panelKind &&
    !closingLock
  )
    pause();
});
document.addEventListener("mousemove", (e) => {
  if (
    paused ||
    panelKind ||
    document.pointerLockElement !== renderer.domElement
  )
    return;
  yaw -= e.movementX * 0.0022;
  pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -1.35, 1.35);
});
let drag = null;
renderer.domElement.addEventListener("pointerdown", (e) => {
  if (paused || panelKind || document.pointerLockElement) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (paused || panelKind || !drag || drag.id !== e.pointerId) return;
  yaw -= (e.clientX - drag.x) * 0.005;
  pitch = THREE.MathUtils.clamp(
    pitch - (e.clientY - drag.y) * 0.005,
    -1.35,
    1.35,
  );
  drag.x = e.clientX;
  drag.y = e.clientY;
});
for (const button of document.querySelectorAll("[data-key]")) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (paused) return;
    button.setPointerCapture(e.pointerId);
    input.holdPointer(e.pointerId, button.dataset.key);
  });
}
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  window.addEventListener(event, (e) => {
    input.releasePointer(e.pointerId);
    if (drag?.id === e.pointerId) drag = null;
  });
$("touch-use").onclick = interact;
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
function findTarget() {
  raycaster.setFromCamera(new THREE.Vector2(), camera);
  const hits = raycaster.intersectObjects(
    [world, ...stations, ...pickups],
    true,
  );
  nearest = null;
  if (hits.length) {
    let object = hits[0].object;
    while (
      object &&
      object.userData.pickup === undefined &&
      !object.userData.storage &&
      !object.userData.station
    )
      object = object.parent;
    if (object) nearest = object;
  }
  $("prompt").innerHTML = nearest
    ? `<kbd>E</kbd>${nearest.userData.storage ? "Верстак · разгрузить и собрать ракету" : nearest.userData.station === "shop" ? "Магазин" : nearest.userData.station === "work" ? "Работа" : "Взять · " + nearest.userData.name}`
    : "";
}
function recipeText(cost) {
  return Object.entries(cost)
    .map(([id, n]) => TYPES.find((t) => t.id === id).name + " ×" + n)
    .join(", ");
}
function renderPanel() {
  if (!panelKind) return;
  let content = "";
  if (panelKind === "shop")
    content =
      "<h2>Магазин деталей</h2><p>Всё для будущей ракеты. Покупки — в рюкзак.</p>" +
      TYPES.map(
        (t) =>
          '<div class="shop-row"><span>' +
          t.name +
          "<small>В рюкзаке: " +
          cargo[t.id] +
          '</small></span><button data-buy="' +
          t.id +
          '" ' +
          (money < PRICES[t.id] ? "disabled" : "") +
          ">" +
          PRICES[t.id] +
          " ₽</button></div>",
      ).join("");
  if (panelKind === "work")
    content =
      '<h2>Сортировочный цех</h2><p>Помоги разобрать посылки: смена длится 15 секунд активной игры. Оплата — 60 ₽. Оставайся у рабочего стола до конца смены.</p><div id="work-progress"></div><button id="work-start" ' +
      (workRemaining > 0 ? "disabled" : "") +
      ">Начать смену · 60 ₽</button>";
  if (panelKind === "build") {
    const chance = launchChance(rocket);
    content =
      "<h2>Сборка ракеты</h2><p>Вещи из рюкзака сложены на склад. Нужны корпус, двигатель, бак с топливом и управление. Установленную деталь можно снять с возвратом материалов.</p>" +
      RECIPES.map((r) => {
        const installed = rocket[r.slot] !== undefined;
        const selected = rocket[r.slot] === r.quality;
        const enough = Object.entries(r.cost).every(
          ([id, n]) => storage[id] >= n,
        );
        return (
          '<div class="shop-row"><span>' +
          r.title +
          "<small>" +
          recipeText(r.cost) +
          '</small></span><button data-build="' +
          r.id +
          '" ' +
          (installed || !enough || flight ? "disabled" : "") +
          ">" +
          (installed ? (selected ? "Установлено" : "Занято") : "Собрать") +
          "</button></div>"
        );
      }).join("") +
      '<div class="parts">' +
      ["hull", "engine", "tank", "control"]
        .filter((key) => rocket[key] !== undefined)
        .map(
          (key) =>
            '<button data-remove="' +
            key +
            '" ' +
            (flight ? "disabled" : "") +
            ">Снять: " +
            {
              hull: "корпус",
              engine: "двигатель",
              tank: "бак",
              control: "управление",
            }[key] +
            "</button>",
        )
        .join("") +
      "</div>" +
      "<p><b>" +
      (chance
        ? "Шанс взлёта: " + Math.round(chance * 100) + "%"
        : "Установи все четыре узла для запуска.") +
      '</b><br>При неудаче двигатель и топливный бак теряются; корпус и управление остаются. После успешного полёта можно собрать новую ракету.</p><button id="launch" ' +
      (!chance || flight ? "disabled" : "") +
      ">На старт! 🚀</button><p>Успешных запусков: " +
      flights +
      " · неудачных: " +
      failures +
      "</p>";
  }
  activityPanel.innerHTML =
    '<button id="close-activity" class="close-panel">×</button><small>НА СЧЕТУ: ' +
    money +
    " ₽</small>" +
    content;
  $("close-activity").onclick = closePanel;
  for (const button of activityPanel.querySelectorAll("[data-buy]"))
    button.onclick = () => {
      const result = buy(cargo, money, button.dataset.buy);
      if (result) {
        ({ cargo, money } = result);
        updateInventory();
        save();
        renderPanel();
      }
    };
  for (const button of activityPanel.querySelectorAll("[data-build]"))
    button.onclick = () => {
      if (flight) return;
      const result = assemble(storage, rocket, button.dataset.build);
      if (result) {
        ({ storage, rocket } = result);
        rebuildRocket();
        updateInventory();
        save();
        renderPanel();
      }
    };
  for (const button of activityPanel.querySelectorAll("[data-remove]"))
    button.onclick = () => {
      if (flight) return;
      const key = button.dataset.remove;
      const recipe = RECIPES.find(
        (r) => r.slot === key && r.quality === rocket[key],
      );
      if (!recipe) return;
      for (const [id, n] of Object.entries(recipe.cost)) storage[id] += n;
      delete rocket[key];
      rebuildRocket();
      updateInventory();
      save();
      renderPanel();
    };
  if ($("work-start"))
    $("work-start").onclick = () => {
      if (!workRemaining) {
        workRemaining = 15;
        renderPanel();
      }
    };
  if ($("launch")) $("launch").onclick = startLaunch;
  updateWorkLabel();
}
function openPanel(kind) {
  panelKind = kind;
  input.clear();
  $("inventory").hidden = true;
  activityPanel.hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
  renderPanel();
}
function closePanel() {
  panelKind = null;
  activityPanel.hidden = true;
  input.clear();
  if (workRemaining) {
    workRemaining = 0;
    notify("Смена прервана. Оплата — после полной смены.");
  }
  if (!paused) {
    closingLock = true;
    const request = touch
      ? Promise.resolve()
      : renderer.domElement.requestPointerLock();
    Promise.resolve(request)
      .catch(() => {})
      .finally(() => {
        closingLock = false;
      });
  }
}
function updateWorkLabel() {
  if ($("work-progress"))
    $("work-progress").textContent =
      workRemaining > 0
        ? "Разбираем посылки… " + Math.ceil(workRemaining) + " сек."
        : "Можно начать новую смену.";
}
function rebuildRocket() {
  if (rocketVisual) {
    rocketVisual.traverse((o) => {
      if (o.isMesh) {
        if (o.geometry !== cube) o.geometry.dispose();
        o.material.dispose();
      }
    });
    scene.remove(rocketVisual);
  }
  rocketVisual = new THREE.Group();
  rocketVisual.position.set(15, 0.2, 5);
  rocketVisual.scale.setScalar(.68);
  scene.add(rocketVisual);
  const shell = mat(
    rocket.hull === 1 ? "#b4c3c6" : "#b5986b",
    0.65,
    rocket.hull === 1 ? 0.7 : 0,
  );
  if (rocket.hull !== undefined) {
    cylinder(0.62, 3.2, shell, 0, 2, 0, rocketVisual);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.2, 24), shell);
    nose.position.y = 4.2;
    rocketVisual.add(nose);
    for (let i = 0; i < 4; i++) {
      const fin = box(
        0.12,
        0.8,
        1.1,
        shell,
        Math.sin((i * Math.PI) / 2) * 0.65,
        0.8,
        Math.cos((i * Math.PI) / 2) * 0.65,
        rocketVisual,
      );
      fin.rotation.y = (i * Math.PI) / 2;
    }
  }
  if (rocket.engine !== undefined)
    cylinder(0.4, 0.6, mat("#46575d", 0.4, 0.8), 0, 0.3, 0, rocketVisual);
  if (rocket.tank !== undefined)
    cylinder(0.68, 0.4, mat("#c9994b"), 0, 2, 0, rocketVisual);
  if (rocket.control !== undefined)
    box(0.3, 0.25, 0.2, mat("#547d79"), 0, 3.25, 0.6, rocketVisual);
  rocketVisual.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = true;
    }
  });
}
function startLaunch() {
  if (flight) return;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const result = launch(rocket, bytes[0] / 4294967296);
  if (!result) return;
  // Commit the result before animation: reload cannot reroll or duplicate a rocket.
  flight = { time: 0, success: result.success };
  rocket = result.rocket;
  if (result.success) flights++;
  else failures++;
  save();
  closePanel();
  camera.position.set(26, 1.65, 13);
  yaw = 0;
  pitch = 0.12;
  rocketVisual.position.set(26, 0.2, 7);
  rocketVisual.scale.setScalar(1);
  notify("Обратный отсчёт… 3, 2, 1!");
}
function updateActivities(dt, elapsed) {
  if (workRemaining > 0 && panelKind === "work") {
    workRemaining = Math.max(0, workRemaining - elapsed);
    updateWorkLabel();
    if (workRemaining === 0) {
      money += 60;
      notify("Смена завершена: +60 ₽");
      updateInventory();
      save();
      renderPanel();
    }
  }
  if (flight) {
    flight.time += dt;
    const elapsed = flight.time;
    if (elapsed > 3) {
      if (flight.success) {
        rocketVisual.position.y = 0.2 + (elapsed - 3) ** 2 * 2;
        pitch = Math.min(0.85, (elapsed - 3) * 0.15);
      } else {
        rocketVisual.rotation.z = Math.min(1.5, (elapsed - 3) * 0.8);
        rocketVisual.position.y =
          0.2 +
          Math.max(0, Math.sin(Math.min(Math.PI, (elapsed - 3) * 1.4)) * 0.6);
      }
    }
    if (elapsed > 7) {
      const success = flight.success;
      flight = null;
      rebuildRocket();
      notify(
        success
          ? "Ракета взлетела! Можно строить следующую."
          : "Неудачный запуск. Замени двигатель и заправленный бак.",
      );
      save();
    }
  }
}
rebuildRocket();

updateInventory();
let previous = performance.now(),
  hudTime = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = (now - previous) / 1000;
  const dt = Math.min(elapsed, 0.05);
  previous = now;
  if (!paused) {
    const axes = panelKind ? { x: 0, z: 0 } : input.axes(),
      speed = input.has("ShiftLeft") || input.has("ShiftRight") ? 6 : 3.5;
    const dx = (axes.x * Math.cos(yaw) + axes.z * Math.sin(yaw)) * speed * dt;
    const dz = (-axes.x * Math.sin(yaw) + axes.z * Math.cos(yaw)) * speed * dt;
    if (canStand(camera.position.x + dx, camera.position.z, solids))
      camera.position.x += dx;
    if (canStand(camera.position.x, camera.position.z + dz, solids))
      camera.position.z += dz;
    if (dx || dz) walkTime += dt * speed;
    camera.position.y = 1.65 + (dx || dz ? Math.sin(walkTime * 7) * 0.025 : 0);
    camera.rotation.set(pitch, yaw, 0);
    camera.updateMatrixWorld();
    hudTime += dt;
    saveTime += dt;
    if (hudTime > 0.1) {
      hudTime = 0;
      findTarget();
      const x = camera.position.x,
        z = camera.position.z;
      const place =
        x < -11 && x > -21 && z > 1 && z < 11
          ? "Магазин"
          : x > 27 && x < 37 && z > -14 && z < -4
            ? "Работа"
            : z < -18
              ? "Мусорка"
              : Math.abs(x) < 5 && z > 1
                ? "Дом"
                : x > 9.5 && x < 20.5 && z > 0 && z < 12
                  ? "Гараж"
                  : "Двор";
      $("place").textContent = place;
      $("place-note").textContent = {
        Магазин: "Все детали доступны у прилавка. Покупки попадают в рюкзак.",
        Работа: "У стола можно отработать смену и получить 60 ₽.",
        Дом: "Твоё начало. Дом — позади, космос — впереди.",
        Гараж: "Верстак у дальней стены. Здесь можно сложить находки.",
        Мусорка:
          "Только картон, трубы и крепления. Подойди, посмотри на вещь и нажми E.",
        Двор: "Мусорка — по дорожке вперёд. Гараж — справа от дома.",
      }[place];
    }
    updateActivities(dt, elapsed);
    if (saveTime > 4) {
      saveTime = 0;
      save();
    }
  }
  toastTime -= dt;
  if (toastTime <= 0) $("toast").style.opacity = 0;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.rocketState = () => ({
  paused,
  money,
  rocket: { ...rocket },
  flights,
  failures,
  panelKind,
  workRemaining,
  flight: flight ? { time: flight.time, success: flight.success } : null,
  position: camera.position.toArray(),
  yaw,
  pitch,
  cargo: { ...cargo },
  storage: { ...storage },
  collected: [...collected],
  remaining: pickups.length,
  salvage: pickups.map((o) => ({
    id: o.userData.pickup,
    type: o.userData.type,
    position: o.position.toArray(),
  })),
  nearest: nearest ? { ...nearest.userData } : null,
  location: $("place").textContent,
});
