import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 800, height: 600 } });
test.setTimeout(120000);
test("work pays, shop charges, garage builds and launch persists its outcome", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    crypto.getRandomValues = (array) => {
      array.fill(0);
      return array;
    };
    const s = sessionStorage.getItem("economy-fixture");
    if (s) {
      localStorage.setItem("rocket-yard-v1", s);
      sessionStorage.removeItem("economy-fixture");
    }
  });
  async function visit(position, yaw = 0, extra = {}) {
    await page.evaluate(
      ({ position, yaw, extra }) => {
        const s = JSON.parse(localStorage.getItem("rocket-yard-v1")) || {};
        sessionStorage.setItem(
          "economy-fixture",
          JSON.stringify({ ...s, position, yaw, pitch: -0.2, ...extra }),
        );
      },
      { position, yaw, extra },
    );
    await page.reload();
    await page.waitForFunction(() => window.rocketState);
    await page.locator("#start").click();
  }
  await page.goto("/my-game/rocket.html");
  await page.waitForFunction(() => window.rocketState);
  expect(
    [
      ...new Set(
        (await page.evaluate(() => rocketState())).salvage.map((o) => o.type),
      ),
    ].sort(),
  ).toEqual(["bolt", "cardboard", "pipe"]);
  await visit([32, -8], Math.PI);
  await page.waitForFunction(() => rocketState().nearest?.station === "work");
  await page.keyboard.press("KeyE");
  await page.locator("#work-start").click();
  await page.waitForFunction(() => rocketState().money === 500, null, {
    timeout: 25000,
  });
  await page.locator("#close-activity").click();
  await page.keyboard.press("Escape");
  await visit([-16, 7], Math.PI);
  await page.waitForFunction(() => rocketState().nearest?.station === "shop");
  await page.keyboard.press("KeyE");
  await page.locator('[data-buy="fuel"]').click();
  expect((await page.evaluate(() => rocketState())).money).toBe(100);
  expect((await page.evaluate(() => rocketState())).cargo.fuel).toBe(1);
  await page.locator("#close-activity").click();
  await page.keyboard.press("Escape");
  await visit([15, 8], Math.PI, {
    storage: {
      cardboard: 4,
      bolt: 6,
      pipe: 3,
      wire: 4,
      can: 1,
      electronics: 1,
    },
  });
  await page.waitForFunction(() => rocketState().nearest?.storage);
  await page.keyboard.press("KeyE");
  for (const id of ["hull", "engine", "tank", "control"])
    await page.locator('[data-build="' + id + '"]').click();
  await expect(page.locator("#activity-panel")).toContainText(
    "Шанс взлёта: 50%",
  );
  await page.screenshot({ path: "/tmp/rocket-build.png" });
  await page.locator("#launch").click();
  await page.waitForFunction(
    () => rocketState().flights + rocketState().failures === 1,
  );
  const result = await page.evaluate(() => rocketState());
  expect(result.money).toBe(1100);
  await page.waitForFunction(() => rocketState().flight === null, null, {
    timeout: 30000,
  });
  await page.screenshot({ path: "/tmp/rocket-launch.png" });
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForFunction(() => window.rocketState);
  expect((await page.evaluate(() => rocketState())).rocket).toEqual(
    result.rocket,
  );
  expect((await page.evaluate(() => rocketState())).money).toBe(1100);
  expect(errors).toEqual([]);
});
