export const ACTIVITIES = {
  walk: "Гуляет по клетке",
  sniff: "Нюхает опилки",
  groom: "Умывает мордочку",
  eat: "Хрустит кормом",
  drink: "Пьёт водичку",
  wheel: "Бежит в колесе",
  sleep: "Дремлет в домике",
};
const places = { eat: 640, drink: 787, wheel: 420, sleep: 185 };
export function createPet() {
  return {
    x: 300,
    target: 520,
    facing: 1,
    activity: "walk",
    next: "sniff",
    timer: 0,
    age: 0,
    visits: 0,
  };
}
export function updatePet(p, dt, random = Math.random) {
  dt = Math.max(0, Math.min(dt, 0.1));
  p.age += dt;
  if (p.activity === "walk") {
    const distance = p.target - p.x;
    p.facing = distance < 0 ? -1 : 1;
    const step = dt * 43;
    if (Math.abs(distance) <= step) {
      p.x = p.target;
      p.activity = p.next;
      p.timer = p.next === "sleep" ? 14 : 4 + random() * 5;
      p.visits++;
    } else p.x += Math.sign(distance) * step;
  } else {
    p.timer -= dt;
    if (p.timer <= 0) {
      // Simple animation schedule, deliberately independent of future needs/AI.
      const choices = [
        "sniff",
        "groom",
        "eat",
        "drink",
        "wheel",
        "sleep",
      ].filter((a) => a !== p.activity);
      p.next =
        choices[
          Math.min(choices.length - 1, Math.floor(random() * choices.length))
        ];
      p.target = places[p.next] ?? 110 + random() * 680;
      p.activity = "walk";
    }
  }
  return p;
}
