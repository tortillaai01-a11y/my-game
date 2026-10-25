import test from "node:test";
import assert from "node:assert/strict";
import {
  YARD_TYPES,
  buy,
  assemble,
  launchChance,
  launch,
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

test("yard contains exactly cardboard, pipe and fasteners; purchases require money", () => {
  assert.deepEqual(YARD_TYPES, ["cardboard", "pipe", "bolt"]);
  assert.equal(buy(emptyCargo(), 5, "fuel"), null);
  const result = buy(emptyCargo(), 500, "fuel");
  assert.equal(result.money, 100);
  assert.equal(result.cargo.fuel, 1);
});
test("assembly consumes ingredients once and launch outcomes preserve only reusable parts", () => {
  const store = { ...emptyCargo(), cardboard: 4, bolt: 4 };
  const built = assemble(store, {}, "hull");
  assert.equal(built.storage.cardboard, 0);
  assert.equal(built.rocket.hull, 0);
  assert.equal(assemble(store, built.rocket, "hull"), null);
  assert.equal(launchChance(built.rocket), 0);
  assert.equal(launch(built.rocket, 0), null);
  const basic = { hull: 0, engine: 0, tank: 0, control: 0 };
  assert.equal(launchChance(basic), 0.5);
  assert.ok(
    Math.abs(launchChance({ ...basic, hull: 1, engine: 1 }) - 0.9) < 1e-9,
  );
  assert.deepEqual(launch(basic, 0.1), {
    success: true,
    rocket: {},
    reward: 1000,
  });
  assert.deepEqual(launch(basic, 0.9), {
    success: false,
    reward: 0,
    rocket: { hull: 0, control: 0 },
  });
});
