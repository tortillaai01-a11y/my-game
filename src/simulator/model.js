export const MAX_CAPACITY = 250;
export function freshNeeds() {
  return { health: 100, food: 100, water: 100, stamina: 100, capacity: 100 };
}
const clamp = (n, max = 100) => Math.max(0, Math.min(max, n));
export function tickNeeds(state, dt, activity = "rest") {
  const s = { ...state };
  const wheel = activity === "wheel";
  const sprint = activity === "sprint";
  const sleep = activity === "sleep";
  s.food = clamp(s.food - dt * 0.09);
  s.water = clamp(s.water - dt * 0.14 * (wheel ? 2 : 1));
  if (wheel && s.stamina > 0)
    s.capacity = clamp(s.capacity + dt * 0.5, MAX_CAPACITY);
  s.stamina = clamp(
    s.stamina +
      dt *
        (wheel ? -8 : activity === "dig" ? -5 : sprint ? -6 : sleep ? 14 : 7),
    s.capacity,
  );
  if (s.food === 0 || s.water === 0) s.health = clamp(s.health - dt * 2.5);
  else if (sleep && s.food > 20 && s.water > 20)
    s.health = clamp(s.health + dt * 3);
  return s;
}
export function fallDamage(height) {
  return Math.round(Math.max(0, height - 2.2) * 18);
}
export function hurt(state, damage) {
  return { ...state, health: clamp(state.health - damage) };
}
export function fight(attacker, defender) {
  if (attacker.stamina < 15 || attacker.health <= 0 || defender.health <= 0)
    return null;
  return {
    attacker: { ...attacker, stamina: attacker.stamina - 15 },
    defender: hurt(defender, 12),
  };
}
