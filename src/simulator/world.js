export const REFILL_SECONDS = 30;
export const SUPPLY_CAPACITY = 60;
export const TUNNEL_SIZE = 1.5;
export const TUNNEL_DEPTH = -1.65;
export function createSupply(saved) {
  const stock = Number.isFinite(saved?.stock)
    ? Math.max(0, Math.min(SUPPLY_CAPACITY, saved.stock))
    : SUPPLY_CAPACITY;
  return {
    stock,
    capacity: SUPPLY_CAPACITY,
    refill:
      stock > 0
        ? 0
        : Number.isFinite(saved?.refill)
          ? Math.max(0, Math.min(REFILL_SECONDS, saved.refill))
          : REFILL_SECONDS,
  };
}
export function consumeSupply(supply, requested) {
  const used = Math.min(supply.stock, Math.max(0, requested));
  supply.stock = Math.max(0, supply.stock - used);
  if (supply.stock < 1e-6) {
    supply.stock = 0;
    if (used > 0) supply.refill = REFILL_SECONDS;
  }
  return used;
}
export function advanceSupply(supply, dt) {
  if (supply.stock > 0) return false;
  supply.refill = Math.max(0, supply.refill - Math.max(0, dt));
  if (supply.refill < 1e-6) {
    supply.stock = supply.capacity;
    supply.refill = 0;
    return true;
  }
  return false;
}
export function claimedPlace(position, activity, wheelOwner) {
  if (wheelOwner === "player") return "wheel";
  if (
    activity === "sleep" ||
    (position.y >= -0.1 &&
      position.y < 2.8 &&
      position.x > 3.3 &&
      position.x < 8.7 &&
      position.z > -7.7 &&
      position.z < -1.8)
  )
    return "house";
  return null;
}
export function tunnelCell(x, z) {
  return { x: Math.round(x / TUNNEL_SIZE), z: Math.round(z / TUNNEL_SIZE) };
}
export function cellKey(c) {
  return `${c.x},${c.z}`;
}
export function canDigCell(c, obstacles) {
  const x = c.x * TUNNEL_SIZE,
    z = c.z * TUNNEL_SIZE;
  return (
    Math.abs(x) < 11 &&
    Math.abs(z) < 9 &&
    !obstacles.some(
      (o) =>
        Math.abs(x - o.x) < o.rx + TUNNEL_SIZE * 0.6 &&
        Math.abs(z - o.z) < o.rz + TUNNEL_SIZE * 0.6,
    )
  );
}
