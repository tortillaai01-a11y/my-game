import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 900, height: 650 } });
test.setTimeout(120000);
test("rocket home exit, scrapyard salvage, save and garage storage work", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const fixture = sessionStorage.getItem("rocket-fixture");
    if (fixture) {
      localStorage.setItem("rocket-yard-v1", fixture);
      sessionStorage.removeItem("rocket-fixture");
    }
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/my-game/rocket.html");
  await page.waitForFunction(() => window.rocketState);
  expect((await page.evaluate(() => rocketState())).position).toEqual([
    0, 1.65, 8,
  ]);
  await page.locator("#start").click();
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => rocketState().position[2] < 0.5);
  await page.keyboard.up("KeyW");
  expect((await page.evaluate(() => rocketState())).position[2]).toBeLessThan(
    1,
  );
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "/tmp/rocket-menu.png" });
  // Resume a saved visit aimed at an accessible scrap plate. The public
  // snapshot is read-only; interaction still uses the actual scene raycast.
  const item = await page.evaluate(() =>
    rocketState().salvage.find(
      (o) => o.type === "cardboard" && Math.abs(o.position[0]) < 2.5,
    ),
  );
  expect(item).toBeTruthy();
  await page.evaluate((item) => {
    const s = JSON.parse(localStorage.getItem("rocket-yard-v1"));
    s.position = [item.position[0], item.position[2] + 1.3];
    s.yaw = 0;
    s.pitch = -Math.atan2(1.65 - 0.18, 1.3);
    sessionStorage.setItem("rocket-fixture", JSON.stringify(s));
  }, item);
  await page.reload();
  await page.waitForFunction(() => window.rocketState);
  await page.locator("#start").click();
  await page.waitForFunction(() => rocketState().nearest?.pickup !== undefined);
  await page.keyboard.press("KeyE");
  expect((await page.evaluate(() => rocketState())).collected).toHaveLength(1);
  await page.screenshot({ path: "/tmp/rocket-yard.png" });
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForFunction(() => window.rocketState);
  expect((await page.evaluate(() => rocketState())).collected).toHaveLength(1);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("rocket-yard-v1"));
    s.position = [15, 8];
    s.yaw = Math.PI;
    s.pitch = -0.3;
    sessionStorage.setItem("rocket-fixture", JSON.stringify(s));
  });
  await page.reload();
  await page.waitForFunction(() => window.rocketState);
  await page.locator("#start").click();

  await page.waitForFunction(() => rocketState().nearest?.storage);
  await page.keyboard.press("KeyE");
  expect(
    Object.values((await page.evaluate(() => rocketState())).cargo).reduce(
      (a, b) => a + b,
      0,
    ),
  ).toBe(0);
  expect(
    Object.values((await page.evaluate(() => rocketState())).storage).reduce(
      (a, b) => a + b,
      0,
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
});
