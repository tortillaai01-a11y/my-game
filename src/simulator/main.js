import * as THREE from "three";
import "./style.css";
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
  `<div id="interface"><div class="top"><div class="brand"><div class="logo">🐹</div><div><h1>Хомячьи будни</h1><p>Маленькая жизнь · большой уют</p></div></div><div class="top-right"><div class="pill"><i></i>Свободный день <span id="time">08:00</span></div><button class="icon-button" id="pause" title="Пауза и управление">II</button></div></div><div class="side-note"><strong>Твой маленький мир</strong>Одна клетка. Два характера.<br>Никаких заданий и спешки.<br><span id="neighbor">Сосед осматривается</span></div><div class="bottom"><button id="prompt"></button><div class="stats">${[
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
    )}</div><div class="controls"><span><b>WASD</b> ходить</span><span><b>SHIFT</b> бежать</span><span><b>ПРОБЕЛ</b> прыгнуть</span><span><b>E</b> действие</span><span><b>F</b> толкнуть</span><span><b>МЫШЬ + ЗАЖАТИЕ</b> обзор</span></div></div></div><div id="toast"></div><div id="hurt"></div><div id="mobile"><div class="dpad"><span></span><button data-key="KeyW">↑</button><span></span><button data-key="KeyA">←</button><button data-key="KeyS">↓</button><button data-key="KeyD">→</button></div><div class="actions"><button data-action="jump">↟</button><button data-action="interact">E</button><button data-action="fight">F</button></div></div><div id="veil"><div class="welcome"><div class="eyebrow">Симулятор хомячьей жизни</div><h2 id="modal-title">Просто быть<br>хомяком.</h2><p id="modal-text">Пошурши наполнителем, поешь, попей и покрути колесо. Рядом живёт ещё один хомяк — колесо у вас общее. Здесь некуда спешить и нечего выигрывать.</p><div class="keys">Приблизься к миске, поилке, домику или колесу и нажми <b>E</b>. Повторное нажатие завершает действие.<br><b>Колесо</b> тренирует запас выносливости до 160, но утомляет и вдвое быстрее расходует воду.<br><b>F</b> — толкнуть соседа. Осторожно: он даст сдачи!</div><button id="start">Заселиться в клетку →</button><a href="./shooter.html">Перейти к игре «Кормовой переворот»</a><p class="sub">Состояние сохраняется автоматически в этом браузере</p></div></div>`;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#dfe8df");
scene.fog = new THREE.Fog("#dfe8df", 32, 68);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.querySelector("#app").prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(
  52,
  innerWidth / innerHeight,
  0.1,
  90,
);
scene.add(new THREE.HemisphereLight("#fffae3", "#9aa28c", 3));
const sun = new THREE.DirectionalLight("#fff0d2", 3);
sun.position.set(-8, 22, 9);
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
sun.shadow.bias = -0.001;
scene.add(sun);
const material = (color, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const M = {
  bedding: material("#d6bc88"),
  chip: material("#e4cba0"),
  cream: material("#f4e9d0"),
  fur: material("#bf8c53"),
  pale: material("#c8bab0"),
  pink: material("#d8a198"),
  dark: material("#423d34"),
  green: material("#91aa93"),
  wood: material("#c89e72"),
  roof: material("#8fa7a0"),
  metal: material("#bac5b6", 0.5, 0.4),
  water: material("#95c5c9", 0.25),
  food: material("#a98a50"),
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1),
  sphereGeo = new THREE.SphereGeometry(1, 18, 12);
function mesh(geo, mat, parent = scene, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
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
  scene.add(s);
  return s;
}
box(26, 1, 22, M.green, scene, 0, -0.6, 0);
box(25, 0.18, 21, M.bedding, scene, 0, -0.04, 0);
box(45, 0.7, 37, material("#c2c5b1"), scene, 0, -1.45, 0);
let seed = 713;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const chips = new THREE.InstancedMesh(boxGeo, M.chip, 1900),
  dummy = new THREE.Object3D();
for (let i = 0; i < 1900; i++) {
  dummy.position.set(
    (rand() - 0.5) * 24.7,
    0.05 + rand() * 0.06,
    (rand() - 0.5) * 20.7,
  );
  dummy.rotation.set(rand() * 0.25, rand() * 6.28, rand() * 0.3);
  dummy.scale.set(
    0.13 + rand() * 0.5,
    0.04 + rand() * 0.04,
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
frontRail.opacity = 0.23;
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
for (const [i, x] of [-8, 8].entries()) {
  const g = new THREE.Group();
  g.position.set(x, 0, 5.4);
  scene.add(g);
  cyl(1.1, 0.9, 0.52, i ? M.roof : M.green, g, 0, 0.3, 0);
  cyl(0.94, 0.94, 0.06, M.food, g, 0, 0.57, 0);
  for (let j = 0; j < 28; j++) {
    const a = rand() * 6.28,
      r = rand() * 0.8;
    ball(
      Math.cos(a) * r,
      0.65 + rand() * 0.06,
      Math.sin(a) * r,
      0.12,
      0.07,
      0.08,
      j % 2 ? M.wood : M.cream,
      g,
    );
  }
  stations.push({ type: "food", x, z: 5.4, name: "Поесть из миски" });
  textLabel("Корм", x, 1.8, 5.4);
}
for (const [i, x] of [-10, 10].entries()) {
  const g = new THREE.Group();
  g.position.set(x, 0, -0.3);
  scene.add(g);
  box(0.16, 3, 0.16, M.metal, g, 0, 1.5, -0.3);
  const bottle = cyl(0.42, 0.42, 1.8, M.water, g, 0, 2.3, 0);
  cyl(0.46, 0.46, 0.2, i ? M.roof : M.green, g, 0, 3.3, 0);
  const nozzle = cyl(0.09, 0.09, 0.7, M.metal, g, 0, 1.2, 0.25);
  nozzle.rotation.x = -0.6;
  ball(0, 0.87, 0.46, 0.12, 0.13, 0.12, M.water, g);
  stations.push({ type: "water", x, z: 0.3, name: "Попить из поилки" });
  textLabel("Вода", x, 3.9, -0.3);
}
function hamster(fur) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  ball(0, 0.65, 0, 0.55, 0.59, 0.7, fur, body);
  ball(0, 0.65, 0.52, 0.42, 0.39, 0.16, M.cream, body);
  ball(0, 1.17, 0.28, 0.57, 0.48, 0.49, fur, body);
  for (const x of [-0.4, 0.4]) {
    ball(x, 1.55, 0.24, 0.2, 0.24, 0.13, fur, body);
    ball(x, 1.56, 0.35, 0.12, 0.15, 0.035, M.pink, body);
    ball(x * 0.65, 1.25, 0.69, 0.065, 0.08, 0.045, M.dark, body);
    ball(x * 0.75, 1.02, 0.68, 0.21, 0.18, 0.13, M.cream, body);
  }
  ball(0, 1.11, 0.8, 0.08, 0.06, 0.06, M.pink, body);
  const feet = [];
  for (const x of [-0.3, 0.3])
    for (const z of [-0.3, 0.38])
      feet.push(ball(x, 0.13, z, 0.17, 0.13, 0.23, fur, body));
  ball(0, 0.4, -0.68, 0.12, 0.12, 0.15, M.pink, body);
  return { root, body, feet };
}
const player = hamster(M.fur),
  bot = hamster(M.pale);
scene.add(player.root, bot.root);
player.root.position.set(0, 0, 4);
bot.root.position.set(-4, 0, -3);
const botLabel = textLabel("Плюш · сосед", -4, 2.3, -3);
const keys = new Set();
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
  yaw = 0.15,
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
          : activity === "sleep"
            ? "Проснуться"
            : "Закончить",
    };
  if (p.y < 0.7) {
    for (const s of stations)
      if (Math.hypot(p.x - s.x, p.z - s.z) < 2.25) return s;
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
  activity = n.type;
  if (activity === "sleep")
    notify("Сон восстанавливает здоровье, если ты сыт и напоен.");
}
function jump() {
  if (paused || dead || !grounded) return;
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
  keys.clear();
  save();
  if (paused)
    modal(
      "Тихий час",
      "Жизнь в клетке на паузе. Голод, жажда и сосед подождут.",
      "Вернуться к хомяку →",
    );
  else $("veil").classList.add("hidden");
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
window.addEventListener("keydown", (e) => {
  if (
    [
      "Space",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.code)
  )
    e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "KeyE") interact();
  if (e.code === "Space") jump();
  if (e.code === "KeyF") pushBot();
  if (e.code === "Escape" && !dead) setPause(!paused);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  if (!paused && !dead) setPause(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !paused && !dead) setPause(true);
});
window.addEventListener("pagehide", save);
renderer.domElement.addEventListener("pointerdown", (e) => {
  drag = true;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointerup", () => (drag = false));
renderer.domElement.addEventListener("pointercancel", () => (drag = false));
renderer.domElement.addEventListener("pointermove", (e) => {
  if (drag) {
    yaw -= e.movementX * 0.006;
    pitch = THREE.MathUtils.clamp(pitch + e.movementY * 0.003, 0.2, 1.1);
  }
});
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    distance = THREE.MathUtils.clamp(distance + e.deltaY * 0.008, 6, 17);
  },
  { passive: true },
);
for (const b of document.querySelectorAll("[data-key]")) {
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys.add(b.dataset.key);
  };
  b.onpointerup = b.onpointercancel = () => keys.delete(b.dataset.key);
}
for (const b of document.querySelectorAll("[data-action]"))
  b.onclick = () => ({ jump, interact, fight: pushBot })[b.dataset.action]();
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
  const p = bot.root.position;
  const distanceToPlayer = p.distanceTo(player.root.position);
  if (botNeeds.health < 15 && botActivity !== "sleep") {
    if (wheelOwner === "bot") wheelOwner = null;
    botActivity = "sleep";
    botTimer = 30;
    p.set(6, 0, -5);
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
      botActivity = "wander";
      botTimer = 8;
      botTarget.set(0, 0, 1);
    } else {
      animateHamster(bot, true, t);
      return;
    }
  }
  if (botActivity === "food" || botActivity === "water") {
    const key = botActivity;
    botNeeds[key] = Math.min(100, botNeeds[key] + dt * 13);
    if (botNeeds[key] >= 99) {
      botActivity = "wander";
      botTimer = 3;
    }
    animateHamster(bot, false, t);
    return;
  }
  if (botActivity === "sleep") {
    if (botTimer <= 0 && botNeeds.health > 60) {
      botActivity = "wander";
      p.set(6, 0, -0.8);
      botTimer = 3;
    }
    bot.body.rotation.z = 0.7;
    return;
  }
  bot.body.rotation.z = 0;
  if (botTimer <= 0 && botActivity !== "angry") {
    if (botNeeds.water < 65) {
      botTarget.set(10, 0, 1.6);
      botActivity = "seek-water";
    } else if (botNeeds.food < 65) {
      botTarget.set(8, 0, 7);
      botActivity = "seek-food";
    } else if (!wheelOwner && botNeeds.stamina > 45) {
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
  } else if (botActivity === "seek-water") botActivity = "water";
  else if (botActivity === "seek-food") botActivity = "food";
  animateHamster(bot, moving, t);
}
function update(dt) {
  t += dt;
  worldTime += dt;
  actionCooldown = Math.max(0, actionCooldown - dt);
  const p = player.root.position;
  let dx =
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
    dz =
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  const moving = !!(dx || dz);
  if (moving && activity !== "rest") stop();
  const sprint =
    moving &&
    (keys.has("ShiftLeft") || keys.has("ShiftRight")) &&
    needs.stamina > 1;
  needs = tickNeeds(
    needs,
    dt,
    activity === "rest" ? (sprint ? "sprint" : "rest") : activity,
  );
  if (activity === "wheel") {
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
    if (activity === "food" || activity === "water") {
      needs[activity] = Math.min(100, needs[activity] + dt * 15);
      if (needs[activity] >= 100) {
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
      player.root.rotation.y = Math.atan2(wx, wz);
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
      sleep: "Плюш спит в домике",
      food: "Плюш ест",
      water: "Плюш пьёт",
      "seek-wheel": "Плюш идёт к колесу",
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
  for (const key of ["health", "stamina", "food", "water"]) {
    const max = key === "stamina" ? needs.capacity : 100;
    $(key).textContent =
      key === "stamina" ? Math.floor(needs[key]) : Math.ceil(needs[key]);
    $("max-" + key).textContent = "/ " + Math.floor(max);
    $("bar-" + key).style.width = Math.min(100, (needs[key] / max) * 100) + "%";
    $("card-" + key).classList.toggle("low", needs[key] < 20);
  }
  const n = nearby();
  $("prompt").innerHTML = paused ? "" : n ? `<kbd>E</kbd>${n.name}` : "";
  const minutes = 8 * 60 + Math.floor(worldTime * 2);
  $("time").textContent =
    String(Math.floor(minutes / 60) % 24).padStart(2, "0") +
    ":" +
    String(minutes % 60).padStart(2, "0");
}
const target = new THREE.Vector3();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (!paused) update(dt);
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $("toast").style.opacity = 0;
  }
  hud();
  target.copy(player.root.position).add(new THREE.Vector3(0, 0.85, 0));
  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance,
  );
  camera.position.lerp(target.clone().add(offset), 1 - Math.exp(-dt * 8));
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
  activity,
  botActivity,
  wheelOwner,
  dead,
  objects: { hamsters: 2, wheels: 1, houses: 1, bowls: 2, drinkers: 2 },
});
