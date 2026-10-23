import { test, expect } from "@playwright/test";
test("arena renders, player moves, shoots, reloads, and pauses", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/my-game/shooter.html");
  await expect(page.locator("#play")).toBeVisible();
  await page.waitForFunction(() => window.gameState);
  expect(await page.evaluate(() => gameState().botHp)).toEqual([
    100, 100, 100, 100, 100, 100,
  ]);
  await page.screenshot({ path: "/tmp/hamster-menu.png" });
  await page.locator("#play").click();
  await page.waitForFunction(() => gameState().active);
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => gameState().position[2] < 23);
  await page.keyboard.up("KeyW");
  expect((await page.evaluate(() => gameState().position))[2]).toBeLessThan(23);
  await page.mouse.down();
  await page.waitForFunction(() => gameState().ammo < 24);
  await page.mouse.up();
  expect(await page.evaluate(() => gameState().ammo)).toBeLessThan(24);
  await page.keyboard.press("KeyR");
  await page.waitForFunction(() => gameState().ammo === 24);
  expect(await page.evaluate(() => gameState().ammo)).toBe(24);
  await page.screenshot({ path: "/tmp/hamster-game.png" });
  await page.evaluate(() => document.exitPointerLock());
  await expect(page.locator("#overlay")).toBeVisible();
  const paused = await page.evaluate(() => gameState());
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => gameState().hp)).toBe(paused.hp);
  expect(errors).toEqual([]);
});
