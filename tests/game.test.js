import test from "node:test";
import assert from "node:assert/strict";
import {
  applyDamage,
  canOccupy,
  MAX_HP,
  PLAYER_DAMAGE,
  BOT_DAMAGE,
} from "../src/game.js";
test("four feed hits defeat a 100 HP bot; ten bot hits defeat player", () => {
  let bot = MAX_HP,
    player = MAX_HP;
  for (let i = 0; i < 4; i++) bot = applyDamage(bot, PLAYER_DAMAGE);
  for (let i = 0; i < 10; i++) player = applyDamage(player, BOT_DAMAGE);
  assert.equal(bot, 0);
  assert.equal(player, 0);
  assert.equal(applyDamage(5, 25), 0);
});
test("cage walls and statue block movement while open bedding is walkable", () => {
  const obstacles = [{ x: 0, z: 0, r: 4.8 }];
  assert.equal(canOccupy(0, 0, obstacles), false);
  assert.equal(canOccupy(5, 0, obstacles), false);
  assert.equal(canOccupy(7, 0, obstacles), true);
  assert.equal(canOccupy(44, 0, obstacles), false);
  assert.equal(canOccupy(-44, 0, obstacles), false);
});
