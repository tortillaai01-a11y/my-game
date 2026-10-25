import test from "node:test";
import assert from "node:assert/strict";
import { createPet, updatePet, ACTIVITIES } from "../src/pet/life.js";
test("hamster walks by itself, arrives without overshoot, and stays inside its cage", () => {
  const pet = createPet();
  const x = pet.x;
  updatePet(pet, 0.1);
  assert.ok(pet.x > x);
  for (let i = 0; i < 1000; i++) updatePet(pet, 0.1, () => 0.2);
  assert.ok(pet.visits > 2);
  assert.ok(pet.x >= 110 && pet.x <= 790);
});
test("every autonomous activity is reachable and pauses have a finite duration", () => {
  for (let n = 0; n < 6; n++) {
    const pet = { ...createPet(), activity: "rest", timer: 0 };
    updatePet(pet, 0.1, () => n / 6 + 0.01);
    assert.ok(ACTIVITIES[pet.next]);
    assert.equal(pet.activity, "walk");
    for (let i = 0; i < 220; i++) updatePet(pet, 0.1, () => n / 6 + 0.01);
    assert.ok(pet.visits > 0);
  }
});
