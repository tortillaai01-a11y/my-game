import { test, expect } from "@playwright/test";
test.setTimeout(120000);
test.use({ viewport: { width: 900, height: 650 } });
test("detailed graphics render without WebGL errors and quality can be reduced", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript(() =>
    localStorage.setItem("hamster-graphics", "high"),
  );
  await page.goto("/my-game/");
  await page.waitForFunction(() => window.simulatorState);
  await page.locator("#start").click();
  await page.waitForFunction(() => simulatorState().qualityMode === "high");
  await page.mouse.move(550, 330);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/hamster-realistic.png" });
  await page.locator("#quality").click();
  await page.waitForFunction(() => simulatorState().qualityMode === "fast");
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => simulatorState().position[2] < 3.7);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyB");
  await page.waitForFunction(() => simulatorState().burrowing);
  await page.waitForFunction(() => simulatorState().position[1] < -1);
  await page.screenshot({ path: "/tmp/hamster-realistic-tunnel.png" });
  expect(errors).toEqual([]);
});
