import test from "node:test";
import assert from "node:assert/strict";
import { setHamsterCount, updateColony } from "../src/pet/colony.js";
import {
  addWall,
  removeWall,
  editMemory,
  moveCageItem,
} from "../src/pet/life.js";

test("population is limited to 1–3 and existing development survives adding/removing pets", () => {
  const pets = [];
  setHamsterCount(pets, 1);
  pets[0].skills.walk = 42;
  const first = pets[0];
  setHamsterCount(pets, 3);
  assert.equal(pets.length, 3);
  assert.equal(pets[0], first);
  assert.equal(pets[0].skills.walk, 42);
  assert.equal(pets[1].skills.walk, 0);
  assert.notEqual(pets[0].x, pets[1].x);
  editMemory(pets[1], { id: "main-food", kind: "food", present: false });
  assert.deepEqual(pets[0].memory, {});
  assert.deepEqual(pets[2].memory, {});
  assert.equal(setHamsterCount(pets, 4), false);
  assert.equal(setHamsterCount(pets, 0), false);
  setHamsterCount(pets, 1);
  assert.equal(pets[0], first);
  setHamsterCount(pets, 3);
  assert.deepEqual(pets[1].memory, {});
});
test("cage and reserves are shared, and regeneration is not multiplied by population", () => {
  const pets = [];
  setHamsterCount(pets, 3);
  const drops = pets[0].sites.find((s) => s.id === "drops");
  drops.stock = 0;
  updateColony(pets, 0.1, () => 0.4);
  assert.ok(Math.abs(drops.stock - 0.085) < 1e-8);
  pets[2].supplies.water = 0;
  assert.equal(pets[0].supplies.water, 0);
  moveCageItem(pets[2], "drink", 400, true);
  assert.equal(pets[0].furniture.drink.y, 245);
  assert.ok(addWall(pets[0], 650, false));
  assert.equal(pets[2].walls.length, 1);
  removeWall(pets[1], pets[0].walls[0].id);
  assert.equal(pets[0].walls.length, 0);
  assert.equal(pets[2].walls.length, 0);
});
test("three hungry hamsters cannot consume more than the shared food stock", () => {
  const pets = [];
  setHamsterCount(pets, 3);
  for (const p of pets) {
    Object.keys(p.skills).forEach((k) => (p.skills[k] = 100));
    Object.assign(p, {
      food: 30,
      activity: "eat",
      goal: "eat",
      source: "main-food",
      x: 640,
      y: 578,
    });
  }
  pets[0].supplies.food = 1;
  updateColony(pets, 0.1, () => 0.4);
  assert.equal(pets[0].supplies.food, 0);
  assert.ok(
    Math.abs(pets.reduce((sum, p) => sum + p.food, 0) - (90 - 0.108 + 1)) <
      1e-8,
  );
});
