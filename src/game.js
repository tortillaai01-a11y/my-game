export const MAX_HP = 100;
export const PLAYER_DAMAGE = 25;
export const BOT_DAMAGE = 10;
export const ARENA_SIZE = 44;
export function applyDamage(hp, damage) {
  return Math.max(0, hp - damage);
}
export function canOccupy(x, z, obstacles, radius = 0.5) {
  if (Math.abs(x) > ARENA_SIZE - radius || Math.abs(z) > ARENA_SIZE - radius)
    return false;
  return obstacles.every((o) => Math.hypot(x - o.x, z - o.z) > o.r + radius);
}
