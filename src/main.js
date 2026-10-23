import * as THREE from "three";
import "./style.css";
import {
  MAX_HP,
  PLAYER_DAMAGE,
  BOT_DAMAGE,
  ARENA_SIZE,
  applyDamage,
  canOccupy,
} from "./game.js";

const app = document.querySelector("#app");
app.innerHTML = `<div id="hud" class="dim"><div class="top"><div class="brand">ХОМЯК<span style="color:#d6ed89">.</span><small>КОРМОВОЙ ПЕРЕВОРОТ</small></div><div class="badge"><i></i>АРЕНА 01 / БОЛЬШАЯ КЛЕТКА</div></div><div class="bottom"><div class="stats"><div class="stat"><label>ЗДОРОВЬЕ</label><b id="hp">100</b><span> / 100</span><div class="healthbar"><div id="hpbar" style="width:100%"></div></div></div><div class="stat"><label>БОТЫ НА АРЕНЕ</label><b id="enemies">6</b><span> / 6</span></div></div><div class="weapon"><label>ПАКЕТИК С КОРМОМ</label><b><span id="ammo">24</span> <span style="font-size:15px;color:#97a78b">/ ∞</span></b><small>R — досыпать корм</small></div></div></div><div id="crosshair"></div><div id="damage"></div><div id="notice"></div><div id="overlay"><div class="panel"><div class="eyebrow">МАЛЕНЬКИЙ ХОМЯК. БОЛЬШАЯ БИТВА.</div><h1 id="title">Клетка.<br>Корм.<br><em>Хаос.</em></h1><p class="description" id="description">Твой дом стал ареной. Вооружись пакетиком корма, укройся в наполнителе и покажи ботам, кто здесь главный хомяк.</p><button class="launch" id="play">ВОЙТИ В КЛЕТКУ <span>↗</span></button><div class="controls"><div><b>W A S D</b>Движение</div><div><b>МЫШЬ / ЛКМ</b>Прицел / огонь</div><div><b>SHIFT / R</b>Бег / перезарядка</div><div><b>ESC</b>Пауза</div></div><p class="muted">6 ботов · 100 HP у каждого · игра для компьютера</p></div><div class="scene-caption">ДОБРО ПОЖАЛОВАТЬ НА СВОЮ ТЕРРИТОРИЮ</div><div class="footnote">01 — ЗАЩИТИ СВОЙ ЗАПАС КОРМА</div></div>`;
const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#b1b899");
scene.fog = new THREE.Fog("#b1b899", 42, 115);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(
  72,
  innerWidth / innerHeight,
  0.08,
  180,
);
camera.rotation.order = "YXZ";
scene.add(camera);
scene.add(new THREE.HemisphereLight("#e7f0ce", "#655237", 2.6));
const sun = new THREE.DirectionalLight("#fff0c0", 3.2);
sun.position.set(22, 40, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -48,
  right: 48,
  top: 48,
  bottom: -48,
  near: 1,
  far: 110,
});
sun.shadow.bias = -0.001;
scene.add(sun);
const mat = (color, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const sand = mat("#bb9b62"),
  wood = mat("#ccaa6f"),
  steel = mat("#617163", 0.4, 0.65),
  dark = mat("#283c32"),
  cream = mat("#eddfbd"),
  orange = mat("#bd844d"),
  pink = mat("#d69b84"),
  black = mat("#171d17", 0.3),
  gold = mat("#b5a16b", 0.48, 0.5);
function mesh(geo, material, parent = scene, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(w, h, d, m, p = scene, x = 0, y = 0, z = 0) {
  return mesh(new THREE.BoxGeometry(w, h, d), m, p, x, y, z);
}
function ball(x, y, z, sx, sy, sz, m, p) {
  const b = mesh(new THREE.SphereGeometry(1, 16, 12), m, p, x, y, z);
  b.scale.set(sx, sy, sz);
  return b;
}
function cylinder(r1, r2, h, m, p = scene, x = 0, y = 0, z = 0) {
  return mesh(new THREE.CylinderGeometry(r1, r2, h, 24), m, p, x, y, z);
}
box(91, 1, 91, sand, scene, 0, -0.55, 0);
// Instanced wood shavings make the huge cage floor tactile without thousands of draw calls.
let seed = 42;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const chips = new THREE.InstancedMesh(
  new THREE.BoxGeometry(1, 0.12, 0.45),
  wood,
  4300,
);
const dummy = new THREE.Object3D();
for (let i = 0; i < 4300; i++) {
  dummy.position.set(
    (random() - 0.5) * 88,
    0.02 + random() * 0.12,
    (random() - 0.5) * 88,
  );
  dummy.rotation.set(random() * 0.3, random() * Math.PI, random() * 0.3);
  dummy.scale.set(0.3 + random() * 1.3, 0.5 + random(), 0.4 + random());
  dummy.updateMatrix();
  chips.setMatrixAt(i, dummy.matrix);
  chips.setColorAt(
    i,
    new THREE.Color().setHSL(
      0.105 + random() * 0.03,
      0.28 + random() * 0.18,
      0.48 + random() * 0.22,
    ),
  );
}
chips.receiveShadow = true;
scene.add(chips);
for (const z of [-45, 45]) {
  box(92, 2, 1.4, dark, scene, 0, 0.5, z);
  for (let x = -45; x <= 45; x += 3)
    cylinder(0.085, 0.085, 19, steel, scene, x, 10, z);
  for (const y of [3, 10, 19]) box(91, 0.14, 0.14, steel, scene, 0, y, z);
}
for (const x of [-45, 45]) {
  box(1.4, 2, 92, dark, scene, x, 0.5, 0);
  for (let z = -45; z <= 45; z += 3)
    cylinder(0.085, 0.085, 19, steel, scene, x, 10, z);
  for (const y of [3, 10, 19]) box(0.14, 0.14, 91, steel, scene, x, y, 0);
}
for (let x = -45; x <= 45; x += 6) box(0.09, 0.09, 90, steel, scene, x, 19, 0);
const obstacles = [];
const cover = [];
function obstacle(x, z, r, obj) {
  obstacles.push({ x, z, r });
  if (obj) cover.push(obj);
}
function hamster(material = orange, statue = false) {
  const g = new THREE.Group();
  ball(0, 1.05, 0, 0.83, 1, 0.65, material, g);
  ball(0, 1.2, 0.5, 0.65, 0.76, 0.24, statue ? material : cream, g);
  ball(0, 2.05, 0.08, 0.88, 0.76, 0.72, material, g);
  for (const x of [-0.59, 0.59]) {
    ball(x, 2.67, 0.05, 0.3, 0.36, 0.2, material, g);
    ball(x, 2.69, 0.2, 0.18, 0.23, 0.06, statue ? material : pink, g);
    ball(x * 0.64, 2.22, 0.68, 0.095, 0.12, 0.065, statue ? dark : black, g);
    ball(x * 0.8, 1.84, 0.64, 0.32, 0.28, 0.18, statue ? material : cream, g);
    ball(x * 0.8, 0.19, 0.29, 0.32, 0.21, 0.45, material, g);
    ball(x * 1.35, 1.03, 0.4, 0.24, 0.5, 0.23, material, g);
  }
  ball(0, 1.99, 0.82, 0.13, 0.1, 0.09, statue ? material : pink, g);
  return g;
}
const pedestal = cylinder(4.1, 4.8, 1.5, dark, scene, 0, 0.7, 0);
obstacle(0, 0, 4.8, pedestal);
cylinder(3.7, 4, 0.3, gold, scene, 0, 1.6, 0);
const statue = hamster(gold, true);
statue.scale.setScalar(3);
statue.position.y = 1.75;
scene.add(statue);
cover.push(statue);
const plaque = box(3, 0.7, 0.15, gold, scene, 0, 1, 4.12);
function label(text, w = 512, h = 128) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#213b2b";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e1e9b9";
  ctx.textAlign = "center";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(text, w / 2, h * 0.62);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture });
}
plaque.material = label("ВЕЛИКИЙ ХОМЯК");
for (const [x, z, r] of [
  [-12, 6, 2.5],
  [12, 10, 2.4],
  [-17, -15, 3],
  [19, -13, 2.5],
  [-29, 23, 3],
  [28, 26, 2.4],
  [-5, 29, 2.5],
]) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  for (let i = 0; i < 5; i++) {
    const block = box(
      r * 1.6,
      0.65,
      r * 1.2,
      wood,
      g,
      (random() - 0.5) * 0.7,
      0.45 + i * 0.57,
      (random() - 0.5) * 0.6,
    );
    block.rotation.y = (random() - 0.5) * 0.5;
  }
  obstacle(x, z, r, g);
}
// A giant food bowl, cardboard house and exercise wheel establish hamster scale.
const bowl = new THREE.Group();
bowl.position.set(29, 0, -28);
scene.add(bowl);
cylinder(5, 4, 1.7, mat("#718b78"), bowl, 0, 0.8, 0);
cylinder(4.5, 4.5, 0.12, mat("#53452e"), bowl, 0, 1.69, 0);
for (let i = 0; i < 65; i++) {
  const a = random() * Math.PI * 2,
    r = Math.sqrt(random()) * 4;
  ball(
    Math.cos(a) * r,
    1.8 + random() * 0.3,
    Math.sin(a) * r,
    0.3,
    0.15,
    0.2,
    wood,
    bowl,
  );
}
obstacle(29, -28, 5, bowl);
const house = new THREE.Group();
house.position.set(-30, 0, -27);
scene.add(house);
box(10, 7, 8, mat("#ad7751"), house, 0, 3.5, 0);
const roof = box(12, 0.7, 10, mat("#6f7c52"), house, 0, 7.4, 0);
roof.rotation.z = 0.12;
box(3.5, 4, 0.1, dark, house, 0, 2, 4.06);
obstacle(-30, -27, 6.5, house);
const wheel = new THREE.Group();
wheel.position.set(31, 6, 7);
wheel.rotation.y = -0.5;
scene.add(wheel);
const ring = mesh(new THREE.TorusGeometry(5.5, 0.24, 12, 64), steel, wheel);
for (let i = 0; i < 12; i++) {
  const bar = box(0.12, 11, 0.15, steel, wheel);
  bar.rotation.z = (i * Math.PI) / 6;
}
box(1, 7, 3, dark, scene, 31, 3, 7);
obstacle(31, 7, 6, wheel);
// The player's paws and food bag are attached to the first-person camera.
const weapon = new THREE.Group();
camera.add(weapon);
weapon.position.set(0.43, -0.35, -0.85);
weapon.scale.setScalar(0.65);
weapon.rotation.set(0.05, -0.17, -0.12);
box(0.53, 0.72, 0.26, mat("#85984c"), weapon, 0, 0, 0);
box(0.57, 0.08, 0.29, cream, weapon, 0, 0.36, 0);
const front = box(
  0.42,
  0.43,
  0.01,
  label("КОРМ", 256, 256),
  weapon,
  0,
  0.02,
  0.137,
);
ball(0, -0.02, 0.16, 0.1, 0.13, 0.025, gold, weapon);
for (const x of [-0.32, 0.32])
  ball(x, -0.21, 0.08, 0.15, 0.19, 0.21, orange, weapon);
weapon.visible = false;
let hp = 100,
  ammo = 24,
  reloading = 0,
  active = false,
  finished = false,
  yaw = 0,
  pitch = 0,
  lastShot = 0,
  elapsed = 0,
  shotCount = 0;
const player = new THREE.Vector3(0, 1.8, 24);
const keys = new Set();
let firing = false;
let bots = [],
  bullets = [],
  particles = [];
const ray = new THREE.Raycaster();
const clock = new THREE.Clock();
function makeBots() {
  for (const b of bots) scene.remove(b.group);
  bots = [];
  const starts = [
    [-18, -7],
    [18, -5],
    [-23, 16],
    [23, 20],
    [-8, -28],
    [10, -30],
  ];
  starts.forEach(([x, z], i) => {
    const group = hamster(i % 2 ? mat("#8f9991") : mat("#9b785b"));
    group.position.set(x, 0, z);
    scene.add(group);
    const visor = box(1.35, 0.22, 0.16, mat("#744734"), group, 0, 2.32, 0.7);
    const gun = box(0.25, 0.3, 0.9, dark, group, 0.72, 1.2, 0.9);
    const bar = box(1.6, 0.1, 0.05, mat("#c2ee83"), group, 0, 3.25, 0);
    bots.push({ group, hp: 100, bar, cooldown: 1 + i * 0.3, phase: i });
  });
}
function hud() {
  $("hp").textContent = hp;
  $("hpbar").style.width = hp + "%";
  $("ammo").textContent = reloading ? "…" : ammo;
  $("enemies").textContent = bots.filter((b) => b.hp > 0).length;
}
function reset() {
  hp = MAX_HP;
  ammo = 24;
  reloading = 0;
  player.set(0, 1.8, 24);
  yaw = 0;
  pitch = 0;
  elapsed = 0;
  lastShot = -1;
  finished = false;
  shotCount = 0;
  for (const b of bullets) scene.remove(b.mesh);
  bullets = [];
  makeBots();
  hud();
}
function showOverlay(title, description, button) {
  $("title").innerHTML = title;
  $("description").textContent = description;
  $("play").innerHTML = button + " <span>↗</span>";
  $("overlay").classList.remove("hidden");
  $("hud").classList.add("dim");
  weapon.visible = false;
}
function end(won) {
  finished = true;
  active = false;
  document.exitPointerLock();
  showOverlay(
    won ? "Клетка<br><em>твоя.</em>" : "Хомяк<br><em>устал.</em>",
    won
      ? "Все 6 ботов побеждены. Статуя великого хомяка гордится тобой. Запасы корма снова в безопасности."
      : "Боты оказались проворнее. Используй укрытия, двигайся и не забывай досыпать корм.",
    "ЕЩЁ ОДИН РАУНД",
  );
}
$("play").addEventListener("click", async () => {
  if (finished) reset();
  try {
    await renderer.domElement.requestPointerLock();
  } catch {
    $("description").textContent =
      "Нажми ещё раз для захвата мыши. Игра требует браузер с поддержкой управления мышью.";
  }
});
document.addEventListener("pointerlockchange", () => {
  active = document.pointerLockElement === renderer.domElement;
  keys.clear();
  firing = false;
  if (active) {
    $("overlay").classList.add("hidden");
    $("hud").classList.remove("dim");
    weapon.visible = true;
  } else if (!finished) {
    showOverlay(
      "Время<br><em>перекуса.</em>",
      "Игра на паузе. Хомяк и боты ждут твоего возвращения.",
      "ПРОДОЛЖИТЬ",
    );
  }
});
document.addEventListener("mousemove", (e) => {
  if (active) {
    yaw -= e.movementX * 0.002;
    pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.002, -1.35, 1.35);
  }
});
document.addEventListener("keydown", (e) => {
  if (
    ["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "KeyR"].includes(
      e.code,
    )
  )
    e.preventDefault();
  keys.add(e.code);
  if (e.code === "KeyR" && active && ammo < 24 && !reloading) {
    reloading = 1.3;
    hud();
  }
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
document.addEventListener("mousedown", (e) => {
  if (e.button === 0 && active) firing = true;
});
document.addEventListener("mouseup", () => (firing = false));
window.addEventListener("blur", () => {
  keys.clear();
  firing = false;
  if (active) document.exitPointerLock();
});
function burst(pos, color) {
  for (let i = 0; i < 7; i++) {
    const m = ball(pos.x, pos.y, pos.z, 0.07, 0.07, 0.07, mat(color), scene);
    particles.push({
      mesh: m,
      v: new THREE.Vector3(
        (random() - 0.5) * 4,
        random() * 4,
        (random() - 0.5) * 4,
      ),
      life: 0.4,
    });
  }
}
function shoot() {
  if (elapsed - lastShot < 0.18 || reloading || ammo <= 0) return;
  lastShot = elapsed;
  ammo--;
  shotCount++;
  weapon.position.z = -0.7;
  ray.setFromCamera(new THREE.Vector2(), camera);
  const targets = bots.filter((b) => b.hp > 0);
  const hits = ray.intersectObjects(
    [...cover, ...targets.map((b) => b.group)],
    true,
  );
  if (hits.length) {
    const hit = hits[0];
    const bot = targets.find((b) => {
      let obj = hit.object;
      while (obj) {
        if (obj === b.group) return true;
        obj = obj.parent;
      }
      return false;
    });
    burst(hit.point, bot ? "#ffe19b" : "#bca170");
    if (bot) {
      bot.hp = applyDamage(bot.hp, PLAYER_DAMAGE);
      bot.bar.scale.x = bot.hp / 100;
      $("crosshair").classList.add("hit");
      setTimeout(() => $("crosshair").classList.remove("hit"), 110);
      if (bot.hp === 0) {
        scene.remove(bot.group);
        if (bots.every((b) => b.hp === 0)) end(true);
      }
    }
  }
  const p = camera.position
    .clone()
    .add(ray.ray.direction.clone().multiplyScalar(0.8));
  const tracer = ball(p.x, p.y, p.z, 0.055, 0.055, 0.14, gold, scene);
  particles.push({
    mesh: tracer,
    v: ray.ray.direction.clone().multiplyScalar(60),
    life: 0.15,
  });
  hud();
}
function move(pos, dx, dz, r) {
  if (canOccupy(pos.x + dx, pos.z, obstacles, r)) pos.x += dx;
  if (canOccupy(pos.x, pos.z + dz, obstacles, r)) pos.z += dz;
}
function update(dt) {
  elapsed += dt;
  if (reloading) {
    reloading = Math.max(0, reloading - dt);
    if (!reloading) {
      ammo = 24;
      hud();
    }
  }
  let sx = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
    sz = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0);
  const len = Math.hypot(sx, sz) || 1,
    speed = keys.has("ShiftLeft") ? 10 : 6;
  move(
    player,
    ((sx * Math.cos(yaw) + sz * Math.sin(yaw)) / len) * speed * dt,
    ((-sx * Math.sin(yaw) + sz * Math.cos(yaw)) / len) * speed * dt,
    0.48,
  );
  camera.position.copy(player);
  camera.position.y += sx || sz ? Math.sin(elapsed * 11) * 0.045 : 0;
  camera.rotation.set(pitch, yaw, 0);
  weapon.position.z = THREE.MathUtils.lerp(weapon.position.z, -0.85, dt * 12);
  weapon.rotation.z = -0.12 + (reloading ? Math.sin(reloading * 5) * 0.45 : 0);
  if (firing) shoot();
  $("notice").textContent = reloading
    ? "ДОСЫПАЕМ КОРМ…"
    : ammo === 0
      ? "ПАКЕТИК ПУСТ — НАЖМИ R"
      : "";
  for (const b of bots) {
    if (b.hp <= 0) continue;
    const pos = b.group.position;
    const dir = new THREE.Vector3(player.x - pos.x, 0, player.z - pos.z);
    const distance = dir.length();
    dir.normalize();
    b.group.rotation.y = Math.atan2(dir.x, dir.z);
    if (distance > 8) {
      const old = pos.clone();
      move(pos, dir.x * 2.7 * dt, dir.z * 2.7 * dt, 0.85);
      if (pos.distanceToSquared(old) < 0.00001)
        move(pos, -dir.z * 3 * dt, dir.x * 3 * dt, 0.85);
    }
    b.group.position.y = Math.sin(elapsed * 7 + b.phase) * 0.04;
    b.cooldown -= dt;
    if (b.cooldown <= 0 && distance < 42) {
      b.cooldown = 1.5 + random() * 0.7;
      const origin = pos.clone().add(new THREE.Vector3(0, 1.4, 0));
      const direction = player.clone().sub(origin).normalize();
      ray.set(origin, direction);
      const block = ray.intersectObjects(cover, true)[0];
      if (!block || block.distance > distance) {
        const m = ball(
          origin.x,
          origin.y,
          origin.z,
          0.13,
          0.13,
          0.13,
          mat("#f39655"),
          scene,
        );
        bullets.push({ mesh: m, v: direction.multiplyScalar(16), life: 4 });
      }
    }
  }
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const step = b.v.clone().multiplyScalar(dt);
    ray.set(b.mesh.position, step.clone().normalize());
    const blocked = ray
      .intersectObjects(cover, true)
      .some((h) => h.distance <= step.length());
    b.mesh.position.add(step);
    b.life -= dt;
    let remove = blocked || b.life < 0;
    if (b.mesh.position.distanceTo(camera.position) < 0.65) {
      hp = applyDamage(hp, BOT_DAMAGE);
      $("damage").style.opacity = 0.7;
      setTimeout(() => ($("damage").style.opacity = 0), 160);
      hud();
      remove = true;
      if (!hp) end(false);
    }
    if (remove) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
    }
  }
}
reset();
camera.position.set(19, 12, 27);
camera.lookAt(0, 4, 0);
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.04);
  if (active) update(dt);
  else if (!finished && elapsed === 0) {
    const t = performance.now() * 0.000025;
    camera.position.set(Math.sin(t) * 31, 12, Math.cos(t) * 31);
    camera.lookAt(0, 4, 0);
  }
  if (active)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.v, dt);
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        particles.splice(i, 1);
      }
    }
  renderer.render(scene, camera);
}
frame();
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
// Read-only state is useful for smoke checks and bug reports.
window.gameState = () => ({
  hp,
  ammo,
  active,
  finished,
  alive: bots.filter((b) => b.hp > 0).length,
  botHp: bots.map((b) => b.hp),
  position: player.toArray(),
  shots: shotCount,
});
