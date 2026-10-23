import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 1000, height: 700 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const fixture = sessionStorage.getItem("hamster-test-fixture");
    if (fixture) {
      localStorage.setItem("hamster-life-v1", fixture);
      sessionStorage.removeItem("hamster-test-fixture");
    }
  });
});
async function enter(page, position, needs = {}) {
  await page.goto("/my-game/");
  await page.evaluate(
    ({ position, needs }) => {
      sessionStorage.setItem(
        "hamster-test-fixture",
        JSON.stringify({
          position,
          needs: {
            health: 100,
            food: 80,
            water: 80,
            stamina: 100,
            capacity: 100,
            ...needs,
          },
          worldTime: 0,
        }),
      );
    },
    { position, needs },
  );
  await page.reload();
  await page.waitForFunction(() => window.simulatorState);
  await page.locator("#start").click();
}
test("simulator has two hamsters; wheel trains and consumes needs; pause freezes progress", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page, [-6, 0, -2.8]);
  expect((await page.evaluate(() => simulatorState())).objects).toEqual({
    hamsters: 2,
    wheels: 1,
    houses: 1,
    bowls: 2,
    drinkers: 2,
  });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().activity === "wheel");
  await page.waitForFunction(() => simulatorState().needs.capacity > 100.3);
  const trained = await page.evaluate(() => simulatorState());
  expect(trained.needs.stamina).toBeLessThan(100);
  expect(trained.needs.water).toBeLessThan(80);
  await page.keyboard.press("KeyE");
  expect((await page.evaluate(() => simulatorState())).wheelOwner).toBeNull();
  await page.keyboard.press("Escape");
  const paused = await page.evaluate(() => simulatorState());
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => simulatorState())).needs).toEqual(
    paused.needs,
  );
  expect(errors).toEqual([]);
});
test("food, water and sleep restore the corresponding needs", async ({
  page,
}) => {
  await enter(page, [-8, 0, 7], { food: 40 });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().needs.food > 45);
  expect((await page.evaluate(() => simulatorState())).activity).toBe("food");
  await enter(page, [-10, 0, 1.6], { water: 40 });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().needs.water > 45);
  expect((await page.evaluate(() => simulatorState())).activity).toBe("water");
  await enter(page, [6, 0, -1.4], { health: 60 });
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().needs.health > 62);
  expect((await page.evaluate(() => simulatorState())).activity).toBe("sleep");
});
test("neighbor retaliates after a fight and falling from the roof costs health", async ({
  page,
}) => {
  await enter(page, [-4, 0, -1.3]);
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => simulatorState().botNeeds.health < 100);
  await page.waitForFunction(() => simulatorState().needs.health < 100);
  await enter(page, [4, 3.2, -1.9]);
  await page.keyboard.down("KeyS");
  await page.waitForFunction(() => simulatorState().needs.health < 100);
  await page.keyboard.up("KeyS");
  expect((await page.evaluate(() => simulatorState())).position[1]).toBe(0);
});
test("saved life resumes and the home screen renders without errors", async ({
  page,
}) => {
  await enter(page, [0, 0, 4], { capacity: 130, stamina: 60 });
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => simulatorState().position[2] < 3.6);
  await page.keyboard.up("KeyW");
  await page.locator("#pause").click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hamster-life-v1")),
  );
  expect(saved.needs.capacity).toBe(130);
  await page.reload();
  await page.waitForFunction(() => window.simulatorState);
  expect((await page.evaluate(() => simulatorState())).needs).toEqual(
    saved.needs,
  );
  expect((await page.evaluate(() => simulatorState())).position).toEqual(
    saved.position,
  );
  await page.locator("#start").click();
  await page.screenshot({ path: "/tmp/hamster-simulator.png" });
});

test("the neighbor uses the only wheel and can be challenged for it", async ({
  page,
}) => {
  await enter(page, [-6, 0, -2.8]);
  await page.waitForFunction(() => simulatorState().wheelOwner === "bot");
  await page.keyboard.press("KeyE");
  expect((await page.evaluate(() => simulatorState())).activity).toBe("rest");
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => simulatorState().wheelOwner === null);
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().wheelOwner === "player");
});

test("reloading during wheel training returns the hamster beside the wheel", async ({
  page,
}) => {
  await enter(page, [-6, 0, -2.8]);
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => simulatorState().activity === "wheel");
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForFunction(() => window.simulatorState);
  expect((await page.evaluate(() => simulatorState())).position).toEqual([
    -6, 0, -2.9,
  ]);
  await page.locator("#start").click();
  await page.keyboard.down("KeyS");
  await page.waitForFunction(() => simulatorState().position[2] > -2.5);
  await page.keyboard.up("KeyS");
});
