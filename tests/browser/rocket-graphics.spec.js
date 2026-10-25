import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 900, height: 650 } });
test.setTimeout(120000);
test("detailed world, quality settings and launch effects render correctly", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript(() => {
    crypto.getRandomValues = (a) => {
      a.fill(0);
      return a;
    };
    const fixture = sessionStorage.getItem("visual-fixture");
    if (fixture) {
      localStorage.setItem("rocket-yard-v1", fixture);
      sessionStorage.removeItem("visual-fixture");
    }
  });
  await page.goto("/my-game/rocket.html");
  await page.waitForFunction(() => window.rocketState);
  await page.locator("#start").click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/rocket-new-home.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(() =>
    sessionStorage.setItem(
      "visual-fixture",
      JSON.stringify({ position: [0, -3], yaw: 0, pitch: 0.05 }),
    ),
  );
  await page.reload();
  await page.waitForFunction(() => window.rocketState);
  await page.locator("#start").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/rocket-new-yard.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(() =>
    sessionStorage.setItem(
      "visual-fixture",
      JSON.stringify({
        position: [15, 8],
        yaw: Math.PI,
        pitch: -0.2,
        rocket: { hull: 1, engine: 1, tank: 0, control: 0 },
      }),
    ),
  );
  await page.reload();
  await page.waitForFunction(() => window.rocketState);
  await page.locator("#start").click();
  await page.waitForFunction(() => rocketState().nearest?.storage);
  await page.keyboard.press("KeyE");
  await page.locator("#launch").click();
  await page.waitForFunction(() => rocketState().flight?.time > 3.7);
  await page.screenshot({ path: "/tmp/rocket-new-exhaust.png" });
  await page.keyboard.press("KeyG");
  expect((await page.evaluate(() => rocketState())).fastGraphics).toBe(true);
  expect(errors).toEqual([]);
});
