import test from "node:test";
import assert from "node:assert/strict";
import { resolvePenetration } from "../src/simulator/collision.js";
test("landing partly inside the house front does not trap the hamster", () => {
  const wall = { x: 3.9, z: -2, rx: 0.9, rz: 0.15, h: 3 };
  const result = resolvePenetration({ x: 4, y: 0, z: -1.62 }, [wall]);
  assert.ok(result.z > wall.z + wall.rz + 0.38);
  assert.equal(result.x, 4);
});
test("roof movement stays unchanged; an overlapping corner resolves both walls", () => {
  const walls = [
    { x: 3, z: -5, rx: 0.15, rz: 3, h: 3 },
    { x: 6, z: -8, rx: 3, rz: 0.15, h: 3 },
  ];
  assert.deepEqual(resolvePenetration({ x: 3, y: 3.2, z: -8 }, walls), {
    x: 3,
    z: -8,
  });
  const p = resolvePenetration({ x: 3.1, y: 0, z: -7.9 }, walls);
  for (const o of walls)
    assert.ok(
      Math.abs(p.x - o.x) >= o.rx + 0.38 || Math.abs(p.z - o.z) >= o.rz + 0.38,
    );
});
