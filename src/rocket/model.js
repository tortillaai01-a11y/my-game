export const TYPES = [
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
        ? Math.max(0, Math.min(160, value[t.id]))
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
