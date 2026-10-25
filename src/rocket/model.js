export const TYPES = [
  { id: "cardboard", name: "Картон", color: "#b89b6c", shape: "board" },
  { id: "engine", name: "Двигатель", color: "#647e89", shape: "tank" },
  { id: "fuel", name: "Ракетное топливо", color: "#d3a344", shape: "tank" },
  { id: "scrap", name: "Металлолом", color: "#8d7461", shape: "plate" },
  { id: "pipe", name: "Труба", color: "#9aa9a2", shape: "pipe" },
  { id: "wire", name: "Провод", color: "#c68b47", shape: "coil" },
  { id: "board", name: "Доска", color: "#9b7750", shape: "board" },
  { id: "can", name: "Баллон", color: "#9b5445", shape: "tank" },
  { id: "electronics", name: "Электроника", color: "#568b76", shape: "box" },
  { id: "bolt", name: "Крепёж", color: "#adb5b0", shape: "bolt" },
  { id: "rubber", name: "Резина", color: "#353937", shape: "tire" },
];
export function emptyCargo() {
  return Object.fromEntries(TYPES.map((t) => [t.id, 0]));
}
export function validCargo(value) {
  return Object.fromEntries(
    TYPES.map((t) => [
      t.id,
      Number.isSafeInteger(value?.[t.id])
        ? Math.max(0, Math.min(100000, value[t.id]))
        : 0,
    ]),
  );
}
export function canStand(x, z, solids, radius = 0.32) {
  return (
    Math.abs(x) < 48 &&
    z > -56 &&
    z < 23 &&
    !solids.some(
      (s) =>
        Math.abs(x - s.x) < s.w / 2 + radius &&
        Math.abs(z - s.z) < s.d / 2 + radius,
    )
  );
}
export function transfer(cargo, storage) {
  const next = { ...storage },
    carried = emptyCargo();
  for (const type of TYPES) next[type.id] += cargo[type.id];
  return { cargo: carried, storage: next };
}

export const YARD_TYPES = ["cardboard", "pipe", "bolt"];
export const SHIFT_PAY = 500;
export const LAUNCH_REWARD = 1000;
// Approximate game prices for common household-scale components, not live quotations.
export const PRICES = {
  cardboard: 25,
  pipe: 250,
  bolt: 15,
  scrap: 100,
  wire: 75,
  board: 200,
  can: 750,
  electronics: 1500,
  rubber: 300,
  engine: 5000,
  fuel: 400,
};
export const RECIPES = [
  {
    id: "hull",
    title: "Картонный корпус",
    slot: "hull",
    quality: 0,
    cost: { cardboard: 4, bolt: 4 },
  },
  {
    id: "metalHull",
    title: "Металлический корпус",
    slot: "hull",
    quality: 1,
    cost: { scrap: 4, bolt: 4 },
  },
  {
    id: "engine",
    title: "Самодельный двигатель",
    slot: "engine",
    quality: 0,
    cost: { pipe: 3, wire: 2, bolt: 2 },
  },
  {
    id: "factoryEngine",
    title: "Заводской двигатель",
    slot: "engine",
    quality: 1,
    cost: { engine: 1, bolt: 2 },
  },
  {
    id: "tank",
    title: "Заправленный бак",
    slot: "tank",
    quality: 0,
    cost: { can: 1, fuel: 1 },
  },
  {
    id: "control",
    title: "Система управления",
    slot: "control",
    quality: 0,
    cost: { electronics: 1, wire: 2 },
  },
];
export function buy(cargo, money, id) {
  const price = PRICES[id];
  if (!price || money < price) return null;
  return { cargo: { ...cargo, [id]: cargo[id] + 1 }, money: money - price };
}
export function assemble(storage, rocket, id) {
  const recipe = RECIPES.find((r) => r.id === id);
  if (
    !recipe ||
    rocket[recipe.slot] !== undefined ||
    Object.entries(recipe.cost).some(([key, count]) => storage[key] < count)
  )
    return null;
  const next = { ...storage };
  for (const [key, count] of Object.entries(recipe.cost)) next[key] -= count;
  return {
    storage: next,
    rocket: { ...rocket, [recipe.slot]: recipe.quality },
  };
}
export function launchChance(rocket) {
  if (
    ["hull", "engine", "tank", "control"].some(
      (key) => rocket[key] === undefined,
    )
  )
    return 0;
  return 0.5 + rocket.hull * 0.2 + rocket.engine * 0.2;
}
export function launch(rocket, roll) {
  const chance = launchChance(rocket);
  if (!chance) return null;
  const success = roll < chance;
  const remaining = success
    ? {}
    : { hull: rocket.hull, control: rocket.control };
  return { success, rocket: remaining, reward: success ? LAUNCH_REWARD : 0 };
}
