export const ACTIVITIES = {
  walk: "Гуляет по клетке",
  sniff: "Нюхает опилки",
  groom: "Умывает мордочку",
  eat: "Хрустит кормом",
  drink: "Пьёт водичку",
  wheel: "Бежит в колесе",
  sleep: "Дремлет в домике",
  held: "У тебя в руках",
  fall: "Спускается на опилки",
};
const places = { eat: 640, drink: 787, wheel: 420, sleep: 185 };
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
export function createPet() {
  return {
    x: 300,
    y: 398,
    target: 520,
    facing: 1,
    activity: "walk",
    next: "sniff",
    timer: 0,
    age: 0,
    visits: 0,
    food: 75,
    water: 75,
    energy: 85,
    reason: "Хочу осмотреть клетку.",
    held: false,
    falling: false,
    velocity: 0,
    floor: 398,
  };
}
function choose(p, action, reason, random) {
  p.next = action;
  p.target = places[action] ?? 110 + random() * 680;
  p.activity = "walk";
  p.reason = reason;
}
export function holdPet(p, x, y) {
  p.held = true;
  p.falling = false;
  p.velocity = 0;
  p.activity = "held";
  p.reason = "Меня взяли! Куда отправимся?";
  moveHeldPet(p, x, y);
}
export function moveHeldPet(p, x, y) {
  p.x = clamp(x, 80, 820);
  p.y = clamp(y, 167, 430);
}
export function releasePet(p) {
  if (!p.held) return;
  p.held = false;
  p.floor = Math.max(398, p.y);
  p.falling = p.y < p.floor;
  p.velocity = 0;
  p.activity = p.falling ? "fall" : "sniff";
  p.timer = 1.2;
  p.reason = "О, новое место. Надо осмотреться.";
}
export function updatePet(p, dt, random = Math.random) {
  dt = clamp(dt, 0, 0.1);
  p.age += dt;
  p.food = clamp(p.food - dt * 0.36);
  p.water = clamp(p.water - dt * (p.activity === "wheel" ? 0.85 : 0.48));
  p.energy = clamp(
    p.energy +
      dt * (p.activity === "sleep" ? 7 : p.activity === "wheel" ? -3 : -0.16),
  );
  if (p.held) return p;
  if (p.falling) {
    p.velocity += dt * 460;
    p.y += p.velocity * dt;
    if (p.y >= p.floor) {
      p.y = p.floor;
      p.falling = false;
      p.activity = "sniff";
      p.timer = 1.2;
    }
    return p;
  }
  // Critical needs can interrupt any leisure activity, including a nap.
  const urgent =
    p.water < 40 && p.water <= p.food
      ? "drink"
      : p.food < 40
        ? "eat"
        : p.water < 40
          ? "drink"
          : null;
  // Finish a meal or drink rather than oscillating between two low needs.
  if (
    urgent &&
    p.activity !== "eat" &&
    p.activity !== "drink" &&
    !(p.activity === "walk" && p.next === urgent)
  )
    choose(
      p,
      urgent,
      urgent === "drink"
        ? "Хочу пить. Поилка у правой стенки."
        : "Проголодался! Пойду к миске.",
      random,
    );
  if (p.activity === "walk") {
    const d = p.target - p.x;
    p.facing = d < 0 ? -1 : 1;
    if (Math.abs(d) <= dt * 43) {
      p.x = p.target;
      p.y = 398;
      p.floor = 398;
      p.activity = p.next;
      p.timer = p.next === "sleep" ? 14 : 4 + random() * 5;
      p.visits++;
    } else p.x += Math.sign(d) * dt * 43;
  } else {
    p.timer -= dt;
    if (p.activity === "eat") {
      p.food = clamp(p.food + dt * 11);
      if (p.food < 95) return p;
    }
    if (p.activity === "drink") {
      p.water = clamp(p.water + dt * 16);
      if (p.water < 95) return p;
    }
    if (p.activity === "sleep" && p.energy < 90 && p.timer <= 0) return p;
    if (p.timer <= 0) {
      if (p.water < 65)
        choose(p, "drink", "Сначала попью, потом продолжу гулять.", random);
      else if (p.food < 65) choose(p, "eat", "Пора перекусить.", random);
      else if (p.energy < 35)
        choose(p, "sleep", "Устал. В домике уютно и тихо.", random);
      else {
        const options = ["sniff", "groom", "wheel", "sleep"].filter(
          (a) => a !== p.activity,
        );
        const next =
          options[
            Math.min(options.length - 1, Math.floor(random() * options.length))
          ];
        choose(
          p,
          next,
          {
            sniff: "Что здесь пахнет? Проверю.",
            groom: "Надо привести усы в порядок.",
            wheel: "Есть силы! Немного побегаю.",
            sleep: "Можно немного подремать.",
          }[next],
          random,
        );
      }
    }
  }
  return p;
}
