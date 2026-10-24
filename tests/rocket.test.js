import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyCargo,
  validCargo,
  canStand,
  transfer,
} from "../src/rocket/model.js";
test("rocket walking blocks walls and permits open doorways", () => {
  const walls = [
    { x: -3, z: 1, w: 4, d: 0.25 },
    { x: 3, z: 1, w: 4, d: 0.25 },
  ];
  assert.equal(canStand(0, 1, walls), true);
  assert.equal(canStand(2, 1, walls), false);
  assert.equal(canStand(49, 0, walls), false);
});
test("garage transfer preserves items and empties the backpack", () => {
  const cargo = { ...emptyCargo(), scrap: 4, wire: 2 },
    storage = { ...emptyCargo(), scrap: 3 };
  const result = transfer(cargo, storage);
  assert.equal(result.storage.scrap, 7);
  assert.equal(result.storage.wire, 2);
  assert.deepEqual(result.cargo, emptyCargo());
  assert.equal(cargo.scrap, 4);
  assert.equal(validCargo({ scrap: -7, pipe: "bad", board: 2 }).board, 2);
  assert.equal(validCargo({ scrap: -7 }).scrap, 0);
});
