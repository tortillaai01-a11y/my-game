import test from "node:test";
import assert from "node:assert/strict";
import { MovementInput } from "../src/simulator/controls.js";
test("releasing each movement key stops that direction immediately", () => {
  for (const key of [
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowLeft",
    "ArrowDown",
    "ArrowRight",
  ]) {
    const input = new MovementInput();
    input.press(key);
    assert.notDeepEqual(input.axes(), { x: 0, z: 0 });
    input.release(key);
    assert.deepEqual(input.axes(), { x: 0, z: 0 });
    input.press(key, true);
    assert.deepEqual(input.axes(), { x: 0, z: 0 });
  }
});
test("diagonals have constant speed and releasing W preserves a held D", () => {
  const input = new MovementInput();
  input.press("KeyW");
  input.press("KeyD");
  assert.ok(Math.abs(Math.hypot(...Object.values(input.axes())) - 1) < 1e-12);
  input.release("KeyW");
  assert.deepEqual(input.axes(), { x: 1, z: 0 });
  input.release("KeyD");
  assert.deepEqual(input.axes(), { x: 0, z: 0 });
});
test("lost touch capture, blur and stale repeats cannot stick movement", () => {
  const input = new MovementInput();
  input.holdPointer(1, "KeyW");
  input.holdPointer(2, "KeyD");
  input.releasePointer(1);
  assert.deepEqual(input.axes(), { x: 1, z: 0 });
  input.press("KeyW");
  input.clear();
  input.press("KeyW", true);
  assert.deepEqual(input.axes(), { x: 0, z: 0 });
  input.press("KeyW");
  input.holdPointer(1, "KeyW");
  input.releasePointer(1);
  assert.equal(input.has("KeyW"), true);
  input.release("KeyW");
  assert.equal(input.has("KeyW"), false);
});
