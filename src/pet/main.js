import "./style.css";
import {
  createPet,
  cageItems,
  moveCageItem,
  setSupply,
  setWaterSupply,
  UPPER_FLOOR,
  updatePet,
  ACTIVITIES,
  holdPet,
  moveHeldPet,
  releasePet,
  memoryPlaces,
  editMemory,
  forgetMemory,
} from "./life.js";
document.querySelector("#app").innerHTML = `
<main class="shell"><header><div class="brand"><div class="logo">🐹</div><div><h1>Хома дома</h1><div class="tag">МАЛЕНЬКАЯ ЖИЗНЬ РЯДОМ</div></div></div><div class="header-actions"><button class="quiet" id="open-memory">Память</button><button class="quiet" id="pause">Ⅱ Пауза</button></div></header>
<section class="intro"><div><div class="eyebrow">ЗНАКОМЬСЯ, ЭТО ХОМА</div><h2>У него свои маленькие дела.</h2><p>Он сам выбирает, куда пойти. Хома сам поднимается на второй этаж по лесенке. Возьми Хому мышью или пальцем и перенеси внутри клетки.</p></div><div class="live"><span class="dot"></span><span id="live">Жизнь идёт</span></div></section>
<div class="habitat"><canvas id="cage" width="900" height="690" role="img" aria-label="Двумерная клетка: Хома самостоятельно гуляет, ест, пьёт, бегает в колесе и отдыхает."></canvas><div class="paused" id="overlay" hidden><span>Тихая пауза ☁</span></div></div>
<section class="water-controls" aria-label="Запасы воды"><strong id="bottle-stock" aria-live="polite">В поилке: 70 / 70</strong><button class="quiet" id="refill-water">Пополнить воду</button><button class="quiet" id="empty-water">Опустошить поилку</button></section><details id="cage-editor"><summary>⚒ Изменить клетку</summary><p>Выбери предмет и нажми в клетке, чтобы переставить его. Или выбери этаж и положение ниже. Пока редактируешь, Хома отдыхает.</p><div class="editor-fields"><label>Предмет<select id="cage-item"></select></label><label>Этаж<select id="cage-floor"><option value="0">Первый</option><option value="1">Второй</option></select></label><label>Положение<input id="cage-x" type="range" min="150" max="780" value="300"></label></div><div class="water-controls"><button id="supply-fill" class="quiet">Пополнить запас</button><button id="supply-empty" class="quiet">Опустошить запас</button><button id="empty-all" class="quiet">Опустошить все запасы</button></div><p id="supply-status" role="status"></p><small>Капли и ростки постепенно восстанавливаются. Расстановка действует до перезагрузки страницы.</small></details><section class="needs"><div><label for="food">Сытость <b id="food-number">75%</b></label><progress id="food" max="100" value="75"></progress></div><div><label for="water">Запас воды <b id="water-number">75%</b></label><progress id="water" max="100" value="75"></progress></div></section><section class="cards"><div class="card"><span class="label">Сейчас у Хомы</span><strong class="value status" id="activity">Гуляет по клетке</strong><small id="thought">Столько всего интересного!</small></div><div class="card"><span class="label">Память Хомы</span><strong class="value" id="memory">Изучает клетку</strong><small id="stocks">Корм: 60 · вода: 70</small></div><div class="card"><span class="label">Время вместе</span><strong class="value time" id="time">00:00</strong><small>Никуда не спешим</small></div></section>
<footer><span>При переносе Хома помнит своё намерение. Если припасы кончатся, он ищет крошки, ростки и капли воды. При сытости ниже 18% зарывается за червячками.</span><a href="./index.html">Другие игры ↗</a></footer></main>
<dialog id="memory-menu" aria-labelledby="memory-title"><div class="memory-heading"><h2 id="memory-title">Память Хомы</h2><button id="close-memory" aria-label="Закрыть меню памяти">×</button></div>
<p>Хома сам исследует клетку и записывает наблюдения. Здесь ты можешь исправить его записи или добавить подсказку. Подсказки могут быть ложными: Хома поверит им, но после проверки исправит запись. Реальные запасы от подсказок не меняются.</p>
<form id="memory-form">
<label>Что искать<select id="memory-kind"><option value="food">Еду</option><option value="water">Воду</option></select></label>
<label>Место<select id="memory-place"></select></label>
<label id="position-label" hidden>Место в клетке: <output id="position-number">450</output><input id="memory-x" type="range" min="80" max="820" value="450"/><span class="map-ends">← Домик <span>Поилка →</span></span></label>
<label>Что Хома будет помнить<select id="memory-belief"><option value="yes">Здесь есть припасы</option><option value="no">Здесь ничего нет</option></select></label>
<p id="memory-truth" role="status"></p><button class="quiet" type="submit">Записать воспоминание</button></form>
<div class="memory-heading"><h3>Воспоминания</h3><button id="forget-all" class="quiet">Удалить все</button></div><div id="memory-list"></div><p>Пока меню открыто, жизнь на паузе. Память действует до перезагрузки страницы.</p></dialog>`;
const canvas = document.querySelector("#cage"),
  ctx = canvas.getContext("2d"),
  pet = createPet();
let paused = false,
  previous = performance.now(),
  lastActivity = "",
  hudTime = 0;
function setPause(value) {
  if (value) endDrag();
  paused = value;
  document.querySelector("#pause").textContent = paused
    ? "▶ Продолжить"
    : "Ⅱ Пауза";
  document.querySelector("#pause").setAttribute("aria-pressed", String(paused));
  document.querySelector("#overlay").hidden =
    !paused || document.querySelector("#cage-editor").open;
  document.querySelector("#live").textContent = paused
    ? "На паузе"
    : "Жизнь идёт";
}
document.querySelector("#pause").onclick = () => {
  if (!document.querySelector("#cage-editor").open) setPause(!paused);
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) setPause(true);
});
function waterControls() {
  document.querySelector("#stocks").textContent =
    "Корм: " +
    Math.ceil(pet.supplies.food) +
    " · вода: " +
    Math.ceil(pet.supplies.water);

  document.querySelector("#bottle-stock").textContent =
    "В поилке: " + Math.ceil(pet.supplies.water) + " / 70";
}
for (const [id, full] of [
  ["refill-water", true],
  ["empty-water", false],
]) {
  document.querySelector("#" + id).onclick = () => {
    setWaterSupply(pet, full);
    waterControls();
    draw();
  };
}
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = 900 * dpr;
  canvas.height = 690 * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener("resize", resize);
function ellipse(x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}
function round(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}
function line(x1, y1, x2, y2, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
let seed = 771;
const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const bedding = Array.from({ length: 620 }, () => ({
  x: 52 + random() * 796,
  y: 366 + random() * 89,
  a: random() * Math.PI,
  l: 3 + random() * 10,
  c: random(),
}));
const grain = Array.from({ length: 22 }, () => ({
  x: 620 + random() * 42,
  y: 373 + random() * 12,
  c: random(),
}));
function backdrop() {
  const bg = ctx.createLinearGradient(0, 0, 0, 510);
  bg.addColorStop(0, "#e1e5d8");
  bg.addColorStop(1, "#f2e7d3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 510);
  // Window, warm afternoon light and a houseplant beyond the cage.
  round(53, 28, 158, 181, 9, "#d4d9cb");
  round(61, 35, 142, 165, 5, "#f9f4e5");
  round(69, 43, 126, 149, 3, "#d1e3db");
  ellipse(150, 84, 22, 22, "#f5e8b9");
  line(133, 43, 133, 192, "#fff9eb", 6);
  line(69, 118, 195, 118, "#fff9eb", 6);
  round(49, 198, 166, 9, 3, "#fbf5e6");
  ctx.fillStyle = "#fff2c631";
  ctx.beginPath();
  ctx.moveTo(70, 200);
  ctx.lineTo(203, 200);
  ctx.lineTo(540, 480);
  ctx.lineTo(150, 480);
  ctx.fill();
  round(793, 145, 42, 54, 8, "#b99a7b");
  for (let i = 0; i < 7; i++) {
    const x = 810 + Math.sin(i * 2) * 26,
      y = 85 + i * 8;
    line(815, 151, x, y, "#859574", 3);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(i * 0.7);
    ellipse(0, 0, 10, 24, i % 2 ? "#93a382" : "#a5b292");
    ctx.restore();
  }
  round(0, 468, 900, 42, 0, "#c7ac86");
  line(0, 475, 900, 475, "#e1c69d", 3);
  ellipse(450, 475, 395, 21, "#6c614321");
}
function house() {
  // Open-front wooden sleeping nook.
  round(92, 243, 177, 149, 8, "#b68b60");
  round(102, 251, 157, 135, 7, "#dab58a");
  for (let y = 265; y < 386; y += 24) line(103, y, 258, y, "#bd966d66", 1);
  ctx.beginPath();
  ctx.moveTo(80, 253);
  ctx.lineTo(181, 174);
  ctx.lineTo(281, 253);
  ctx.closePath();
  ctx.fillStyle = "#6d8f88";
  ctx.fill();
  line(84, 251, 181, 178, "#8aa69a", 7);
  line(181, 178, 279, 251, "#52786f", 6);
  ctx.beginPath();
  ctx.moveTo(148, 389);
  ctx.lineTo(148, 319);
  ctx.arc(185, 319, 37, Math.PI, 0);
  ctx.lineTo(222, 389);
  ctx.closePath();
  ctx.fillStyle = "#735a46";
  ctx.fill();
  ellipse(185, 384, 34, 8, "#b9a27b");
  ellipse(181, 244, 14, 14, "#e5cfaa");
  ellipse(181, 244, 9, 9, "#9ba58c");
}
function wheel() {
  line(420, 335, 394, 401, "#80968b", 12);
  line(420, 335, 446, 401, "#80968b", 12);
  round(375, 397, 90, 10, 5, "#6c897e");
  ellipse(420, 300, 81, 90, "#b4c1a4");
  ellipse(420, 300, 69, 78, "#e7ddc4");
  ctx.save();
  ctx.translate(420, 300);
  ctx.rotate(pet.activity === "wheel" ? pet.age * 2.7 : 0);
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI * 2) / 18;
    line(
      Math.cos(a) * 61,
      Math.sin(a) * 70,
      Math.cos(a) * 70,
      Math.sin(a) * 78,
      "#aab99b",
      3,
    );
  }
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    line(0, 0, Math.cos(a) * 62, Math.sin(a) * 70, "#c7cbb4", 5);
  }
  ctx.restore();
  ellipse(420, 300, 9, 9, "#88a18b");
  ellipse(418, 298, 3, 3, "#dce4cc");
}
function bowls() {
  propStart("eat", 640);
  ellipse(642, 401, 43, 9, "#6c61431a");
  round(603, 376, 77, 23, 10, "#b88265");
  ellipse(642, 377, 39, 12, "#e5b591");
  ellipse(642, 377, 32, 8, "#93704b");
  for (const g of grain.slice(0, Math.ceil((22 * pet.supplies.food) / 60)))
    ellipse(g.x, g.y, 3.5, 2, g.c > 0.5 ? "#e5c68b" : "#ba984f");
  ctx.restore();
  propStart("drink", 787);
  // Glass water bottle with a metal drinking spout.
  round(741, 176, 40, 109, 17, "#b7cdd0");
  round(746, 190, 30, 88, 12, "#d7e9e1");
  round(
    746,
    278 - (62 * pet.supplies.water) / 70,
    30,
    (62 * pet.supplies.water) / 70,
    3,
    "#9fc8ca",
  );
  round(748, 194, 6, 67, 3, "#f4ffed99");
  round(741, 171, 40, 14, 4, "#8a9f94");
  line(762, 285, 762, 356, "#8a9894", 6);
  line(762, 356, 750, 367, "#8a9894", 6);
  ellipse(748, 369, 4, 4, "#b9cbc6");
  for (const y of [196, 257]) line(736, y, 788, y, "#a8b8aa", 4);
  ctx.restore();
}
function hamster(x, y, facing = pet.facing) {
  const activity = pet.activity,
    sleep = activity === "sleep",
    moving = activity === "walk" || activity === "wheel";
  const phase = pet.age * (moving ? 13 : 2),
    bob = moving ? Math.sin(phase) * 1.8 : Math.sin(phase) * 0.6;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(facing, 1);
  ellipse(-3, 3, 32, 5, "#69553d20");
  if (sleep) {
    ellipse(-2, -15, 26, 19, "#b9956c");
    ellipse(12, -15, 16, 14, "#d3ae7d");
    ellipse(16, -27, 7, 8, "#c19772");
    line(15, -16, 21, -15, "#68513c", 1.5);
  } else {
    ellipse(-27, -13, 6, 5, "#ccaaa0");
    for (const side of [-1, 1]) {
      const step = moving ? Math.sin(phase + side * Math.PI) * 3 : 0;
      ellipse(side * 14, step, 8, 4, "#c79c80");
    }
    const fur = ctx.createRadialGradient(4, -28, 2, -8, -15, 35);
    fur.addColorStop(0, "#e2bc85");
    fur.addColorStop(1, "#b98757");
    ellipse(-6, -22, 26, 24, fur);
    ellipse(11, -15, 17, 16, "#efdab5");
    ellipse(15, -33, 20, 19, fur);
    ellipse(5, -49, 9, 11, "#bb8d66");
    ellipse(5, -49, 5, 7, "#d9aea0");
    ellipse(27, -45, 7, 9, "#be926c");
    ellipse(27, -45, 4, 6, "#e1b7a7");
    ellipse(27, -26, 13, 10, "#f0dfc1");
    ellipse(39, -29, 3.5, 2.5, "#b9837c");
    if (activity === "groom") {
      line(20, -36, 24, -36, "#514a3c", 2);
      ellipse(28, -27 + Math.sin(pet.age * 13) * 3, 5, 4, "#c99e81");
    } else {
      ellipse(23, -37, 3, 3.7, "#423f33");
      ellipse(24, -38, 1, 1.3, "#fff9e5");
    }
    for (let i = -1; i <= 1; i++)
      line(32, -25, 46, -25 + i * 4, "#92775d", 0.7);
    if (activity === "eat") {
      ellipse(30, -19, 5, 3, "#c79c80");
      ellipse(33, -20, 2, 3, "#cfad6d");
    }
    // Delicate coat strokes give the tiny silhouette texture.
    for (let i = 0; i < 9; i++)
      line(
        -24 + i * 3,
        -30 + (i % 3) * 3,
        -22 + i * 3,
        -26 + (i % 3) * 3,
        "#f5d3a055",
        0.7,
      );
  }
  ctx.restore();
  if (sleep) {
    ctx.fillStyle = "#9aa789";
    ctx.font = "16px Georgia";
    ctx.fillText("z", x + 29, y - 38 - Math.sin(pet.age) * 3);
    ctx.font = "12px Georgia";
    ctx.fillText("z", x + 39, y - 54 - Math.sin(pet.age + 1) * 3);
  }
}
function propStart(id, originalX) {
  const item = pet.furniture[id],
    scale = item.y === UPPER_FLOOR.y ? 0.55 : 1;
  ctx.save();
  ctx.translate(item.x, item.y - 180);
  ctx.scale(scale, scale);
  ctx.translate(-originalX, -398);
}
function draw() {
  ctx.clearRect(0, 0, 900, 690);
  ctx.fillStyle = "#ede7d9";
  ctx.fillRect(0, 0, 900, 690);
  ctx.save();
  ctx.translate(0, 180);
  backdrop();
  round(35, -83, 830, 542, 23, "#c0cbb926");
  round(45, -73, 810, 515, 15, "#f6f3df38");
  // Rear cage wires are deliberately faint, so the hamster stays easy to see.
  for (let x = 65; x < 850; x += 37) line(x, -69, x, 384, "#879d8a30", 2);
  line(48, 144, 852, 144, "#9aac952e", 2);
  round(48, 366, 804, 85, 5, "#d9be8e");
  for (const b of bedding) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a);
    round(0, 0, b.l, 2, 1, b.c > 0.5 ? "#ecd5a6" : "#bd9c6b66");
    ctx.restore();
  }
  // An accessible wooden mezzanine and its sloped, grippy ladder.
  round(80, UPPER_FLOOR.y - 180, 480, 11, 4, "#b68b60");
  round(80, UPPER_FLOOR.y - 180, 480, 3, 2, "#efd3a2");
  line(560, UPPER_FLOOR.y - 175, 720, 403, "#bd966d", 18);
  for (let i = 0; i <= 14; i++) {
    const x = 560 + (160 * i) / 14,
      y = UPPER_FLOOR.y - 175 + ((578 - UPPER_FLOOR.y) * i) / 14;
    line(x - 7, y + 4, x + 7, y - 4, "#ecd5a6", 4);
  }
  for (const site of pet.sites) {
    const ground = (site.y ?? 578) - 180;
    if (site.kind === "food" && site.id === "sprouts") {
      for (let i = 0; i < 5; i++) {
        const h = 4 + (site.stock / site.capacity) * 16;
        line(
          site.x - 16 + i * 8,
          ground - 2,
          site.x - 17 + i * 8,
          ground - 2 - h,
          "#85986b",
          2,
        );
        ellipse(site.x - 14 + i * 8, ground - 2 - h, 4, 2, "#a5b97d");
      }
    } else if (site.stock > 1) {
      for (let i = 0; i < Math.min(5, Math.ceil(site.stock / 4)); i++)
        ellipse(
          site.x - 12 + i * 6,
          ground + 3 + (i % 2) * 3,
          site.kind === "water" ? 2 : 3,
          2,
          site.kind === "water" ? "#9abfc4" : "#d8ad66",
        );
    }
  }
  propStart("sleep", 185);
  house();
  ctx.restore();
  propStart("wheel", 420);
  wheel();
  ctx.restore();
  bowls();
  const h = petPosition();
  if (pet.activity === "dig") {
    ellipse(pet.x, 409, 24, 8, "#735a46");
    round(pet.x - 38, 407, 76, 37, 16, "#91734f");
    line(
      pet.x + 18,
      432,
      pet.x + 28,
      427 + Math.sin(pet.age * 8) * 3,
      "#e7b399",
      4,
    );
  }
  hamster(h.x, h.y - 180, pet.activity === "drink" ? -1 : pet.facing);
  if (document.querySelector("#cage-editor").open) {
    const selected = cageItems(pet).find(
      (i) => i.id === document.querySelector("#cage-item").value,
    );
    if (selected) {
      ctx.strokeStyle = "#b77b47";
      ctx.lineWidth = 3;
      ctx.strokeRect(selected.x - 35, (selected.y ?? 578) - 235, 70, 60);
    }
  }
  // Transparent front and rounded enamel base.
  const pane = ctx.createLinearGradient(0, 405, 0, 448);
  pane.addColorStop(0, "#e6f0da09");
  pane.addColorStop(1, "#d9e6cb44");
  round(44, 405, 812, 45, 4, pane);
  round(35, 438, 830, 31, 12, "#73928b");
  round(43, 439, 814, 7, 3, "#94afa1");
  for (const x of [35, 854]) {
    round(x, -80, 11, 526, 5, "#a4b5a0");
    round(x + 2, -75, 3, 501, 2, "#cad5ba");
  }
  round(35, -84, 830, 13, 6, "#8fa78f");
  round(48, -82, 803, 4, 2, "#c7d3b4");
  round(405, 446, 90, 15, 5, "#e6ddbc");
  ctx.fillStyle = "#637b6d";
  ctx.font = "bold 9px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ХОМА ДОМА", 450, 457);
  ctx.textAlign = "left";
  ctx.restore();
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  if (!paused) {
    updatePet(pet, dt);
    hudTime += dt;
    draw();
  }
  if (hudTime > 0.2 || lastActivity !== pet.activity) {
    hudTime = 0;
    waterControls();
    lastActivity = pet.activity;
    document.querySelector("#activity").textContent = ACTIVITIES[pet.activity];
    document.querySelector("#thought").textContent = pet.reason;
    document.querySelector("#memory").textContent = Object.keys(pet.memory)
      .length
      ? "Записей: " + Object.keys(pet.memory).length
      : "Изучает клетку";
    for (const [key, value] of [
      ["food", pet.food],
      ["water", pet.water],
    ]) {
      document.querySelector("#" + key).value = value;
      document.querySelector("#" + key).classList.toggle("low", value < 35);
      document.querySelector("#" + key + "-number").textContent =
        Math.round(value) + "%";
    }
    const seconds = Math.floor(pet.age);
    document.querySelector("#time").textContent =
      String(Math.floor(seconds / 60)).padStart(2, "0") +
      ":" +
      String(seconds % 60).padStart(2, "0");
  }
}
let drag = null;
function petPosition() {
  if (!pet.held && !pet.falling && pet.activity === "wheel")
    return {
      x: pet.furniture.wheel.x,
      y:
        pet.furniture.wheel.y -
        (pet.furniture.wheel.y === UPPER_FLOOR.y ? 17 : 31),
    };
  if (!pet.held && !pet.falling && pet.activity === "sleep")
    return { x: pet.furniture.sleep.x, y: pet.furniture.sleep.y - 16 };
  return { x: pet.x, y: pet.y };
}
function point(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * 900) / rect.width,
    y: ((e.clientY - rect.top) * 690) / rect.height,
  };
}
canvas.addEventListener("pointerdown", (e) => {
  if (document.querySelector("#cage-editor").open) {
    const pos = point(e);
    moveCageItem(
      pet,
      document.querySelector("#cage-item").value,
      pos.x,
      pos.y < 380,
    );
    syncEditor();
    draw();
    return;
  }
  if (paused || drag || e.button > 0) return;
  const p = point(e),
    h = petPosition();
  if (Math.abs(p.x - h.x) > 46 || p.y < h.y - 65 || p.y > h.y + 12) return;
  e.preventDefault();
  drag = { id: e.pointerId, dx: h.x - p.x, dy: h.y - p.y };
  holdPet(pet, h.x, h.y);
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    /* Pointer may already be cancelled by the browser. */
  }
  canvas.classList.add("holding");
  draw();
});
canvas.addEventListener("pointermove", (e) => {
  const p = point(e),
    h = petPosition();
  canvas.style.cursor = drag
    ? "grabbing"
    : Math.abs(p.x - h.x) < 46 && p.y > h.y - 65 && p.y < h.y + 12
      ? "grab"
      : "default";
  if (!drag || e.pointerId !== drag.id) return;
  moveHeldPet(pet, p.x + drag.dx, p.y + drag.dy);
  draw();
});
function endDrag(e) {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  const id = drag.id;
  drag = null;
  releasePet(pet);
  canvas.classList.remove("holding");
  if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  draw();
}
for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(name, endDrag);
window.addEventListener("blur", () => setPause(true));
const menu = document.querySelector("#memory-menu");
let memoryWasPaused = false;
const kindInput = document.querySelector("#memory-kind"),
  placeInput = document.querySelector("#memory-place"),
  beliefInput = document.querySelector("#memory-belief"),
  xInput = document.querySelector("#memory-x");
function selectedPlace() {
  const known = memoryPlaces(pet).find((s) => s.id === placeInput.value);
  if (known) return known;
  return (
    memoryPlaces(pet).find(
      (s) =>
        s.kind === kindInput.value && Math.abs(s.x - Number(xInput.value)) < 18,
    ) ?? { x: Number(xInput.value), stock: 0 }
  );
}
function previewMemory() {
  document.querySelector("#position-label").hidden = placeInput.value !== "new";
  document.querySelector("#position-number").textContent = xInput.value;
  const site = selectedPlace(),
    actual = site.stock >= 1,
    belief = beliefInput.value === "yes";
  document.querySelector("#memory-truth").textContent =
    (actual === belief ? "Правдивая" : "Ложная") +
    " подсказка сейчас: на этом месте " +
    (actual ? "есть припасы." : "припасов нет.");
}
function fillPlaces() {
  const previous = placeInput.value;
  placeInput.replaceChildren();
  for (const site of memoryPlaces(pet).filter(
    (s) => s.kind === kindInput.value,
  )) {
    const option = document.createElement("option");
    option.value = site.id;
    option.textContent = site.name;
    placeInput.append(option);
  }
  const option = document.createElement("option");
  option.value = "new";
  option.textContent = "Другое место в клетке";
  placeInput.append(option);
  if ([...placeInput.options].some((o) => o.value === previous))
    placeInput.value = previous;
  previewMemory();
}
function renderMemories() {
  const list = document.querySelector("#memory-list");
  list.replaceChildren();
  const entries = Object.entries(pet.memory);
  document.querySelector("#forget-all").disabled = !entries.length;
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.textContent =
      "Пока нет записей. Закрой меню: Хома сам изучит клетку и начнёт запоминать места.";
    list.append(empty);
  }
  for (const [id, m] of entries) {
    const site = memoryPlaces(pet).find((s) => s.id === id);
    if (!site) continue;
    const row = document.createElement("div");
    row.className = "memory-row";
    const description = document.createElement("div"),
      title = document.createElement("strong"),
      detail = document.createElement("small");
    const present = m.injected ? m.present : m.stock >= 1;
    title.textContent =
      site.name +
      " · " +
      (site.kind === "food" ? "еда" : "вода") +
      (present ? " есть" : " отсутствует");
    detail.textContent =
      (m.injected ? "Твоя подсказка" : "Сам узнал") +
      " · В клетке сейчас: " +
      (site.stock >= 1 ? "есть" : "нет");
    description.append(title, detail);
    const remove = document.createElement("button");
    remove.className = "quiet";
    remove.textContent = "Удалить";
    remove.setAttribute("aria-label", "Удалить воспоминание: " + site.name);
    remove.onclick = () => {
      forgetMemory(pet, id);
      renderMemories();
      fillPlaces();
      draw();
    };
    const edit = document.createElement("button");
    edit.className = "quiet";
    edit.textContent = "Изменить";
    edit.setAttribute("aria-label", "Изменить воспоминание: " + site.name);
    edit.onclick = () => {
      kindInput.value = site.kind;
      fillPlaces();
      placeInput.value = id;
      beliefInput.value = present ? "yes" : "no";
      previewMemory();
      document
        .querySelector("#memory-form")
        .scrollIntoView({ block: "nearest" });
      beliefInput.focus();
    };
    const actions = document.createElement("div");
    actions.className = "memory-actions";
    actions.append(edit, remove);
    row.append(description, actions);
    list.append(row);
  }
  document.querySelector("#memory").textContent = "Записей: " + entries.length;
}
document.querySelector("#open-memory").onclick = () => {
  memoryWasPaused = paused;
  setPause(true);
  fillPlaces();
  renderMemories();
  menu.showModal();
};
document.querySelector("#close-memory").onclick = () => menu.close();
menu.addEventListener("close", () => {
  if (!memoryWasPaused && !document.hidden) setPause(false);
});
kindInput.onchange = fillPlaces;
placeInput.onchange = previewMemory;
beliefInput.onchange = previewMemory;
xInput.oninput = previewMemory;
document.querySelector("#memory-form").onsubmit = (e) => {
  e.preventDefault();
  const id = editMemory(pet, {
    id: placeInput.value,
    kind: kindInput.value,
    x: placeInput.value === "new" ? Number(xInput.value) : undefined,
    present: beliefInput.value === "yes",
  });
  if (!id) {
    document.querySelector("#memory-truth").textContent =
      "Можно добавить до 24 своих мест. Удали ненужную запись.";
    return;
  }
  renderMemories();
  fillPlaces();
  draw();
};
document.querySelector("#forget-all").onclick = () => {
  for (const id of Object.keys(pet.memory)) forgetMemory(pet, id);
  renderMemories();
  fillPlaces();
  draw();
};
const editor = document.querySelector("#cage-editor"),
  itemInput = document.querySelector("#cage-item"),
  floorInput = document.querySelector("#cage-floor"),
  positionInput = document.querySelector("#cage-x");
let editorWasPaused = false;
for (const item of cageItems(pet)) {
  const option = document.createElement("option");
  option.value = item.id;
  option.textContent = item.name;
  itemInput.append(option);
}
function syncEditor() {
  const item = cageItems(pet).find((i) => i.id === itemInput.value);
  floorInput.value = item.y === UPPER_FLOOR.y ? "1" : "0";
  positionInput.min = floorInput.value === "1" ? 170 : 150;
  positionInput.max = floorInput.value === "1" ? 470 : 780;
  positionInput.value = item.x;
  const site = memoryPlaces(pet).find(
    (s) =>
      s.id === ({ eat: "main-food", drink: "main-water" }[item.id] ?? item.id),
  );
  for (const id of ["supply-fill", "supply-empty"])
    document.querySelector("#" + id).disabled = !site;
  document.querySelector("#supply-status").textContent = site
    ? "Запас: " + Math.ceil(site.stock) + " / " + site.capacity
    : "Этот предмет можно переставить.";
  waterControls();
}
editor.addEventListener("toggle", () => {
  document.querySelector("#pause").disabled = editor.open;
  if (editor.open) {
    editorWasPaused = paused;
    setPause(true);
    document.querySelector("#overlay").hidden = true;
    syncEditor();
  } else if (!editorWasPaused) setPause(false);
  else setPause(true);
  draw();
});
itemInput.onchange = () => {
  syncEditor();
  draw();
};
for (const input of [floorInput, positionInput])
  input.oninput = () => {
    moveCageItem(
      pet,
      itemInput.value,
      Number(positionInput.value),
      floorInput.value === "1",
    );
    syncEditor();
    draw();
  };
for (const [id, full] of [
  ["supply-fill", true],
  ["supply-empty", false],
]) {
  document.querySelector("#" + id).onclick = () => {
    setSupply(pet, itemInput.value, full);
    syncEditor();
    draw();
  };
}
document.querySelector("#empty-all").onclick = () => {
  for (const item of cageItems(pet)) setSupply(pet, item.id, false);
  syncEditor();
  draw();
};
resize();
requestAnimationFrame(frame);
window.petState = () => structuredClone({ ...pet, paused });
