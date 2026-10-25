import test from "node:test";
import assert from "node:assert/strict";
import {
  createPet,
  updatePet,
  ACTIVITIES,
  holdPet,
  moveHeldPet,
  releasePet,
} from "../src/pet/life.js";
test("hamster walks by itself, arrives without overshoot, and stays inside its cage", () => {
  const pet = createPet();
  const x = pet.x;
  updatePet(pet, 0.1);
  assert.ok(pet.x > x);
  for (let i = 0; i < 1000; i++) updatePet(pet, 0.1, () => 0.2);
  assert.ok(pet.visits > 2);
  assert.ok(pet.x >= 110 && pet.x <= 790);
});
test("leisure choices lead to finite activities", () => {
  for (let n = 0; n < 6; n++) {
    const pet = { ...createPet(), activity: "rest", timer: 0 };
    updatePet(pet, 0.1, () => n / 6 + 0.01);
    assert.ok(ACTIVITIES[pet.next]);
    assert.equal(pet.activity, "walk");
    for (let i = 0; i < 220; i++) updatePet(pet, 0.1, () => n / 6 + 0.01);
    assert.ok(pet.visits > 0);
  }
});

test("critical thirst interrupts sleep; both depleted needs recover without oscillation", () => {
  const p = {
    ...createPet(),
    activity: "sleep",
    water: 12,
    food: 20,
    timer: 100,
  };
  updatePet(p, 0.1, () => 0.5);
  assert.equal(p.next, "drink");
  for (let i = 0; i < 700; i++) updatePet(p, 0.1, () => 0.5);
  assert.ok(p.water > 40);
  assert.ok(p.food > 40);
});
test("hungry hamster seeks food; tired satisfied hamster seeks sleep", () => {
  const p = { ...createPet(), food: 10 };
  updatePet(p, 0.1);
  assert.equal(p.next, "eat");
  const tired = { ...createPet(), activity: "sniff", timer: 0, energy: 10 };
  updatePet(tired, 0.1);
  assert.equal(tired.next, "sleep");
});
test("dragging clamps to cage, suspends eating, and resumes after landing", () => {
  const p = { ...createPet(), activity: "eat", food: 30 };
  holdPet(p, 900, -200);
  assert.equal(p.x, 820);
  assert.equal(p.y, 167);
  updatePet(p, 0.1);
  assert.ok(p.food < 30);
  moveHeldPet(p, 200, 220);
  releasePet(p);
  assert.equal(p.falling, true);
  for (let i = 0; i < 20; i++) updatePet(p, 0.1);
  assert.equal(p.held, false);
  assert.equal(p.falling, false);
  assert.equal(p.y, 398);
});
