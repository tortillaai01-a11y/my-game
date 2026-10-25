import { test, expect } from "@playwright/test";
test("2D hamster lives autonomously; pause freezes it; mobile cage fits", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/my-game/pet.html");
  await page.waitForFunction(() => window.petState);
  const start = await page.evaluate(() => petState().x);
  await page.waitForFunction((x) => petState().x > x + 20, start);
  await page.screenshot({ path: "/tmp/pet-desktop.png" });
  await page.locator("#pause").click();
  const state = await page.evaluate(() => petState());
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => petState())).toEqual(state);
  await page.locator("#pause").click();
  await page.waitForFunction((age) => petState().age > age + 0.2, state.age);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/pet-mobile.png" });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
