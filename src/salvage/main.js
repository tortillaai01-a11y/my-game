import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MovementInput } from "../simulator/controls.js";
import { batchStatic } from "../simulator/visuals.js";
import { texture } from "../rocket/visuals.js";
import {
  ITEMS,
  PROJECTS,
  circuit,
  createState,
  makeYard,
  searchPile,
  install,
  connect,
  disconnect,
  ready,
  roverCollect,
  unload,
  restore,
} from "./model.js";
import "./style.css";
const $ = (id) => document.getElementById(id),
  KEY = "salvage-workshop-v1";
let state;
try {
  state = restore(JSON.parse(localStorage.getItem(KEY)));
} catch {
  state = createState();
}
const yard = makeYard(),
  input = new MovementInput();
document.querySelector("#app").innerHTML = `
<div id="hud"><header><div><b>СВАЛКА ИДЕЙ</b><small>УЛИЧНАЯ МАСТЕРСКАЯ · 01</small></div><nav><button id="inventory">Находки · I</button><button id="quality">Графика: высокая</button><button id="pause">Пауза</button></nav></header><div id="location"><small>ИЗ НЕНУЖНОГО — В РАБОТАЮЩЕЕ</small><h2 id="place">Твоя площадка</h2><p id="note">Верстак под открытым небом. Свалка — прямо за ним.</p></div><div id="crosshair">+</div><div id="prompt"></div><div id="toast" role="status"></div><footer><span id="bag">Находок: 0</span><span>WASD — идти · Shift — бег · E — поиск / верстак<br>Мышь — обзор · I — находки · Esc — пауза</span></footer></div>
<div id="menu"><article><small>НОВАЯ ИСТОРИЯ / БЕЗ ГАРАЖА</small><h1>Свалка<br><em>идей.</em></h1><p>Собери ракету, квадрокоптер или машинку с камерой. Только ты, открытая площадка и то, что другие выбросили.</p><p>Полезные детали редки. Собирай узлы, соединяй провода вручную и проверяй аппарат перед запуском.</p><button id="start" class="primary">Выйти на площадку →</button><button id="start-light">Начать с лёгкой графикой</button><br><a href="./rocket.html">До орбиты</a> · <a href="./index.html">Другие игры</a><small>Прогресс сохраняется в этом браузере.<br>На телефоне: кнопки ходьбы и движение пальцем по экрану для обзора.</small></article></div>
<dialog id="panel"><button id="close" aria-label="Закрыть">×</button><div id="panel-content"></div></dialog>
<div id="camera-label" hidden>КАМЕРА МАШИНКИ · ГРУЗ <span id="cargo">0 / 1</span></div>
<div id="touch"><div><button data-key="KeyW">↑</button><br><button data-key="KeyA">←</button><button data-key="KeyS">↓</button><button data-key="KeyD">→</button></div><button id="use">E</button></div>`;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.querySelector("#app").prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#c7d2d0");
scene.fog = new THREE.Fog("#c7d2d0", 50, 140);
const camera = new THREE.PerspectiveCamera(
  67,
  innerWidth / innerHeight,
  0.08,
  180,
);
camera.rotation.order = "YXZ";
camera.position.set(0, 1.7, 11);
const roverCamera = new THREE.PerspectiveCamera(70, 1.5, 0.05, 120);
const pmrem = new THREE.PMREMGenerator(renderer),
  room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.08).texture;
scene.environmentIntensity = 0.5;
room.dispose();
pmrem.dispose();
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(145, 24, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader:
      "varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:
      "varying vec3 v; void main(){float h=clamp(normalize(v).y,0.0,1.0); vec3 c=mix(vec3(.78,.82,.79),vec3(.32,.51,.65),pow(h,.55)); float cloud=sin(v.x*.08+sin(v.z*.06))*sin(v.z*.09);c=mix(c,vec3(.89,.88,.81),smoothstep(.4,.85,cloud)*smoothstep(.05,.3,h)*.3);gl_FragColor=vec4(c,1.0);}",
  }),
);
scene.add(sky);
scene.add(new THREE.HemisphereLight("#d9e5ed", "#6f634b", 2.3));
const sun = new THREE.DirectionalLight("#ffe1ab", 3.3);
sun.position.set(-27, 45, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -48,
  right: 48,
  top: 45,
  bottom: -70,
  far: 130,
});
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun);
sun.target.position.set(0, 0, -24);
scene.add(sun.target);
const mat = (color, metalness = 0, roughness = 0.85) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });
const dirt = mat("#d4c5a9"),
  rust = mat("#c5b5a1", 0.5),
  wood = mat("#8f7452"),
  metal = mat("#889b9a", 0.75, 0.35),
  dark = mat("#283234"),
  rubber = mat("#252a28"),
  orange = mat("#da8b43", 0.35),
  glass = mat("#83acba", 0.65, 0.12);
for (const [m, k] of [
  [dirt, "ground"],
  [rust, "rust"],
  [wood, "wall"],
]) {
  m.map = texture(k);
  m.bumpMap = m.map;
  m.bumpScale = 0.04;
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, m, x, y, z, parent = scene) {
  const o = new THREE.Mesh(boxGeo, m);
  o.scale.set(w, h, d);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}
function cyl(r, h, m, x, y, z, parent = scene) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), m);
  o.position.set(x, y, z);
  o.castShadow = true;
  parent.add(o);
  return o;
}
function sign(text, x, y, z, width = 5) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 180;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#2b3835";
  ctx.fillRect(0, 0, 1024, 180);
  ctx.fillStyle = "#f0dfb9";
  ctx.font = "bold 64px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, 512, 112);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const o = new THREE.Mesh(
    new THREE.PlaneGeometry(width, (width * 180) / 1024),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }),
  );
  o.position.set(x, y, z);
  scene.add(o);
}
box(100, 0.3, 130, dirt, 0, -0.2, -36);
box(10, 0.08, 9, mat("#8b8e83"), 0, 0, 3);
cyl(2.7, 0.09, mat("#72776d"), 7, 0.02, 2);
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4;
  box(
    0.4,
    0.05,
    0.4,
    orange,
    7 + Math.cos(a) * 2.5,
    0.1,
    2 + Math.sin(a) * 2.5,
  );
}
for (const x of [-2.2, 2.2])
  for (const z of [1.3, 3]) box(0.14, 1.05, 0.14, metal, x, 0.5, z);
box(5, 0.18, 2.5, wood, 0, 1.1, 2.2);
for (let i = 0; i < 7; i++)
  box(0.06, 0.04, 0.7, metal, -1.8 + i * 0.35, 1.23, 2.3);
box(0.8, 0.4, 0.45, orange, 1.6, 1.4, 2);
sign("УЛИЧНЫЙ ВЕРСТАК", -5, 1.8, 2, 3);
for (const x of [-6, -4]) box(0.08, 1.8, 0.08, wood, x, 0.9, 1.95);
sign("СВАЛКА / ИЩИ В КУЧАХ", 0, 3, -11, 7);
for (const x of [-40, 40])
  for (let z = 14; z > -86; z -= 4) {
    box(0.12, 2.7, 0.12, metal, x, 1.35, z);
    box(0.06, 0.08, 4, metal, x, 1.8, z - 2);
    box(0.06, 0.08, 4, metal, x, 0.7, z - 2);
  }
for (let x = -40; x <= 40; x += 4) {
  box(0.12, 2.7, 0.12, metal, x, 1.35, -84);
  box(4, 0.08, 0.08, metal, x, 1.8, -84);
}
for (let i = 0; i < 12; i++) {
  const x = i % 2 ? -35 : 35,
    z = 5 - Math.floor(i / 2) * 14;
  box(5, 2.5, 7, rust, x, 1.25, z);
  for (let n = 0; n < 12; n++)
    box(0.09, 2.5, 0.08, metal, x - 2.4 + n * 0.43, 1.25, z + 3.55);
}
let seed = 123;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pileMeshes = new THREE.InstancedMesh(boxGeo, rust, yard.length),
  matrix = new THREE.Object3D();
for (const p of yard) {
  matrix.position.set(p.x, p.height * 0.5, p.z);
  matrix.scale.set(1.2, p.height, 1.3);
  if (p.id % 3 === 0) matrix.scale.setScalar(0.01);
  matrix.rotation.set(0.08, p.angle, 0.1);
  matrix.updateMatrix();
  pileMeshes.setMatrixAt(p.id, matrix.matrix);
  pileMeshes.setColorAt(
    p.id,
    new THREE.Color(
      state.searched.includes(p.id)
        ? "#514d43"
        : ["#969b87", "#b4a88c", "#838b86", "#ad8060"][p.id % 4],
    ),
  );
}
pileMeshes.castShadow = pileMeshes.receiveShadow = true;
scene.add(pileMeshes);
const debris = new THREE.InstancedMesh(boxGeo, mat("#afa38c"), 2400);
for (let i = 0; i < 2400; i++) {
  const p = yard[i % 600];
  matrix.position.set(
    p.x + (rnd() - 0.5) * 1.7,
    p.height * 0.4 + rnd() * 0.4,
    p.z + (rnd() - 0.5) * 1.7,
  );
  matrix.scale.set(0.1 + rnd() * 0.6, 0.05 + rnd() * 0.16, 0.1 + rnd() * 0.6);
  matrix.rotation.set(rnd() * 2, rnd() * 6, rnd() * 2);
  matrix.updateMatrix();
  debris.setMatrixAt(i, matrix.matrix);
  debris.setColorAt(
    i,
    new THREE.Color(["#cbc1a7", "#64736c", "#6b5443", "#abae9e"][i % 4]),
  );
}
debris.castShadow = true;
scene.add(debris);
const bags = new THREE.InstancedMesh(
  new THREE.DodecahedronGeometry(0.65, 1),
  mat("#34413a", 0.05, 0.8),
  200,
);
for (let i = 0; i < 200; i++) {
  const p = yard[i * 3];
  matrix.position.set(p.x, p.height * 0.5, p.z);
  matrix.rotation.set(0.15, p.angle, 0.1);
  matrix.scale.set(1.1, p.height, 1.1);
  matrix.updateMatrix();
  bags.setMatrixAt(i, matrix.matrix);
  bags.setColorAt(i, new THREE.Color(i % 2 ? "#74796b" : "#b0aca0"));
}
bags.castShadow = bags.receiveShadow = true;
scene.add(bags);
const drums = new THREE.InstancedMesh(
  new THREE.CylinderGeometry(0.28, 0.3, 0.9, 12),
  rust,
  100,
);
for (let i = 0; i < 100; i++) {
  const p = yard[i * 6];
  matrix.position.set(p.x + 0.5, 0.35, p.z + 0.4);
  matrix.rotation.set(0.4, p.angle, 0.7);
  matrix.scale.setScalar(1);
  matrix.updateMatrix();
  drums.setMatrixAt(i, matrix.matrix);
}
drums.castShadow = true;
scene.add(drums);
const tires = new THREE.InstancedMesh(
  new THREE.TorusGeometry(0.36, 0.13, 8, 12),
  rubber,
  180,
);
for (let i = 0; i < 180; i++) {
  const p = yard[i * 3];
  matrix.position.set(p.x + 0.7, 0.28, p.z - 0.5);
  matrix.rotation.set(Math.PI / 2, rnd(), rnd() * 3);
  matrix.scale.setScalar(1);
  matrix.updateMatrix();
  tires.setMatrixAt(i, matrix.matrix);
}
tires.castShadow = true;
scene.add(tires);
// Distant trees and industrial silhouettes frame the playable yard.
const foliage = mat("#657b65"),
  distant = mat("#8b9690");
for (let i = 0; i < 65; i++) {
  const x = (rnd() - 0.5) * 150,
    z = -90 - rnd() * 20;
  cyl(0.25, 6, wood, x, 3, z);
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3 + rnd() * 2, 1),
    foliage,
  );
  crown.position.set(x, 7, z);
  scene.add(crown);
}
for (let i = 0; i < 9; i++)
  box(7, 8 + rnd() * 12, 8, mat("#8b9690"), -65 + i * 15, 4, -116);
for (let i = 0; i < 3; i++) cyl(1, 30, rust, -50 + i * 18, 15, -110);
batchStatic(scene, new Set([sky]));
const project = new THREE.Group();
scene.add(project);
project.position.set(7, 0, 2);
let propellers = [],
  exhaust = null;
function rebuild() {
  while (project.children.length) {
    const child = project.children[0];
    project.remove(child);
    child.traverse((o) => {
      if (o.geometry && o.geometry !== boxGeo) o.geometry.dispose();
    });
  }
  propellers = [];
  exhaust = null;
  project.position.set(7, 0, 2);
  project.rotation.set(0, 0, 0);
  const b = state.builds[state.type],
    has = (k) => b.parts.includes(k);
  if (state.type === "rocket") {
    if (has("frame")) {
      cyl(0.38, 3, metal, 0, 1.8, 0, project);
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 0.8, 20),
        orange,
      );
      nose.position.y = 3.7;
      project.add(nose);
      for (let i = 0; i < 4; i++) {
        const fin = box(0.12, 0.7, 0.8, rust, 0, 0.6, 0, project);
        fin.rotation.y = (i * Math.PI) / 2;
        fin.position.x = Math.sin((i * Math.PI) / 2) * 0.4;
        fin.position.z = Math.cos((i * Math.PI) / 2) * 0.4;
      }
    }
    if (has("drive")) {
      cyl(0.3, 0.5, dark, 0, 0.25, 0, project);
      exhaust = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 1.7, 12),
        new THREE.MeshBasicMaterial({
          color: "#ffbb55",
          transparent: true,
          opacity: 0.85,
        }),
      );
      exhaust.rotation.z = Math.PI;
      exhaust.position.y = -0.6;
      exhaust.visible = false;
      project.add(exhaust);
    }
  } else {
    if (has("frame"))
      box(
        state.type === "rover" ? 1.5 : 1,
        0.25,
        1.2,
        metal,
        0,
        0.6,
        0,
        project,
      );
    if (has("drive"))
      for (let i = 0; i < 4; i++) {
        const x = i % 2 ? 1 : -1,
          z = i < 2 ? -0.8 : 0.8;
        if (state.type === "drone") {
          const arm = box(
            2,
            0.09,
            0.12,
            rust,
            x * 0.45,
            0.65,
            z * 0.45,
            project,
          );
          arm.rotation.y = x * z > 0 ? -0.7 : 0.7;
          cyl(0.16, 0.25, dark, x, 0.75, z, project);
          propellers.push(box(1.25, 0.035, 0.12, rubber, x, 0.91, z, project));
        } else {
          const wheel = cyl(0.3, 0.2, rubber, x * 0.85, 0.35, z * 0.6, project);
          wheel.rotation.z = Math.PI / 2;
        }
      }
  }
  if (has("power"))
    box(
      0.45,
      0.22,
      0.6,
      orange,
      0,
      state.type === "rocket" ? 1.6 : 0.85,
      0,
      project,
    );
  if (has("control")) {
    box(
      0.3,
      0.12,
      0.3,
      mat("#3e7e69"),
      0.12,
      state.type === "rocket" ? 2.4 : 1.02,
      0,
      project,
    );
    if (state.type === "rover") {
      box(0.35, 0.25, 0.25, dark, 0, 1.1, -0.4, project);
      const lens = cyl(0.1, 0.06, glass, 0, 1.1, -0.55, project);
      lens.rotation.x = Math.PI / 2;
    }
  }
  for (let i = 0; i < b.wires.length; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, 0.9, i * 0.05),
      new THREE.Vector3(-0.5, 1.1, i * 0.05),
      new THREE.Vector3(0.2, 1.05, i * 0.05),
    ]);
    project.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 12, 0.018, 5, false),
        mat(["#b23d31", "#30393f", "#d5b650"][i % 3]),
      ),
    );
  }
  renderer.shadowMap.needsUpdate = true;
}
rebuild();
let playing = false,
  yaw = 0,
  pitch = -0.12,
  nearest = null,
  searching = null,
  flight = null,
  wireStart = null,
  high = true,
  toastTimer = 0;
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    notify("Не удалось сохранить: хранилище браузера недоступно.");
  }
}
function notify(message) {
  $("toast").textContent = message;
  toastTimer = 5;
}
function stats() {
  $("bag").textContent =
    "Находок: " +
    Object.values(state.inventory).reduce((a, b) => a + b, 0) +
    " · осмотрено " +
    state.searched.length +
    "/600";
}
function pause() {
  playing = false;
  $("camera-label").hidden = true;
  input.clear();
  searching = null;
  look = null;
  document.exitPointerLock?.();
  $("menu").hidden = false;
}
async function start() {
  playing = true;
  $("menu").hidden = true;
  try {
    await renderer.domElement.requestPointerLock?.();
  } catch {}
}
$("start").onclick = start;
$("pause").onclick = pause;
document.addEventListener("pointerlockchange", () => {
  if (!document.pointerLockElement) input.clear();
});
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
function showPanel(workshop = false) {
  input.clear();
  document.exitPointerLock?.();
  searching = null;
  renderPanel(workshop);
  $("panel").showModal();
}
$("inventory").onclick = () => showPanel(false);
$("close").onclick = () => {
  input.clear();
  $("panel").close();
};
const costText = (cost) =>
  Object.entries(cost)
    .map(([k, n]) => ITEMS[k] + " " + state.inventory[k] + "/" + n)
    .join(" · ");
function renderPanel(workshop) {
  const node = $("panel-content");
  node.replaceChildren();
  if (!workshop) {
    node.innerHTML =
      "<small>ТОЛЬКО НАХОДКИ СО СВАЛКИ</small><h2>В рюкзаке</h2>" +
      Object.entries(ITEMS)
        .map(([k, n]) => "<p>" + n + " <b>" + state.inventory[k] + "</b></p>")
        .join("");
    return;
  }
  node.innerHTML =
    '<small>УЛИЧНЫЙ ВЕРСТАК</small><h2>Собери свою идею</h2><div id="projects"></div><p id="project-note"></p><div id="recipes"></div><h3>Соедини контакты вручную</h3><p>Нажми контакт слева, затем справа. Каждый провод расходуется из рюкзака. Схема ниже подсказывает пары; неверное соединение блокирует запуск. Нажатие на провод возвращает его в рюкзак.</p><div id="wiring"><svg id="wires" viewBox="0 0 600 300" preserveAspectRatio="none"></svg><div id="left-ports"></div><div id="right-ports"></div></div><p id="diagram"></p><div id="connections"></div><div id="rover-options"></div><p id="diagnostic" role="status"></p><button id="launch" class="primary">Испытать аппарат</button>';
  for (const [id, p] of Object.entries(PROJECTS)) {
    const b = document.createElement("button");
    b.textContent = p.name;
    b.className = state.type === id ? "active" : "";
    b.disabled = !!flight;
    b.onclick = () => {
      state.type = id;
      wireStart = null;
      save();
      rebuild();
      renderPanel(true);
    };
    $("projects").append(b);
  }
  $("project-note").textContent = PROJECTS[state.type].note;
  for (const [id, title, cost] of PROJECTS[state.type].slots) {
    const row = document.createElement("div");
    row.className = "recipe";
    const done = state.builds[state.type].parts.includes(id);
    row.innerHTML =
      "<div><b>" + title + "</b><small>" + costText(cost) + "</small></div>";
    const b = document.createElement("button");
    b.textContent = done ? "Установлено" : "Установить";
    b.disabled =
      done ||
      !!flight ||
      Object.entries(cost).some(([k, n]) => state.inventory[k] < n);
    b.onclick = () => {
      install(state, id);
      save();
      rebuild();
      renderPanel(true);
    };
    row.append(b);
    $("recipes").append(row);
  }
  const nets = circuit(state.type),
    connections = state.builds[state.type].wires;
  nets.forEach((net, i) => {
    for (const side of [0, 1]) {
      const b = document.createElement("button");
      b.className = "port";
      b.textContent = net[side] + " · " + net[side + 2];
      b.dataset.port = net[side];
      b.disabled = !!flight;
      b.onclick = () => {
        if (!wireStart) {
          wireStart = net[side];
          b.classList.add("selected");
        } else {
          const ok = connect(state, wireStart, net[side]);
          wireStart = null;
          save();
          rebuild();
          renderPanel(true);
          $("diagnostic").textContent = ok
            ? "Провод подключён."
            : "Не получилось: нужен свободный контакт с каждой стороны и провод в рюкзаке.";
        }
      };
      $(side ? "right-ports" : "left-ports").append(b);
    }
  });
  $("diagram").textContent =
    "Схема: " +
    nets.map((n) => n[0] + " → " + n[1]).join(" · ") +
    " | Проводов: " +
    state.inventory.wire;
  connections.forEach((w, index) => {
    const a = nets.findIndex((n) => n[0] === w[0]),
      b = nets.findIndex((n) => n[1] === w[1]);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      `M 190 ${((a + 0.5) * 300) / nets.length} C 260 ${((a + 0.5) * 300) / nets.length},340 ${((b + 0.5) * 300) / nets.length},410 ${((b + 0.5) * 300) / nets.length}`,
    );
    path.setAttribute("stroke", a === b ? "#e8b55b" : "#e77763");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-width", "4");
    $("wires").append(path);
    const button = document.createElement("button");
    button.textContent = "Снять " + w.join(" → ");
    button.disabled = !!flight;
    button.onclick = () => {
      disconnect(state, index);
      save();
      rebuild();
      renderPanel(true);
    };
    $("connections").append(button);
  });
  if (state.type === "rover") {
    const label = document.createElement("label");
    label.textContent = "Какой предмет искать: ";
    const select = document.createElement("select");
    select.id = "rover-target";
    for (const [id, name] of Object.entries(ITEMS)) {
      const o = new Option(name, id);
      select.add(o);
    }
    select.value = state.target;
    select.disabled = !!flight;
    select.onchange = () => {
      state.target = select.value;
      save();
    };
    label.append(select);
    $("rover-options").append(label);
    const b = document.createElement("button");
    b.id = "unload";
    b.textContent = state.cargo
      ? "Разгрузить: " + ITEMS[state.cargo]
      : "Груз: 0 / 1";
    b.disabled = !state.cargo || !!flight;
    b.onclick = () => {
      unload(state);
      save();
      stats();
      renderPanel(true);
    };
    $("rover-options").append(b);
  }
  $("diagnostic").textContent = ready(state)
    ? "Проверка пройдена. Цепи замкнуты правильно."
    : "Нужны все узлы и правильные соединения.";
  $("launch").disabled =
    !ready(state) || !!flight || (state.type === "rover" && !!state.cargo);
  $("launch").onclick = launch;
}
function launch() {
  if (!ready(state) || flight) return;
  if (state.type === "rover" && state.cargo) return;
  const target =
    state.type === "rover"
      ? yard
          .filter(
            (p) => p.item === state.target && !state.collected.includes(p.id),
          )
          .sort(
            (a, b) =>
              Math.hypot(a.x - 7, a.z - 2) - Math.hypot(b.x - 7, b.z - 2),
          )[0]
      : null;
  if (state.type === "rover" && !target) {
    $("diagnostic").textContent =
      "На свалке больше нет такого предмета. Выбери другой.";
    return;
  }
  flight = {
    type: state.type,
    t: 0,
    target,
    returning: false,
    success: Math.random() < 0.85,
  };
  $("panel").close();
  notify(
    state.type === "rover"
      ? "Машинка ищет " + ITEMS[state.target] + ". Вместимость: 1."
      : "Испытание началось. Наблюдай за аппаратом справа от верстака.",
  );
}
function interact() {
  if (!playing || $("panel").open) return;
  if (Math.hypot(camera.position.x, camera.position.z - 2) < 5) {
    showPanel(true);
    return;
  }
  if (nearest && !state.searched.includes(nearest.id) && !searching)
    searching = { id: nearest.id, t: 0 };
}
$("use").onclick = interact;
window.addEventListener("keydown", (e) => {
  if ($("panel").open) return;
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
    ].includes(e.code)
  )
    e.preventDefault();
  if (e.code === "Escape") {
    pause();
    return;
  }
  if (!playing) return;
  if (e.code === "KeyG" && !e.repeat) $("quality").click();
  if (e.code === "KeyE" && !e.repeat) interact();
  if (e.code === "KeyI" && !e.repeat) showPanel(false);
  input.press(e.code, e.repeat);
});
window.addEventListener("keyup", (e) => input.release(e.code));
document.addEventListener("mousemove", (e) => {
  if (
    document.pointerLockElement === renderer.domElement &&
    playing &&
    !$("panel").open
  ) {
    yaw -= e.movementX * 0.0025;
    pitch = Math.max(-1.3, Math.min(1.3, pitch - e.movementY * 0.0025));
  }
});
let look = null;
renderer.domElement.addEventListener("pointerdown", (e) => {
  if (playing && !document.pointerLockElement) {
    look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    renderer.domElement.setPointerCapture(e.pointerId);
  }
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (look?.id === e.pointerId) {
    yaw -= (e.clientX - look.x) * 0.004;
    pitch = Math.max(-1.3, Math.min(1.3, pitch - (e.clientY - look.y) * 0.004));
    look.x = e.clientX;
    look.y = e.clientY;
  }
});
for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
  renderer.domElement.addEventListener(name, () => (look = null));
for (const b of document.querySelectorAll("[data-key]")) {
  b.onpointerdown = (e) => {
    input.holdPointer(e.pointerId, b.dataset.key);
    b.setPointerCapture(e.pointerId);
  };
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, (e) => input.releasePointer(e.pointerId));
}
$("quality").onclick = () => {
  high = !high;
  hasRendered = false;
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.5 : 1));
  renderer.shadowMap.enabled = high;
  debris.visible = high;
  sky.visible = high;
  $("quality").textContent = "Графика: " + (high ? "высокая" : "лёгкая");
};
function canWalk(x, z) {
  return (
    Math.abs(x) < 39 &&
    z > -83 &&
    z < 14 &&
    !(Math.abs(x) < 2.8 && z > 0.5 && z < 3.9) &&
    !(
      Math.abs(x) > 31 &&
      Math.abs(x) < 38 &&
      [5, -9, -23, -37, -51, -65].some((v) => Math.abs(z - v) < 4)
    )
  );
}
function refreshPiles() {
  for (const id of state.searched)
    pileMeshes.setColorAt(id, new THREE.Color("#514d43"));
  pileMeshes.instanceColor.needsUpdate = true;
}
function updateFlight(dt) {
  if (!flight) return;
  flight.t += dt;
  renderer.shadowMap.needsUpdate = true;
  if (flight.type === "rover") {
    const target = flight.returning ? { x: 7, z: 2 } : flight.target;
    const dx = target.x - project.position.x,
      dz = target.z - project.position.z,
      d = Math.hypot(dx, dz);
    if (d < 0.4) {
      if (!flight.returning) {
        if (!roverCollect(state, flight.target)) {
          const another = yard.find(
            (p) => p.item === state.target && !state.collected.includes(p.id),
          );
          if (another) {
            flight.target = another;
            return;
          }
          flight.returning = true;
          notify("Этот предмет уже забрали. Возвращаюсь без груза.");
          return;
        }
        flight.returning = true;
        save();
        refreshPiles();
        notify(
          "Найдено: " + ITEMS[state.cargo] + ". Отсек заполнен, возвращаюсь.",
        );
      } else {
        flight = null;
        notify("Машинка вернулась. Разгрузи 1 предмет на верстаке.");
      }
    } else {
      project.position.x += (dx / d) * Math.min(d, dt * 5);
      project.position.z += (dz / d) * Math.min(d, dt * 5);
      project.rotation.y = Math.atan2(-dx, -dz);
    }
  } else if (flight.type === "drone") {
    project.position.set(
      7 + Math.sin(flight.t * 0.6) * 3,
      Math.min(5, flight.t * 1.5, Math.max(0, (16 - flight.t) * 2)),
      2 + Math.cos(flight.t * 0.6) * 3,
    );
    for (const p of propellers) p.rotation.y += dt * 60;
    if (flight.t > 16) {
      flight = null;
      project.position.set(7, 0, 2);
      notify("Квадрокоптер завершил пробный облёт.");
    }
  } else {
    if (exhaust) exhaust.visible = true;
    if (flight.success) {
      project.position.y = flight.t * flight.t * 1.8;
      if (flight.t > 9) {
        flight = null;
        rebuild();
        notify(
          "Ракета поднялась! Испытание успешно. Модель возвращена на стенд.",
        );
      }
    } else {
      project.position.y = Math.max(
        0,
        4 * Math.sin(Math.min(Math.PI, flight.t)),
      );
      project.rotation.z = Math.sin(flight.t) * 0.4;
      if (flight.t > 4) {
        flight = null;
        rebuild();
        notify(
          "Запуск не удался: тяга нестабильна. Провода исправны, попробуй повторить испытание.",
        );
      }
    }
  }
}
let previous = performance.now(),
  hasRendered = false;
$("start-light").onclick = () => {
  if (high) $("quality").click();
  start();
};
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.15, (now - previous) / 1000);
  previous = now;
  const active = playing && !$("panel").open;
  if (!active && hasRendered) return;
  if (active) {
    const a = input.axes(),
      speed = input.has("ShiftLeft") ? 7 : 4;
    const dx = (a.x * Math.cos(yaw) + a.z * Math.sin(yaw)) * dt * speed,
      dz = (-a.x * Math.sin(yaw) + a.z * Math.cos(yaw)) * dt * speed;
    if (canWalk(camera.position.x + dx, camera.position.z))
      camera.position.x += dx;
    if (canWalk(camera.position.x, camera.position.z + dz))
      camera.position.z += dz;
    camera.rotation.set(pitch, yaw, 0);
    nearest =
      yard
        .filter(
          (p) =>
            !state.searched.includes(p.id) &&
            Math.hypot(p.x - camera.position.x, p.z - camera.position.z) < 3,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - camera.position.x, a.z - camera.position.z) -
            Math.hypot(b.x - camera.position.x, b.z - camera.position.z),
        )[0] ?? null;
    if (searching) {
      const p = yard[searching.id];
      if (Math.hypot(p.x - camera.position.x, p.z - camera.position.z) > 3)
        searching = null;
      else {
        searching.t += dt;
        if (searching.t >= 2) {
          const found = searchPile(state, p);
          notify(
            found
              ? "Нашёл: " + ITEMS[found]
              : "Только грязная упаковка и обломки. Ничего полезного.",
          );
          searching = null;
          refreshPiles();
          save();
          stats();
        }
      }
    }
    $("prompt").textContent = searching
      ? "Разбираешь мусор… " + Math.floor((searching.t / 2) * 100) + "%"
      : Math.hypot(camera.position.x, camera.position.z - 2) < 5
        ? "E · Открыть уличный верстак"
        : nearest
          ? "E · Порыться в куче мусора"
          : "";
    $("place").textContent =
      camera.position.z < -12 ? "Свалка" : "Твоя площадка";
    $("note").textContent =
      camera.position.z < -12
        ? "Не всё, что блестит, пригодится. Осматривай каждую кучу."
        : "Сборка на верстаке, испытания — на площадке справа.";
    updateFlight(dt);
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $("toast").textContent = "";
  }
  renderer.setViewport(0, 0, innerWidth, innerHeight);
  renderer.setScissorTest(false);
  renderer.render(scene, camera);
  hasRendered = true;
  const showCam =
    state.type === "rover" &&
    state.builds.rover.parts.includes("control") &&
    state.builds.rover.parts.includes("frame") &&
    playing;
  $("camera-label").hidden = !showCam;
  if (showCam) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(project.quaternion);
    roverCamera.position
      .copy(project.position)
      .add(new THREE.Vector3(0, 1.2, 0))
      .add(dir.clone().multiplyScalar(0.75));
    roverCamera.lookAt(
      roverCamera.position.clone().add(dir.multiplyScalar(10)),
    );
    const w = Math.min(300, innerWidth * 0.4),
      h = w / 1.5;
    renderer.setScissorTest(true);
    renderer.setScissor(innerWidth - w - 16, 82, w, h);
    renderer.setViewport(innerWidth - w - 16, 82, w, h);
    renderer.render(scene, roverCamera);
    renderer.setScissorTest(false);
    $("cargo").textContent = state.cargo ? "1 / 1" : "0 / 1";
  }
}
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  hasRendered = false;
});
stats();
refreshPiles();
requestAnimationFrame(frame);
window.salvageState = () =>
  structuredClone({
    ...state,
    position: camera.position.toArray(),
    nearest: nearest?.id ?? null,
    flight,
    playing,
    vehiclePosition: project.position.toArray(),
    movement: input.axes(),
    yaw,
    pitch,
    yard,
  });
