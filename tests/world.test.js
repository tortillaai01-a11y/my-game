import test from "node:test";
import assert from "node:assert/strict";
import {
  wantsPlace,
  cellKey,
  createSupply,
  consumeSupply,
  advanceSupply,
  claimedPlace,
  canDigCell,
  tunnelCell,
} from "../src/simulator/world.js";
test("both hamsters share a finite supply; only a full 30 seconds refills it", () => {
  const s = createSupply();
  assert.equal(consumeSupply(s, 35), 35);
  assert.equal(consumeSupply(s, 40), 25);
  assert.equal(s.stock, 0);
  assert.equal(s.refill, 30);
  assert.equal(consumeSupply(s, 4), 0);
  advanceSupply(s, 29.9);
  assert.equal(s.stock, 0);
  assert.equal(advanceSupply(s, 0.1), true);
  assert.equal(s.stock, 60);
  assert.equal(s.refill, 0);
  advanceSupply(s, 100);
  assert.equal(s.stock, 60);
});
test("remaining stock and refill countdown survive serialization", () => {
  const s = createSupply();
  consumeSupply(s, 60);
  advanceSupply(s, 12);
  assert.deepEqual(createSupply(JSON.parse(JSON.stringify(s))), s);
  assert.equal(createSupply().stock, 60);
});
test("territory is claimed only while using wheel or occupying the house", () => {
  assert.equal(claimedPlace({ x: 0, y: 0, z: 0 }, "wheel", "player"), "wheel");
  assert.equal(claimedPlace({ x: 6, y: 0, z: -5 }, "rest", null), "house");
  assert.equal(claimedPlace({ x: 6, y: 3.2, z: -5 }, "rest", null), null);
  assert.equal(claimedPlace({ x: 6, y: 0, z: 0 }, "rest", null), null);
});
test("burrows avoid props and cage edges and use stable grid cells", () => {
  assert.equal(canDigCell(tunnelCell(0, 4), []), true);
  assert.equal(canDigCell(tunnelCell(12, 0), []), false);
  assert.equal(
    canDigCell(tunnelCell(0, 0), [{ x: 0, z: 0, rx: 2, rz: 2 }]),
    false,
  );
});

test("Plush claims only the place he currently wants", () => {
  for (const action of [
    "wander",
    "seek-food",
    "seek-water",
    "food",
    "water",
    "angry",
  ])
    assert.equal(wantsPlace(action), null);
  assert.equal(wantsPlace("seek-wheel"), "wheel");
  assert.equal(wantsPlace("seek-sleep"), "house");
  assert.equal(wantsPlace("sleep"), "house");
});
test("tunnel levels do not overwrite each other and old cells remain on level one", () => {
  assert.notEqual(
    cellKey({ x: 0, z: 0, level: 1 }),
    cellKey({ x: 0, z: 0, level: 5 }),
  );
  assert.equal(cellKey({ x: 0, z: 0 }), cellKey({ x: 0, z: 0, level: 1 }));
});
