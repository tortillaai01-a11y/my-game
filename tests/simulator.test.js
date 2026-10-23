import test from "node:test";
import assert from "node:assert/strict";
import {
  freshNeeds,
  tickNeeds,
  fallDamage,
  fight,
} from "../src/simulator/model.js";
test("wheel training raises capacity but spends stamina and exactly doubles thirst", () => {
  const s = freshNeeds();
  const idle = tickNeeds(s, 10),
    wheel = tickNeeds(s, 10, "wheel");
  assert.ok(wheel.capacity > s.capacity);
  assert.ok(wheel.stamina < s.stamina);
  assert.ok(Math.abs(100 - wheel.water - 2 * (100 - idle.water)) < 1e-9);
  assert.ok(idle.food < 100);
  assert.equal(s.stamina, 100);
});
test("training capacity is limited to 160; rest restores only current stamina", () => {
  const s = { ...freshNeeds(), capacity: 159, stamina: 100 };
  const trained = tickNeeds(s, 5, "wheel");
  assert.equal(trained.capacity, 160);
  const rested = tickNeeds({ ...trained, stamina: 0 }, 60);
  assert.equal(rested.capacity, 160);
  assert.equal(rested.stamina, 160);
});
test("starvation harms health; sleep heals only with food and water", () => {
  assert.ok(tickNeeds({ ...freshNeeds(), food: 0 }, 2).health < 100);
  assert.ok(tickNeeds({ ...freshNeeds(), health: 50 }, 2, "sleep").health > 50);
  assert.ok(
    tickNeeds({ ...freshNeeds(), health: 50, water: 0 }, 2, "sleep").health <
      50,
  );
});
test("normal jumps are safe, roof falls hurt, and fights cost stamina and health", () => {
  assert.equal(fallDamage(1.3), 0);
  assert.ok(fallDamage(3.2) > 0);
  const result = fight(freshNeeds(), freshNeeds());
  assert.equal(result.attacker.stamina, 85);
  assert.equal(result.defender.health, 88);
  assert.equal(fight({ ...freshNeeds(), stamina: 14 }, freshNeeds()), null);
});
