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
  search: "Ищет припасы",
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
    goal: null,
    source: null,
    resume: null,
    supplies: { food: 60, water: 70 },
    memory: {},
    discoveries: 0,
    sites: [
      {
        id: "crumbs",
        kind: "food",
        name: "крошки в опилках",
        x: 120,
        stock: 18,
        capacity: 18,
        regen: 0,
      },
      {
        id: "sprouts",
        kind: "food",
        name: "свежие ростки",
        x: 300,
        stock: 28,
        capacity: 28,
        regen: 0.65,
      },
      {
        id: "drops",
        kind: "water",
        name: "капли у стенки",
        x: 550,
        stock: 25,
        capacity: 25,
        regen: 0.85,
      },
      {
        id: "dew",
        kind: "water",
        name: "роса на листочке",
        x: 820,
        stock: 12,
        capacity: 12,
        regen: 0.35,
      },
    ],
  };
}
function choose(p, action, reason, random) {
  p.goal = null;
  p.source = null;
  p.next = action;
  p.target = places[action] ?? 110 + random() * 680;
  p.activity = "walk";
  p.reason = reason;
}
function seek(p, goal) {
  p.goal = goal;
  const kind = goal === "eat" ? "food" : "water";
  if (p.supplies[kind] > 0.01) {
    p.source = "main";
    p.next = goal;
    p.target = places[goal];
    p.activity = "walk";
    p.reason =
      goal === "eat"
        ? "Проголодался! Пойду к миске."
        : "Хочу пить. Поилка у правой стенки.";
    return;
  }
  const candidates = p.sites.filter((s) => s.kind === kind);
  // Estimate replenishment from previous visits; actual stock is learned on arrival.
  const estimate = (s) => {
    const m = p.memory[s.id];
    if (!m) return 10;
    return Math.min(s.capacity, m.stock + (p.age - m.time) * s.regen);
  };
  candidates.sort((a, b) => {
    const score = (s) =>
      (estimate(s) >= 3 ? 1000 : 0) +
      (p.memory[s.id]?.finds ? 200 : 0) -
      Math.abs(p.x - s.x);
    return score(b) - score(a);
  });
  const site = candidates[0];
  if (estimate(site) < 3) {
    p.source = site.id;
    p.activity = "sniff";
    p.next = "search";
    p.target = site.x;
    p.timer = 3;
    p.reason = "Здесь пока пусто. Подожду, пока появятся новые припасы.";
    return;
  }
  p.source = site.id;
  p.next = "search";
  p.target = site.x;
  p.activity = "walk";
  p.reason = p.memory[site.id]?.finds
    ? "Помню: здесь были " + site.name + ". Проверю снова."
    : kind === "food"
      ? "Миска пуста. Поищу еду в клетке."
      : "Поилка пуста. Поищу капли воды.";
}
function remember(p, site, found) {
  const old = p.memory[site.id] ?? { finds: 0, misses: 0 };
  if (found && !old.finds) p.discoveries++;
  p.memory[site.id] = {
    finds: old.finds + (found ? 1 : 0),
    misses: old.misses + (found ? 0 : 1),
    stock: site.stock,
    time: p.age,
  };
}
export function holdPet(p, x, y) {
  if (!p.held && !p.falling)
    p.resume = {
      activity: p.activity,
      next: p.next,
      target: p.target,
      timer: p.timer,
      reason: p.reason,
      goal: p.goal,
      source: p.source,
    };
  p.held = true;
  p.falling = false;
  p.velocity = 0;
  p.activity = "held";
  // Keep the reason and goal visible: carrying never changes what the hamster needs.
  moveHeldPet(p, x, y);
}
export function moveHeldPet(p, x, y) {
  p.x = clamp(x, 80, 820);
  p.y = clamp(y, 167, 430);
}
function resumePet(p) {
  const saved = p.resume;
  p.resume = null;
  if (!saved) {
    p.activity = "sniff";
    p.timer = 1;
    return;
  }
  Object.assign(p, saved);
  if (["eat", "drink", "search", "sleep", "wheel"].includes(saved.activity)) {
    p.next = saved.activity;
    p.activity = "walk";
  }
}
export function releasePet(p) {
  if (!p.held) return;
  p.held = false;
  p.floor = Math.max(398, p.y);
  p.falling = p.y < p.floor;
  p.velocity = 0;
  if (p.falling) p.activity = "fall";
  else resumePet(p);
}
export function updatePet(p, dt, random = Math.random) {
  dt = clamp(dt, 0, 0.1);
  p.age += dt;
  for (const s of p.sites)
    s.stock = clamp(s.stock + s.regen * dt, 0, s.capacity);
  if (p.held) return p;
  if (p.falling) {
    p.velocity += dt * 460;
    p.y += p.velocity * dt;
    if (p.y >= p.floor) {
      p.y = p.floor;
      p.falling = false;
      resumePet(p);
    }
    return p;
  }
  p.food = clamp(p.food - dt * 0.36);
  p.water = clamp(p.water - dt * (p.activity === "wheel" ? 0.85 : 0.48));
  p.energy = clamp(
    p.energy +
      dt * (p.activity === "sleep" ? 7 : p.activity === "wheel" ? -3 : -0.16),
  );
  const urgent =
    p.water < 40 && p.water <= p.food
      ? "drink"
      : p.food < 40
        ? "eat"
        : p.water < 40
          ? "drink"
          : null;
  // An active need remains the goal until satisfied, including while carried.
  if (urgent && !p.goal) seek(p, urgent);
  if (p.activity === "walk") {
    const d = p.target - p.x;
    p.facing = d < 0 ? -1 : 1;
    if (Math.abs(d) <= dt * 43) {
      p.x = p.target;
      p.y = 398;
      p.floor = 398;
      p.activity = p.next;
      p.timer =
        p.next === "sleep"
          ? 14
          : p.next === "search"
            ? Math.max(1, 3 - p.discoveries * 0.35)
            : 4 + random() * 5;
      p.visits++;
    } else p.x += Math.sign(d) * dt * 43;
  } else {
    p.timer -= dt;
    if (p.activity === "search" && p.timer <= 0) {
      const site = p.sites.find((s) => s.id === p.source);
      if (site) {
        remember(p, site, site.stock >= 1);
        if (site.stock >= 1) {
          p.activity = p.goal;
          p.reason = "Нашёл: " + site.name + "! Запомню это место.";
          return p;
        }
      }
      seek(p, p.goal);
      return p;
    }
    if (p.activity === "eat" || p.activity === "drink") {
      const kind = p.activity === "eat" ? "food" : "water",
        site = p.sites.find((s) => s.id === p.source);
      const stock = p.source === "main" ? p.supplies[kind] : (site?.stock ?? 0);
      const used = Math.min(
        stock,
        dt * (kind === "food" ? 11 : 16),
        100 - p[kind],
      );
      if (p.source === "main") p.supplies[kind] -= used;
      else if (site) {
        site.stock -= used;
        const m = p.memory[site.id];
        if (m) {
          m.stock = site.stock;
          m.time = p.age;
        }
      }
      p[kind] = clamp(p[kind] + used);
      if (p[kind] >= 90) {
        p.goal = null;
        p.source = null;
        p.timer = 0;
      } else if (stock - used < 0.01) {
        seek(p, p.activity);
        return p;
      } else return p;
    }
    if (p.activity === "sleep" && p.energy < 90 && p.timer <= 0) return p;
    if (p.timer <= 0) {
      if (p.goal) {
        seek(p, p.goal);
        return p;
      }
      if (p.water < 65) seek(p, "drink");
      else if (p.food < 65) seek(p, "eat");
      else if (p.energy < 35)
        choose(p, "sleep", "Устал. В домике уютно и тихо.", random);
      else {
        const options = ["sniff", "groom", "wheel", "sleep"].filter(
            (a) => a !== p.activity,
          ),
          next =
            options[
              Math.min(
                options.length - 1,
                Math.floor(random() * options.length),
              )
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
