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
  await page.waitForTimeout(300);
  const stillHeld = await page.evaluate(() => petState());
  expect(stillHeld.food).toBe(held.food);
  expect(stillHeld.water).toBe(held.water);
  expect(stillHeld.goal).toBe(held.goal);
  expect(stillHeld.target).toBe(held.target);
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
test("memory menu adds true and false hints and deletes individual or all memories", async ({
  page,
}) => {
  await page.goto("/my-game/pet.html");
  await page.locator("#open-memory").click();
  await expect(page.locator("#memory-menu")).toBeVisible();
  expect((await page.evaluate(() => petState())).paused).toBe(true);
  await page.locator("#memory-place").selectOption("main-food");
  await page.locator("#memory-belief").selectOption("no");
  await expect(page.locator("#memory-truth")).toContainText("Ложная");
  await page.getByRole("button", { name: "Записать воспоминание" }).click();
  expect(
    (await page.evaluate(() => petState())).memory["main-food"].present,
  ).toBe(false);
  await page.locator("#memory-kind").selectOption("water");
  await page.locator("#memory-place").selectOption("new");
  await page.locator("#memory-x").fill("450");
  await page.locator("#memory-belief").selectOption("yes");
  await page.getByRole("button", { name: "Записать воспоминание" }).click();
  expect(
    Object.keys((await page.evaluate(() => petState())).memory),
  ).toHaveLength(2);
  await page.screenshot({ path: "/tmp/pet-memory.png" });
  await page
    .getByRole("button", { name: "Удалить воспоминание: место 450" })
    .click();
  expect(
    Object.keys((await page.evaluate(() => petState())).memory),
  ).toHaveLength(1);
  await page.locator("#forget-all").click();
  expect(
    Object.keys((await page.evaluate(() => petState())).memory),
  ).toHaveLength(0);
  await page.locator("#close-memory").click();
  await page.waitForFunction(() => !petState().paused);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#open-memory").click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "/tmp/pet-memory-mobile.png" });
});
test("hamster writes its own memory without editing and the player can change it", async ({
  page,
}) => {
  await page.goto("/my-game/pet.html");
  await page.waitForFunction(
    () =>
      window.petState &&
      petState().memory.drops &&
      !petState().memory.drops.injected,
    null,
    { timeout: 15000 },
  );
  await page.locator("#open-memory").click();
  await expect(page.locator("#memory-list")).toContainText("Сам узнал");
  await page
    .getByRole("button", { name: "Изменить воспоминание: капли у стенки" })
    .click();
  await expect(page.locator("#memory-place")).toHaveValue("drops");
  await page.locator("#memory-belief").selectOption("no");
  await page.getByRole("button", { name: "Записать воспоминание" }).click();
  expect((await page.evaluate(() => petState())).memory.drops.injected).toBe(
    true,
  );
  expect((await page.evaluate(() => petState())).memory.drops.present).toBe(
    false,
  );
});
