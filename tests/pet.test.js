import test from "node:test";
import assert from "node:assert/strict";
import {
  createPet as createNewborn,
  addWall,
  removeWall,
  reachable,
  moveCageItem,
  setSupply,
  cageItems,
  setWaterSupply,
  updatePet,
  ACTIVITIES,
  holdPet,
  moveHeldPet,
  releasePet,
  editMemory,
  forgetMemory,
} from "../src/pet/life.js";
// Existing behavior scenarios exercise an experienced hamster.
function createPet() {
  const p = createNewborn();
  for (const key of Object.keys(p.skills)) p.skills[key] = 100;
  p.activity = "walk";
  return p;
}
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
  const p = { ...createPet(), food: 25 };
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
  assert.equal(p.food, 30);
  moveHeldPet(p, 200, 400);
  releasePet(p);
  assert.equal(p.falling, true);
  for (let i = 0; i < 20; i++) updatePet(p, 0.1);
  assert.equal(p.held, false);
  assert.equal(p.falling, false);
  assert.equal(p.y, 578);
});

test("carrying preserves exact need values, destination and intention through landing", () => {
  const p = { ...createPet(), water: 10 };
  updatePet(p, 0.1);
  const goal = p.goal,
    target = p.target,
    water = p.water,
    food = p.food,
    reason = p.reason;
  holdPet(p, 200, 200);
  for (let i = 0; i < 100; i++) updatePet(p, 0.1);
  assert.equal(p.water, water);
  assert.equal(p.food, food);
  assert.equal(p.goal, goal);
  releasePet(p);
  while (p.falling) updatePet(p, 0.1);
  assert.equal(p.water, water);
  assert.equal(p.goal, goal);
  assert.equal(p.target, target);
  assert.equal(p.next, "drink");
  assert.equal(p.reason, reason);
  assert.equal(p.activity, "walk");
});
test("food and water are finite; recovery consumes the actual available stock", () => {
  const p = {
    ...createPet(),
    activity: "eat",
    goal: "eat",
    source: "main",
    food: 20,
    x: 640,
  };
  p.supplies.food = 0.5;
  updatePet(p, 0.1);
  assert.equal(p.supplies.food, 0);
  assert.ok(Math.abs(p.food - (20 - 0.036 + 0.5)) < 1e-8);
  assert.equal(p.goal, "eat");
  assert.equal(p.next, "search");
});
test("empty stations lead to exploration and learned sources sustain the hamster", () => {
  const p = { ...createPet(), food: 25, water: 20 };
  p.supplies = { food: 0, water: 0 };
  for (let i = 0; i < 9000; i++) updatePet(p, 0.1, () => 0.4);
  assert.ok(p.discoveries >= 2);
  assert.ok(Object.values(p.memory).some((m) => m.finds > 1));
  assert.ok(p.food > 5);
  assert.ok(p.water > 5);
  assert.equal(p.supplies.food, 0);
  assert.equal(p.supplies.water, 0);
  for (const site of p.sites)
    assert.ok(site.stock >= 0 && site.stock <= site.capacity);
});

test("false memories redirect search, supply no food and are corrected on inspection", () => {
  const p = { ...createPet(), food: 20, x: 450 };
  const id = editMemory(p, { kind: "food", x: 450, present: true });
  const stock = p.supplies.food;
  updatePet(p, 0.1);
  assert.equal(p.source, id);
  for (let i = 0; i < 50; i++) updatePet(p, 0.1);
  assert.equal(p.memory[id].injected, undefined);
  assert.equal(p.memory[id].stock, 0);
  assert.ok(p.memory[id].misses > 0);
  assert.ok(p.food < 20);
  assert.equal(p.supplies.food, stock);
  forgetMemory(p, id);
  assert.equal(p.memory[id], undefined);
  assert.equal(
    p.sites.some((s) => s.id === id),
    false,
  );
});
test("a false absence makes the hamster avoid a full bowl; deleting it restores the option", () => {
  const p = { ...createPet(), food: 20 };
  editMemory(p, { id: "main-food", kind: "food", present: false });
  updatePet(p, 0.1);
  assert.notEqual(p.source, "main-food");
  assert.equal(p.supplies.food, 60);
  forgetMemory(p, "main-food");
  updatePet(p, 0.1);
  assert.equal(p.source, "main-food");
});

test("without player hints a well-fed hamster autonomously maps the cage", () => {
  const p = createPet();
  for (let i = 0; i < 1800; i++) {
    p.food = 90;
    p.water = 90;
    p.energy = 90;
    updatePet(p, 0.1, () => 0.4);
  }
  for (const id of [
    "crumbs",
    "sprouts",
    "drops",
    "dew",
    "main-food",
    "main-water",
  ])
    assert.ok(p.memory[id], id + " should be learned autonomously");
  assert.ok(Object.values(p.memory).every((m) => !m.injected));
});
test("a forgotten real location is learned again during exploration", () => {
  const p = createPet();
  for (let i = 0; i < 300; i++) {
    p.food = 90;
    p.water = 90;
    updatePet(p, 0.1, () => 0.4);
  }
  forgetMemory(p, "sprouts");
  for (let i = 0; i < 1000; i++) {
    p.food = 90;
    p.water = 90;
    p.energy = 90;
    updatePet(p, 0.1, () => 0.4);
  }
  assert.ok(p.memory.sprouts);
  assert.equal(p.memory.sprouts.injected, undefined);
});

test("hamster explores upstairs via ramp and returns downstairs without teleporting", () => {
  const p = createPet();
  let climbed = false,
    learned = false,
    returned = false;
  for (let i = 0; i < 2400; i++) {
    p.food = p.water = p.energy = 90;
    const x = p.x,
      y = p.y;
    updatePet(p, 0.1, () => 0.4);
    assert.ok(Math.hypot(p.x - x, p.y - y) <= 4.301);
    if (p.climbing && p.y < 390) climbed = true;
    if (p.memory["upstairs-seeds"]) learned = true;
    if (learned && p.y === 578) returned = true;
  }
  assert.ok(climbed && learned && returned);
});
test("dropping above the shelf lands upstairs and preserves needs", () => {
  const p = createPet();
  holdPet(p, 340, 167);
  const food = p.food,
    water = p.water;
  releasePet(p);
  while (p.falling) updatePet(p, 0.1);
  assert.equal(p.y, 245);
  assert.equal(p.level, 1);
  assert.equal(p.food, food);
  assert.equal(p.water, water);
});
test("bottle controls change actual stock without changing needs or memories", () => {
  const p = createPet();
  editMemory(p, { id: "main-water", kind: "water", present: false });
  const memory = structuredClone(p.memory),
    water = p.water;
  setWaterSupply(p, false);
  assert.equal(p.supplies.water, 0);
  setWaterSupply(p, true);
  setWaterSupply(p, true);
  assert.equal(p.supplies.water, 70);
  assert.equal(p.water, water);
  assert.deepEqual(p.memory, memory);
});

test("moving the active food source upstairs replans the path and consumption happens there", () => {
  const p = createPet();
  p.food = 30;
  updatePet(p, 0.1);
  assert.equal(p.source, "main-food");
  moveCageItem(p, "eat", 300, true);
  assert.equal(p.targetY, 245);
  for (let i = 0; i < 650 && p.supplies.food === 60; i++) updatePet(p, 0.1);
  assert.ok(p.supplies.food < 60);
  assert.equal(p.y, 245);
  assert.equal(p.x, 300);
});
test("every real reserve can be emptied and refilled", () => {
  const p = createPet();
  for (const item of cageItems(p)) setSupply(p, item.id, false);
  assert.equal(p.supplies.food, 0);
  assert.equal(p.supplies.water, 0);
  assert.ok(p.sites.every((s) => s.stock === 0));
  for (const item of cageItems(p)) setSupply(p, item.id, true);
  assert.ok(p.sites.every((s) => s.stock === s.capacity));
});
test("starving hamster descends from upstairs, digs underground, eats worms and resurfaces", () => {
  const p = { ...createPet(), x: 340, y: 245, level: 1, food: 10 };
  for (const item of cageItems(p)) setSupply(p, item.id, false);
  let underground = false;
  for (let i = 0; i < 1000; i++) {
    updatePet(p, 0.1, () => 0.4);
    if (p.activity === "dig" && p.y > 600) underground = true;
    if (p.wormsFound && p.y === 578) break;
  }
  assert.ok(underground);
  assert.equal(p.wormsFound, 1);
  assert.ok(p.food > 20);
  assert.equal(p.y, 578);
});

test("walls block both floor routes and the ramp, and removal restores access", () => {
  const p = createPet();
  assert.ok(addWall(p, 450, false));
  assert.equal(reachable(p, 640, 578), false);
  assert.equal(reachable(p, 120, 578), true);
  assert.equal(reachable(p, 340, 245), false);
  removeWall(p, p.walls[0].id);
  assert.equal(reachable(p, 640, 578), true);
  assert.ok(addWall(p, 480, true));
  assert.equal(reachable(p, 340, 245), false);
  assert.equal(reachable(p, 640, 578), true);
});
test("a newly blocked food trip triggers digging before starvation without crossing the wall", () => {
  const p = { ...createPet(), food: 35 };
  updatePet(p, 0.1);
  assert.equal(p.source, "main-food");
  addWall(p, 450, false);
  for (let i = 0; i < 200 && !p.wormsFound; i++) {
    updatePet(p, 0.1, () => 0.4);
    assert.ok(p.x < 420);
  }
  assert.equal(p.wormsFound, 1);
  assert.ok(p.food > 50);
  assert.equal(p.supplies.food, 60);
});
test("unsuccessful food search triggers digging even at moderate hunger", () => {
  const p = { ...createPet(), food: 35, x: 450 };
  editMemory(p, { kind: "food", x: 450, present: true });
  for (let i = 0; i < 200 && !p.wormsFound; i++) updatePet(p, 0.1, () => 0.4);
  assert.equal(p.wormsFound, 1);
  assert.ok(p.food > 50);
});
test("blocked upstairs hamster climbs down on its side to forage", () => {
  const p = { ...createPet(), x: 300, y: 245, level: 1, food: 35 };
  updatePet(p, 0.1);
  addWall(p, 450, true);
  for (let i = 0; i < 300 && !p.wormsFound; i++) {
    updatePet(p, 0.1, () => 0.4);
    assert.ok(p.x < 420);
  }
  assert.equal(p.wormsFound, 1);
});
test("carrying over a wall lands beside it and does not change needs", () => {
  const p = createPet();
  addWall(p, 450, false);
  holdPet(p, 450, 400);
  releasePet(p);
  while (p.falling) updatePet(p, 0.1);
  assert.ok(Math.abs(p.x - 450) > 30);
  assert.equal(p.food, 75);
});

test("a wall added at the foot of the ramp does not trap a food-seeking hamster", () => {
  const p = {
    ...createPet(),
    x: 650,
    y: 432,
    level: 1,
    climbing: true,
    goal: "eat",
    next: "eat",
    target: 640,
    targetY: 578,
    source: "main-food",
    food: 30,
  };
  assert.ok(addWall(p, 720, false));
  for (let i = 0; i < 250 && !p.wormsFound; i++) updatePet(p, 0.1, () => 0.4);
  assert.equal(p.wormsFound, 1);
  assert.ok(p.x < 690);
});

test("newborn has no skills or memories and initially stays still", () => {
  const p = createNewborn(),
    x = p.x;
  assert.ok(Object.values(p.skills).every((v) => v === 0));
  for (let i = 0; i < 50; i++) updatePet(p, 0.1);
  assert.equal(p.activity, "newborn");
  assert.equal(p.x, x);
  assert.deepEqual(p.memory, {});
  assert.equal(p.wormsFound, 0);
});
test("basic skills develop gradually, while carrying freezes practice", () => {
  const p = createNewborn();
  for (let i = 0; i < 100; i++) updatePet(p, 0.1);
  assert.ok(p.skills.walk > 0 && p.skills.walk < 100);
  assert.equal(p.skills.observe, 0);
  const skills = structuredClone(p.skills);
  holdPet(p, 200, 200);
  for (let i = 0; i < 100; i++) updatePet(p, 0.1);
  assert.deepEqual(p.skills, skills);
  releasePet(p);
  for (let i = 0; i < 200; i++) updatePet(p, 0.1);
  assert.equal(p.skills.walk, 100);
  assert.equal(p.skills.observe, 100);
  assert.equal(p.skills.dig, 0);
});
test("inexperienced hamster practices digging before getting any worms", () => {
  const p = createPet();
  p.skills.dig = 0;
  p.food = 30;
  updatePet(p, 0.1);
  addWall(p, 450, false);
  for (let i = 0; i < 80; i++) updatePet(p, 0.1, () => 0.4);
  assert.ok(p.skills.dig > 0 && p.skills.dig < 100);
  assert.equal(p.wormsFound, 0);
  assert.equal(p.y, 578);
  for (let i = 0; i < 150; i++) updatePet(p, 0.1, () => 0.4);
  assert.equal(p.skills.dig, 100);
  assert.ok(p.wormsFound > 0);
});
