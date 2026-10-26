import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  makeYard,
  ITEMS,
  PROJECTS,
  circuit,
  install,
  connect,
  disconnect,
  ready,
  roverCollect,
  unload,
  searchPile,
  restore,
} from "../src/salvage/model.js";
test("yard is mostly junk but contains enough rare components for every project", () => {
  const yard = makeYard();
  assert.equal(yard.length, 600);
  assert.ok(yard.filter((p) => !p.item).length > 480);
  const totals = Object.fromEntries(
    Object.keys(ITEMS).map((k) => [k, yard.filter((p) => p.item === k).length]),
  );
  assert.ok(totals.electronics / 600 < 0.01);
  assert.ok(totals.camera / 600 < 0.005);
  for (const project of Object.values(PROJECTS))
    for (const slot of project.slots)
      for (const [id, n] of Object.entries(slot[2])) assert.ok(totals[id] >= n);
  assert.deepEqual(makeYard(), yard);
});
test("search awards a find once, junk awards nothing and recipes cannot spend unavailable items", () => {
  const s = createState(),
    yard = makeYard(),
    p = yard.find((p) => p.item);
  assert.equal(install(s, "frame"), false);
  searchPile(s, p);
  searchPile(s, p);
  assert.equal(s.inventory[p.item], 1);
  const junk = yard.find((p) => !p.item);
  const before = { ...s.inventory };
  searchPile(s, junk);
  assert.deepEqual(s.inventory, before);
});
test("each project requires its own parts and correct manual wiring; mistaken wires can be removed", () => {
  for (const type of Object.keys(PROJECTS)) {
    const s = createState();
    s.type = type;
    for (const id of Object.keys(ITEMS)) s.inventory[id] = 30;
    for (const [slot] of PROJECTS[type].slots) assert.ok(install(s, slot));
    assert.equal(ready(s), false);
    const nets = circuit(type);
    connect(s, nets[0][0], nets[1][1]);
    assert.equal(ready(s), false);
    const left = s.inventory.wire;
    disconnect(s, 0);
    assert.equal(s.inventory.wire, left + 1);
    for (const [a, b] of nets) assert.ok(connect(s, a, b));
    assert.equal(ready(s), true);
    assert.equal(connect(s, nets[0][0], nets[0][1]), false);
  }
});
test("camera rover only takes its selected item and holds exactly one until unloaded", () => {
  const s = createState(),
    yard = makeYard();
  s.target = "electronics";
  assert.equal(
    roverCollect(
      s,
      yard.find((p) => p.item === "pipe"),
    ),
    false,
  );
  const [a, b] = yard.filter((p) => p.item === "electronics");
  assert.ok(roverCollect(s, a));
  assert.equal(roverCollect(s, b), false);
  assert.equal(s.inventory.electronics, 0);
  const loaded = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.cargo, "electronics");
  unload(s);
  assert.equal(s.inventory.electronics, 1);
  assert.equal(roverCollect(s, a), false);
  assert.ok(roverCollect(s, b));
});
