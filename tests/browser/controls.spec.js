import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 1000, height: 700 } });
async function start(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/my-game/");
  await page.waitForFunction(() => window.simulatorState);
  await page.locator("#start").click();
  return errors;
}
async function frames(page, count = 3) {
  await page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame);
  }, count);
}
test("WASD and arrows stop on release, with no drift or resurrection from repeats", async ({
  page,
}) => {
  const errors = await start(page);
  for (const key of [
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowLeft",
    "ArrowDown",
    "ArrowRight",
  ]) {
    const before = await page.evaluate(() => simulatorState().position);
    await page.keyboard.down(key);
    await page.waitForFunction((p) => {
      const q = simulatorState().position;
      return Math.hypot(q[0] - p[0], q[2] - p[2]) > 0.12;
    }, before);
    await page.keyboard.up(key);
    await frames(page, 1);
    const stopped = await page.evaluate(() => simulatorState().position);
    await page.evaluate(
      (code) =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", { code, repeat: true, bubbles: true }),
        ),
      key,
    );
    await frames(page);
    expect(await page.evaluate(() => simulatorState().position)).toEqual(
      stopped,
    );
  }
  expect(errors).toEqual([]);
  await page.screenshot({ path: "/tmp/hamster-improved.png" });
  console.log(
    "Scene draw calls:",
    await page.evaluate(() => simulatorState().renderCalls),
  );
});
test("diagonal movement, blur, resume and camera drag do not leave keys pressed", async ({
  page,
}) => {
  const errors = await start(page);
  await page.keyboard.down("KeyW");
  await page.keyboard.down("KeyD");
  await page.waitForFunction(
    () => simulatorState().input.x > 0 && simulatorState().input.z < 0,
  );
  await page.keyboard.up("KeyW");
  expect(await page.evaluate(() => simulatorState().input)).toEqual({
    x: 1,
    z: 0,
  });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  expect(await page.evaluate(() => simulatorState().paused)).toBe(true);
  await page.keyboard.up("KeyD");
  await page.locator("#start").click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyD",
        repeat: true,
        bubbles: true,
      }),
    ),
  );
  await frames(page);
  expect(await page.evaluate(() => simulatorState().input)).toEqual({
    x: 0,
    z: 0,
  });
  const before = await page.evaluate(() => simulatorState().position);
  await page.mouse.move(450, 300);
  await page.mouse.down();
  await page.mouse.move(650, 320, { steps: 5 });
  await page.mouse.up();
  await frames(page);
  expect(await page.evaluate(() => simulatorState().position)).toEqual(before);
  expect(errors).toEqual([]);
});
test("touch buttons stop when pointer capture is lost or cancelled", async ({
  page,
}) => {
  const errors = await start(page);
  await page.addStyleTag({ content: "#mobile { display:flex !important }" });
  const button = page.locator('[data-key="KeyW"]');
  await button.evaluate((b) =>
    b.addEventListener(
      "pointerdown",
      (e) => (b.dataset.pointerId = e.pointerId),
    ),
  );
  const rect = await button.boundingBox();
  await page.mouse.move(rect.x + 20, rect.y + 20);
  await page.mouse.down();
  await page.waitForFunction(() => simulatorState().input.z === -1);
  await button.evaluate((b) =>
    b.releasePointerCapture(Number(b.dataset.pointerId)),
  );
  await page.mouse.move(rect.x + 21, rect.y + 21);
  await page.waitForFunction(() => simulatorState().input.z === 0);
  await page.mouse.up();
  await page.mouse.down();
  await page.waitForFunction(() => simulatorState().input.z === -1);
  await button.evaluate((b) =>
    b.dispatchEvent(
      new PointerEvent("pointercancel", {
        pointerId: Number(b.dataset.pointerId),
        bubbles: true,
      }),
    ),
  );
  await page.waitForFunction(() => simulatorState().input.z === 0);
  await page.mouse.up();
  expect(errors).toEqual([]);
});

test("graphics quality can be chosen and remembered", async ({ page }) => {
  const errors = await start(page);
  await page.locator("#quality").click();
  expect(await page.evaluate(() => simulatorState().qualityMode)).toBe("high");
  await frames(page, 2);
  await page.screenshot({ path: "/tmp/hamster-high-quality.png" });
  await page.locator("#quality").click();
  expect(await page.evaluate(() => simulatorState().qualityMode)).toBe("fast");
  await page.reload();
  await page.waitForFunction(() => window.simulatorState);
  expect(await page.evaluate(() => simulatorState().qualityMode)).toBe("fast");
  expect(errors).toEqual([]);
});

test("a saved position overlapping a wall can move out normally", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "hamster-life-v1",
      JSON.stringify({
        position: [4, 0, -1.62],
        needs: {
          health: 100,
          food: 100,
          water: 100,
          stamina: 100,
          capacity: 100,
        },
        worldTime: 0,
      }),
    ),
  );
  const errors = await start(page);
  await page.waitForFunction(() => simulatorState().position[2] > -1.47);
  await page.keyboard.down("KeyS");
  await page.waitForFunction(() => simulatorState().position[2] > -0.5);
  await page.keyboard.up("KeyS");
  await frames(page, 1);
  const stopped = await page.evaluate(() => simulatorState().position);
  await frames(page);
  expect(await page.evaluate(() => simulatorState().position)).toEqual(stopped);
  expect(errors).toEqual([]);
});
