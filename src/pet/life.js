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
  descend: "Спускается к наполнителю",
  dig: "Ищет червячков под землёй",
  observe: "Изучает клетку",
};
export const UPPER_FLOOR = { left: 80, right: 560, y: 245, rampBottom: 720 };
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
export function createPet() {
  return {
    x: 300,
    y: 578,
    target: 550,
    targetY: 578,
    level: 0,
    climbing: false,
    facing: 1,
    activity: "walk",
    next: "observe",
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
    floor: 578,
    goal: null,
    source: "drops",
    nextExploreAt: 0,
    observing: null,
    resume: null,
    furniture: {
      sleep: { x: 185, y: 578 },
      wheel: { x: 420, y: 578 },
      eat: { x: 640, y: 578 },
      drink: { x: 787, y: 578 },
    },
    wormsFound: 0,
    walls: [],
    supplies: { food: 60, water: 70 },
    memory: {},
    discoveries: 0,
    sites: [
      {
        id: "upstairs-seeds",
        kind: "food",
        name: "семечки на втором этаже",
        x: 340,
        y: 245,
        stock: 18,
        capacity: 18,
        regen: 0,
      },
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
  p.target = p.furniture[action]?.x ?? 110 + random() * 680;
  p.targetY = p.furniture[action]?.y ?? 578;
  p.activity = "walk";
  p.reason = reason;
}
export function memoryPlaces(p) {
  return [
    {
      id: "main-food",
      kind: "food",
      name: "миска",
      ...p.furniture.eat,
      stock: p.supplies.food,
      capacity: 60,
      regen: 0,
    },
    {
      id: "main-water",
      kind: "water",
      name: "поилка",
      ...p.furniture.drink,
      stock: p.supplies.water,
      capacity: 70,
      regen: 0,
    },
    ...p.sites,
  ];
}
export function editMemory(p, { id, kind, x, present }) {
  if (!["food", "water"].includes(kind) || typeof present !== "boolean")
    return null;
  let site = memoryPlaces(p).find((s) => s.id === id && s.kind === kind);
  if (!site && Number.isFinite(x))
    site = memoryPlaces(p).find(
      (s) => s.kind === kind && Math.abs(s.x - x) < 18,
    );
  if (!site) {
    if (!Number.isFinite(x) || p.sites.filter((s) => s.custom).length >= 24)
      return null;
    let n = 1;
    while (p.sites.some((s) => s.id === "hint-" + n)) n++;
    site = {
      id: "hint-" + n,
      kind,
      name: "место " + Math.round(clamp(x, 80, 820)),
      x: clamp(x, 80, 820),
      stock: 0,
      capacity: 100,
      regen: 0,
      custom: true,
    };
    p.sites.push(site);
  }
  p.memory[site.id] = {
    finds: 0,
    misses: 0,
    stock: present ? 25 : 0,
    time: p.age,
    injected: true,
    present,
  };
  reconsider(p, site.id);
  return site.id;
}
function reconsider(p, id) {
  if (!p.goal) return;
  if (p.held || p.falling) {
    if (p.resume) {
      p.resume.activity = "sniff";
      p.resume.timer = 0;
      p.resume.source = null;
    }
  } else {
    p.activity = "sniff";
    p.timer = 0;
    p.source = null;
  }
}
export function forgetMemory(p, id) {
  delete p.memory[id];
  const site = p.sites.find((s) => s.id === id);
  if (site?.custom) p.sites = p.sites.filter((s) => s.id !== id);
  reconsider(p, id);
  p.discoveries = Object.values(p.memory).filter((m) => m.finds > 0).length;
}
function seek(p, goal) {
  if (goal === "eat" && p.food < 18) {
    startDig(p);
    return;
  }
  p.goal = goal;
  const kind = goal === "eat" ? "food" : "water";
  const candidates = memoryPlaces(p).filter(
    (s) => s.kind === kind && reachable(p, s.x, s.y ?? 578),
  );
  const estimate = (s) => {
    const m = p.memory[s.id];
    if (m?.injected) return m.present ? 25 : p.age - m.time < 45 ? 0 : 10;
    if (!m) return s.id.startsWith("main") ? s.stock : 10;
    return Math.min(s.capacity, m.stock + (p.age - m.time) * s.regen);
  };
  candidates.sort((a, b) => {
    const score = (s) =>
      (estimate(s) >= 3 ? 1000 : 0) +
      (p.memory[s.id]?.injected && p.memory[s.id].present ? 700 : 0) +
      (p.memory[s.id]?.finds ? 200 : 0) +
      (s.id.startsWith("main") ? 500 : 0) -
      Math.abs(p.x - s.x);
    return score(b) - score(a);
  });
  const site = candidates[0];
  if (!site || (goal === "eat" && !candidates.some((s) => estimate(s) >= 3))) {
    if (goal === "eat") startDig(p);
    else {
      p.activity = "sniff";
      p.timer = 3;
      p.source = null;
      p.reason = "К воде нет прохода. Подожду, вдруг путь откроется.";
    }
    return;
  }
  p.source = site.id;
  p.target = site.x;
  p.targetY = site.y ?? 578;
  if (estimate(site) < 3) {
    p.activity = "sniff";
    p.next = "search";
    p.timer = 3;
    p.reason = "Помню пустые места. Подожду и проверю запасы ещё раз.";
    return;
  }
  p.next =
    site.id.startsWith("main") && !p.memory[site.id]?.injected
      ? goal
      : "search";
  p.activity = "walk";
  p.reason = p.memory[site.id]?.injected
    ? "Мне подсказали: здесь есть " +
      (kind === "food" ? "еда" : "вода") +
      ". Проверю!"
    : p.memory[site.id]?.finds
      ? "Помню: здесь были " + site.name + ". Проверю снова."
      : "Пойду проверю: " + site.name + ".";
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
function explore(p) {
  if (p.age < p.nextExploreAt) return false;
  const sites = memoryPlaces(p).filter(
    (s) =>
      reachable(p, s.x, s.y ?? 578) &&
      (!p.memory[s.id] || p.age - p.memory[s.id].time > 40),
  );
  sites.sort((a, b) => {
    const score = (s) =>
      (p.memory[s.id] ? 0 : 1000) +
      (p.age - (p.memory[s.id]?.time ?? p.age)) -
      Math.abs(p.x - s.x);
    return score(b) - score(a);
  });
  const site = sites[0];
  if (!site) return false;
  p.goal = null;
  p.source = site.id;
  p.target = site.x;
  p.targetY = site.y ?? 578;
  p.next = "observe";
  p.activity = "walk";
  p.reason =
    (p.memory[site.id] ? "Проверю, что изменилось: " : "Хочу изучить: ") +
    site.name +
    ".";
  return true;
}
function observeNearby(p, dt) {
  const site = memoryPlaces(p)
    .filter(
      (s) => Math.abs(s.x - p.x) < 32 && Math.abs((s.y ?? 578) - p.y) < 20,
    )
    .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  if (!site) {
    p.observing = null;
    return;
  }
  const m = p.memory[site.id];
  if (m && !m.injected && p.age - m.time < 20) {
    p.observing = null;
    return;
  }
  if (p.observing?.id !== site.id) p.observing = { id: site.id, time: 0 };
  p.observing.time += dt;
  if (p.observing.time >= 1.2) {
    remember(p, site, site.stock >= 1);
    p.observing = null;
  }
}
export function holdPet(p, x, y) {
  if (!p.held && !p.falling)
    p.resume = {
      activity: p.activity,
      next: p.next,
      target: p.target,
      targetY: p.targetY,
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
  p.y = clamp(y, 167, 610);
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
  if (saved.activity === "descend") {
    startDig(p);
    return;
  }
  if (
    [
      "eat",
      "drink",
      "search",
      "observe",
      "sleep",
      "wheel",
      "dig",
      "descend",
    ].includes(saved.activity)
  ) {
    p.next = saved.activity;
    p.activity = "walk";
  }
}
export function releasePet(p) {
  if (!p.held) return;
  p.held = false;
  p.climbing = false;
  p.floor =
    p.x >= UPPER_FLOOR.left && p.x <= UPPER_FLOOR.right && p.y <= UPPER_FLOOR.y
      ? UPPER_FLOOR.y
      : Math.max(578, p.y);
  // A carried hamster may cross a wall, but must not land inside one.
  const overlap = p.walls.find(
    (w) => w.y === p.floor && Math.abs(p.x - w.x) <= 30,
  );
  if (overlap) {
    const safe = [overlap.x - 31, overlap.x + 31].filter(
      (x) => x >= 80 && x <= 820 && !blockedSegment(p, x, p.floor, x, p.floor),
    );
    if (safe.length)
      p.x = safe.sort((a, b) => Math.abs(a - p.x) - Math.abs(b - p.x))[0];
  }
  p.level = p.floor === UPPER_FLOOR.y ? 1 : 0;
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
  observeNearby(p, dt);
  // An active need remains the goal until satisfied, including while carried.
  if (
    p.food < 18 &&
    p.next !== "dig" &&
    p.next !== "descend" &&
    p.activity !== "descend" &&
    p.activity !== "dig" &&
    p.activity !== "eat"
  )
    seek(p, "eat");
  if (urgent && !p.goal) seek(p, urgent);
  if (p.activity === "walk") {
    const upper = p.targetY === UPPER_FLOOR.y;
    let x = p.target,
      y = p.targetY;
    if (p.climbing) {
      x = upper ? UPPER_FLOOR.right : UPPER_FLOOR.rampBottom;
      y = upper ? UPPER_FLOOR.y : 578;
    } else if (p.level !== Number(upper)) {
      x = p.level ? UPPER_FLOOR.right : UPPER_FLOOR.rampBottom;
      y = p.level ? UPPER_FLOOR.y : 578;
    }
    if (blockedSegment(p, p.x, p.y, x, y)) {
      if (p.goal === "eat" || p.next === "dig") startDig(p);
      else {
        p.activity = "sniff";
        p.timer = 3;
        p.reason = "Здесь стена. Поищу другое занятие.";
      }
      return p;
    }
    const dx = x - p.x,
      dy = y - p.y,
      distance = Math.hypot(dx, dy);
    if (dx) p.facing = dx < 0 ? -1 : 1;
    if (distance <= dt * 43) {
      p.x = x;
      p.y = y;
      p.floor = y;
      if (p.climbing) {
        p.climbing = false;
        p.level = Number(upper);
        return p;
      }
      if (p.level !== Number(upper)) {
        p.climbing = true;
        return p;
      }
      p.activity = p.next;
      p.timer =
        p.next === "sleep"
          ? 14
          : p.next === "observe"
            ? 1.5
            : p.next === "search"
              ? Math.max(1, 3 - p.discoveries * 0.35)
              : 4 + random() * 5;
      p.visits++;
    } else {
      p.x += (dx / distance) * dt * 43;
      p.y += (dy / distance) * dt * 43;
    }
  } else {
    p.timer -= dt;
    if (p.activity === "descend") {
      const dx = p.target - p.x;
      if (Math.abs(dx) > dt * 43) {
        p.x += Math.sign(dx) * dt * 43;
        return p;
      }
      p.x = p.target;
      p.y = Math.min(578, p.y + dt * 65);
      if (p.y === 578) {
        p.level = 0;
        p.climbing = false;
        p.activity = "dig";
        p.next = "dig";
        p.timer = 6;
      }
      return p;
    }
    if (p.activity === "dig") {
      p.y = Math.min(626, p.y + dt * 18);
      if (p.timer <= 0) {
        p.food = clamp(p.food + 35);
        p.wormsFound++;
        p.reason = "Нашёл червячка под опилками и подкрепился!";
        p.activity = "walk";
        p.next = "sniff";
        p.target = p.x;
        p.targetY = 578;
        p.goal = null;
      }
      return p;
    }
    if (p.activity === "observe" && p.timer <= 0) {
      const site = memoryPlaces(p).find((s) => s.id === p.source);
      if (site) {
        remember(p, site, site.stock >= 1);
        p.reason =
          "Сам проверил: " +
          site.name +
          (site.stock >= 1
            ? " — есть припасы. Запомню!"
            : " — пусто. Запомню!");
      }
      p.source = null;
      p.activity = "sniff";
      p.timer = 2;
      p.nextExploreAt = p.age + 6;
      return p;
    }
    if (p.activity === "search" && p.timer <= 0) {
      const site = memoryPlaces(p).find((s) => s.id === p.source);
      if (site) {
        remember(p, site, site.stock >= 1);
        if (site.stock >= 1) {
          p.activity = p.goal;
          p.reason = "Нашёл: " + site.name + "! Запомню это место.";
          return p;
        }
      }
      if (p.goal === "eat") startDig(p);
      else seek(p, p.goal);
      return p;
    }
    if (p.activity === "eat" || p.activity === "drink") {
      const kind = p.activity === "eat" ? "food" : "water",
        site = memoryPlaces(p).find((s) => s.id === p.source);
      const stock = p.source?.startsWith("main")
        ? p.supplies[kind]
        : (site?.stock ?? 0);
      const used = Math.min(
        stock,
        dt * (kind === "food" ? 11 : 16),
        100 - p[kind],
      );
      if (p.source?.startsWith("main")) {
        p.supplies[kind] -= used;
        const id = "main-" + kind,
          old = p.memory[id];
        p.memory[id] = {
          finds: Math.max(1, old?.finds ?? 0),
          misses: old?.misses ?? 0,
          stock: p.supplies[kind],
          time: p.age,
        };
      } else if (site) {
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
      else if (explore(p)) return p;
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

// Changing the bottle never changes thirst or writes memories for the hamster.
export function setWaterSupply(p, full) {
  p.supplies.water = full ? 70 : 0;
}

export function cageItems(p) {
  return [
    ...Object.entries(p.furniture).map(([id, pos]) => ({
      id,
      ...pos,
      name: { sleep: "Домик", wheel: "Колесо", eat: "Миска", drink: "Поилка" }[
        id
      ],
    })),
    ...p.sites.filter((s) => !s.custom),
  ];
}
export function moveCageItem(p, id, x, upper) {
  if (!Number.isFinite(x)) return false;
  const item = p.furniture[id] ?? p.sites.find((s) => s.id === id && !s.custom);
  if (!item) return false;
  item.x = clamp(x, upper ? 170 : 150, upper ? 470 : 780);
  item.y = upper ? UPPER_FLOOR.y : 578;
  const sourceId =
    id === "eat" ? "main-food" : id === "drink" ? "main-water" : id;
  const plan = p.resume ?? p;
  if (plan.source === sourceId || plan.next === id || plan.activity === id) {
    plan.target = item.x;
    plan.targetY = item.y;
    if (plan.activity !== "walk") {
      plan.next = plan.activity;
      plan.activity = "walk";
    }
  }
  return true;
}
export function setSupply(p, id, full) {
  if (id === "eat" || id === "main-food") p.supplies.food = full ? 60 : 0;
  else if (id === "drink" || id === "main-water") setWaterSupply(p, full);
  else {
    const site = p.sites.find((s) => s.id === id && !s.custom);
    if (site) site.stock = full ? site.capacity : 0;
  }
}

// Walls occupy one floor. Expand them by the hamster body when checking paths.
export function blockedSegment(p, ax, ay, bx, by) {
  return p.walls.some((w) => {
    let low = 0,
      high = 1;
    for (const [a, b, min, max] of [
      [ax, bx, w.x - 30, w.x + 30],
      [ay, by, w.y - 90, w.y + 40],
    ]) {
      const d = b - a;
      if (Math.abs(d) < 0.00001) {
        if (a < min || a > max) return false;
      } else {
        const t1 = (min - a) / d,
          t2 = (max - a) / d;
        low = Math.max(low, Math.min(t1, t2));
        high = Math.min(high, Math.max(t1, t2));
        if (low > high) return false;
      }
    }
    return true;
  });
}
export function reachable(p, x, y) {
  const upper = y === UPPER_FLOOR.y;
  const points = [[p.x, p.y]];
  if (p.climbing) points.push(upper ? [560, UPPER_FLOOR.y] : [720, 578]);
  else if (p.level !== Number(upper)) {
    points.push(p.level ? [560, UPPER_FLOOR.y] : [720, 578]);
    points.push(upper ? [560, UPPER_FLOOR.y] : [720, 578]);
  }
  points.push([x, y]);
  return points
    .slice(1)
    .every((v, i) => !blockedSegment(p, ...points[i], ...v));
}
function startDig(p) {
  p.goal = "eat";
  p.source = null;
  p.reason = "Еды не нашёл или путь закрыт. Поищу червячков под опилками!";
  const x = clamp(p.x, 80, 820);
  p.next = "dig";
  p.target = x;
  p.targetY = 578;
  p.activity = "walk";
  if (!reachable(p, x, 578)) {
    // From a blocked shelf, climb down its front on the same side of the wall.
    const landing = [x, x - 40, x + 40, x - 80, x + 80].find(
      (v) =>
        v >= 80 &&
        v <= 820 &&
        !blockedSegment(p, p.x, p.y, v, p.y) &&
        !blockedSegment(p, v, p.y, v, 578),
    );
    if (landing === undefined) {
      p.activity = "sniff";
      p.timer = 3;
      p.reason = "Всё перегорожено. Нужен проход к наполнителю.";
      return;
    }
    p.target = landing;
    p.targetY = p.y;
    p.next = "descend";
    p.activity = "descend";
    p.climbing = false;
  }
}
export function addWall(p, x, upper) {
  if (!Number.isFinite(x) || p.walls.length >= 16) return false;
  x = clamp(x, 90, upper ? 540 : 810);
  const y = upper ? UPPER_FLOOR.y : 578;
  if (Math.abs(p.x - x) < 45 && p.y >= y - 90 && p.y <= y + 80) return false;
  if (
    (p.activity === "descend" || p.next === "descend") &&
    Math.abs(p.target - x) < 45
  )
    return false;
  if (p.walls.some((w) => w.y === y && Math.abs(w.x - x) < 65)) return false;
  let n = 1;
  while (p.walls.some((w) => w.id === "wall-" + n)) n++;
  p.walls.push({ id: "wall-" + n, x, y });
  return true;
}
export function removeWall(p, id) {
  p.walls = p.walls.filter((w) => w.id !== id);
}
