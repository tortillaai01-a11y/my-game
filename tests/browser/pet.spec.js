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
test("mouse and touch can carry the hamster within the cage and release it", async ({
  page,
}) => {
  await page.goto("/my-game/pet.html");
  await page.waitForFunction(() => window.petState);
  const canvas = page.locator("#cage");
  await canvas.scrollIntoViewIfNeeded();
  const rect = await canvas.boundingBox(),
    p = await page.evaluate(() => petState());
  const xy = (x, y) => ({
    x: rect.x + (x * rect.width) / 900,
    y: rect.y + (y * rect.height) / 510,
  });
  const start = xy(p.x, p.y - 25),
    end = xy(700, 220);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.waitForFunction(() => petState().held);
  await page.mouse.move(end.x, end.y, { steps: 5 });
  const held = await page.evaluate(() => petState());
  expect(held.x).toBeGreaterThan(650);
  expect(held.y).toBeLessThan(300);
  await page.screenshot({ path: "/tmp/pet-held.png" });
  await page.mouse.up();
  await page.waitForFunction(() => !petState().held && !petState().falling);
  expect(await page.locator("#food").getAttribute("max")).toBe("100");
  expect(
    await page.evaluate(() => document.querySelector("#water").value),
  ).toBeLessThan(75);
  // Touch pointer events use the same capture/release path as physical touch.
  const now = await page.evaluate(() => petState()),
    a = xy(now.x, now.y - 25),
    b = xy(130, 240);
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 42,
    pointerType: "touch",
    clientX: a.x,
    clientY: a.y,
    button: 0,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 42,
    pointerType: "touch",
    clientX: b.x,
    clientY: b.y,
  });
  await canvas.dispatchEvent("pointercancel", {
    pointerId: 42,
    pointerType: "touch",
  });
  await page.waitForFunction(() => !petState().held);
});
