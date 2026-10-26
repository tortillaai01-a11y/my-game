export const ITEMS = {
  scrap: "Металлолом",
  pipe: "Труба",
  wire: "Провод",
  bolt: "Крепёж",
  motor: "Электромотор",
  battery: "Аккумулятор",
  electronics: "Контроллер",
  camera: "Камера",
  wheels: "Колесо",
};
export const PROJECTS = {
  rocket: {
    name: "Ракета",
    note: "Экспериментальная модель для пробного запуска.",
    slots: [
      ["frame", "Корпус", { pipe: 3, scrap: 3, bolt: 3 }],
      ["drive", "Двигательный модуль", { motor: 1, pipe: 2 }],
      ["power", "Питание", { battery: 1 }],
      ["control", "Управление", { electronics: 1 }],
    ],
  },
  drone: {
    name: "Квадрокоптер",
    note: "Четыре мотора. После сборки — пробный облёт площадки.",
    slots: [
      ["frame", "Рама", { scrap: 3, bolt: 4 }],
      ["drive", "Четыре мотора и винты", { motor: 4, scrap: 2 }],
      ["power", "Питание", { battery: 1 }],
      ["control", "Полётный контроллер", { electronics: 1 }],
    ],
  },
  rover: {
    name: "Машинка с камерой",
    note: "Ищет выбранный предмет. Грузовой отсек — ровно 1 предмет.",
    slots: [
      ["frame", "Шасси", { scrap: 3, bolt: 4 }],
      ["drive", "Колёса и приводы", { wheels: 4, motor: 2 }],
      ["power", "Питание", { battery: 1 }],
      ["control", "Камера и управление", { camera: 1, electronics: 1 }],
    ],
  },
};
export function circuit(type) {
  const base = [
    ["bat+", "pwr+", "Плюс аккумулятора", "Питание +"],
    ["bat-", "pwr-", "Минус аккумулятора", "Питание −"],
  ];
  const count = type === "drone" ? 4 : type === "rover" ? 2 : 1;
  for (let i = 1; i <= count; i++)
    base.push(["out" + i, "motor" + i, "Канал " + i, "Мотор " + i]);
  if (type === "rover") base.push(["video", "cam", "Видеовход", "Камера"]);
  return base;
}
export function createState() {
  return {
    inventory: Object.fromEntries(Object.keys(ITEMS).map((k) => [k, 0])),
    type: "rocket",
    builds: Object.fromEntries(
      Object.keys(PROJECTS).map((k) => [k, { parts: [], wires: [] }]),
    ),
    searched: [],
    collected: [],
    cargo: null,
    target: "electronics",
  };
}
export function makeYard() {
  let seed = 91837;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const contents = [];
  for (const [id, n] of Object.entries({
    scrap: 20,
    pipe: 12,
    wire: 24,
    bolt: 20,
    motor: 10,
    battery: 5,
    electronics: 5,
    camera: 2,
    wheels: 8,
  }))
    for (let i = 0; i < n; i++) contents.push(id);
  while (contents.length < 600) contents.push(null);
  for (let i = contents.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [contents[i], contents[j]] = [contents[j], contents[i]];
  }
  return contents.map((item, id) => ({
    id,
    item,
    x: ((id % 25) - 12) * 2.7 + (rnd() - 0.5),
    z: -16 - Math.floor(id / 25) * 2.7,
    height: 0.35 + rnd() * 0.8,
    angle: rnd() * 6.28,
  }));
}
export function searchPile(s, pile) {
  if (s.searched.includes(pile.id)) return false;
  s.searched.push(pile.id);
  if (pile.item && !s.collected.includes(pile.id)) {
    s.inventory[pile.item]++;
    s.collected.push(pile.id);
  }
  return pile.item;
}
export function install(s, slot) {
  const build = s.builds[s.type],
    recipe = PROJECTS[s.type].slots.find((r) => r[0] === slot);
  if (
    !recipe ||
    build.parts.includes(slot) ||
    Object.entries(recipe[2]).some(([k, n]) => s.inventory[k] < n)
  )
    return false;
  for (const [k, n] of Object.entries(recipe[2])) s.inventory[k] -= n;
  build.parts.push(slot);
  return true;
}
export function connect(s, a, b) {
  const build = s.builds[s.type],
    nets = circuit(s.type),
    left = nets.map((n) => n[0]),
    right = nets.map((n) => n[1]);
  if (right.includes(a) && left.includes(b)) [a, b] = [b, a];
  if (
    !left.includes(a) ||
    !right.includes(b) ||
    s.inventory.wire < 1 ||
    build.wires.some((w) => w.includes(a) || w.includes(b))
  )
    return false;
  build.wires.push([a, b]);
  s.inventory.wire--;
  return true;
}
export function disconnect(s, index) {
  const b = s.builds[s.type];
  if (index < 0 || index >= b.wires.length) return false;
  b.wires.splice(index, 1);
  s.inventory.wire++;
  return true;
}
export function ready(s) {
  const b = s.builds[s.type];
  return (
    PROJECTS[s.type].slots.every((r) => b.parts.includes(r[0])) &&
    circuit(s.type).every((n) =>
      b.wires.some((w) => w[0] === n[0] && w[1] === n[1]),
    )
  );
}
export function roverCollect(s, pile) {
  if (
    s.cargo ||
    !pile?.item ||
    pile.item !== s.target ||
    s.collected.includes(pile.id)
  )
    return false;
  s.cargo = pile.item;
  s.collected.push(pile.id);
  if (!s.searched.includes(pile.id)) s.searched.push(pile.id);
  return true;
}
export function unload(s) {
  if (!s.cargo) return false;
  s.inventory[s.cargo]++;
  s.cargo = null;
  return true;
}
export function restore(raw) {
  const s = createState();
  if (!raw || typeof raw !== "object") return s;
  for (const k of Object.keys(ITEMS))
    if (Number.isInteger(raw.inventory?.[k]))
      s.inventory[k] = Math.max(0, Math.min(999, raw.inventory[k]));
  if (PROJECTS[raw.type]) s.type = raw.type;
  if (ITEMS[raw.target]) s.target = raw.target;
  if (ITEMS[raw.cargo]) s.cargo = raw.cargo;
  for (const k of ["searched", "collected"])
    s[k] = [
      ...new Set(
        Array.isArray(raw[k])
          ? raw[k].filter((v) => Number.isInteger(v) && v >= 0 && v < 600)
          : [],
      ),
    ];
  for (const type of Object.keys(PROJECTS)) {
    const b = raw.builds?.[type];
    if (!b) continue;
    s.builds[type].parts = PROJECTS[type].slots
      .map((r) => r[0])
      .filter((k) => b.parts?.includes(k));
    if (Array.isArray(b.wires))
      for (const w of b.wires) {
        const nets = circuit(type),
          used = s.builds[type].wires.flat();
        if (
          Array.isArray(w) &&
          nets.some((n) => n[0] === w[0]) &&
          nets.some((n) => n[1] === w[1]) &&
          !used.includes(w[0]) &&
          !used.includes(w[1])
        )
          s.builds[type].wires.push([w[0], w[1]]);
      }
  }
  return s;
}
