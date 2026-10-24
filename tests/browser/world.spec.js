import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 800, height: 600 } });
test.setTimeout(100000);
async function start(page, state = {}) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((state) => {
    if (!sessionStorage.getItem("world-fixture")) {
      localStorage.setItem(
        "hamster-life-v1",
        JSON.stringify({
          position: [0, 0, 4.5],
          needs: {
            health: 100,
            food: 50,
            water: 50,
            stamina: 100,
            capacity: 100,
          },
          worldTime: 0,
          ...state,
        }),
      );
      localStorage.setItem("hamster-graphics", "fast");
      sessionStorage.setItem("world-fixture", "yes");
    }
  }, state);
  await page.goto("/my-game/");
  await page.waitForFunction(() => window.simulatorState);
  await page.locator("#start").click();
  return errors;
}
test("Plush initiates repeated attacks for the wheel and stops when it is freed", async ({
  page,
}) => {
  const errors = await start(page, { position: [-6, 0, -2.8] });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().territory === "wheel");
  await page.waitForFunction(() => simulatorState().needs.health <= 76);
  expect((await page.evaluate(() => simulatorState())).activity).toBe("wheel");
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().territory === null);
  const hp = await page.evaluate(() => simulatorState().needs.health);
  await page.waitForTimeout(2200);
  expect(await page.evaluate(() => simulatorState().needs.health)).toBe(hp);
  expect(errors).toEqual([]);
});
test("Plush leaves the occupied house alone when he does not want to sleep", async ({
  page,
}) => {
  const errors = await start(page, { position: [6, 0, -3.2] });
  await page.waitForTimeout(4000);
  expect(await page.evaluate(() => simulatorState().territory)).toBe(null);
  expect(await page.evaluate(() => simulatorState().needs.health)).toBe(100);
  expect(errors).toEqual([]);
});
test("deep tunnels descend five levels, preserve depth and allow climbing", async ({
  page,
}) => {
  const errors = await start(page);
  await page.keyboard.press("KeyB");
  await page.waitForFunction(() => simulatorState().position[1] < -1);
  for (let level = 2; level <= 5; level++) {
    await page.keyboard.press("KeyQ");
    await page.waitForFunction(
      (level) => simulatorState().tunnelLevel === level,
      level,
    );
  }
  expect(await page.evaluate(() => simulatorState().position[1])).toBeCloseTo(
    -8.25,
  );
  await page.keyboard.press("KeyQ");
  expect(await page.evaluate(() => simulatorState().tunnelLevel)).toBe(5);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(
    () => simulatorState().tunnels.filter((c) => c.level === 5).length >= 2,
  );
  await page.keyboard.up("KeyD");
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForFunction(() => window.simulatorState);
  expect(await page.evaluate(() => simulatorState().tunnelLevel)).toBe(5);
  expect(await page.evaluate(() => simulatorState().position[1])).toBeCloseTo(
    -8.25,
  );
  await page.locator("#start").click();
  await page.keyboard.press("KeyR");
  await page.waitForFunction(() => simulatorState().tunnelLevel === 4);
  await page.screenshot({ path: "/tmp/deep-tunnels.png" });
  await page.keyboard.press("KeyB");
  await page.waitForFunction(() => !simulatorState().burrowing);
  expect(errors).toEqual([]);
});
test("digging creates connected traversable tunnels, spends stamina and survives reload", async ({
  page,
}) => {
  const errors = await start(page);
  await page.keyboard.press("KeyB");
  await page.waitForFunction(() => simulatorState().position[1] < -1);
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => simulatorState().tunnels.length >= 3);
  await page.keyboard.up("KeyD");
  const digging = await page.evaluate(() => simulatorState());
  expect(digging.needs.stamina).toBeLessThan(100);
  expect(digging.burrowing).toBe(true);
  await page.screenshot({ path: "/tmp/hamster-tunnels.png" });
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForFunction(() => window.simulatorState);
  expect(await page.evaluate(() => simulatorState().tunnels)).toEqual(
    digging.tunnels,
  );
  expect(await page.evaluate(() => simulatorState().burrowing)).toBe(true);
  await page.locator("#start").click();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => !simulatorState().burrowing);
  expect((await page.evaluate(() => simulatorState())).position[1]).toBe(0);
  expect(errors).toEqual([]);
});
test("an empty shared bowl counts down for 30 seconds and refills", async ({
  page,
}) => {
  const errors = await start(page, {
    position: [-8, 0, 7],
    supplies: [{ id: "food-0", stock: 1, refill: 0 }],
  });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().supplies[0].stock === 0);
  const started = Date.now();
  const drained = await page.evaluate(() => simulatorState());
  expect(drained.supplies[0].refill).toBeGreaterThan(27);
  expect(drained.supplies[1].stock).toBe(60);
  await page.keyboard.press("KeyE");
  expect((await page.evaluate(() => simulatorState())).activity).toBe("rest");
  await page.waitForFunction(
    () => simulatorState().supplies[0].stock === 60,
    null,
    { timeout: 45000 },
  );
  expect(Date.now() - started).toBeGreaterThan(27000);
  expect(errors).toEqual([]);
});
test("water supply and remaining refill time survive reload", async ({
  page,
}) => {
  const errors = await start(page, {
    position: [-10, 0, 1.6],
    supplies: [{ id: "water-0", stock: 1, refill: 0 }],
  });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().supplies[2].stock === 0);
  await page.keyboard.press("Escape");
  const remaining = await page.evaluate(
    () => simulatorState().supplies[2].refill,
  );
  await page.reload();
  await page.waitForFunction(() => window.simulatorState);
  expect((await page.evaluate(() => simulatorState())).supplies[2].refill).toBe(
    remaining,
  );
  expect(errors).toEqual([]);
});
