import { createState, PROJECTS, circuit } from "../../src/salvage/model.js";
import { test, expect } from "@playwright/test";
test.setTimeout(180000);
test.use({ viewport: { width: 1000, height: 720 } });
test("new outdoor game walks, searches real piles and builds through manual wiring", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/my-game/salvage.html");
  await page.waitForFunction(() => window.salvageState);
  await page.locator("#start-light").click();
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => salvageState().position[2] < 6.8, null, {
    timeout: 15000,
  });
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await expect(page.locator("#panel")).toBeVisible();
  await expect(page.locator("#launch")).toBeDisabled();
  await expect(page.locator("#projects")).toContainText("Квадрокоптер");
  await page.locator("#close").click();
  await page.keyboard.down("KeyW");
  // Walk around the physical workbench.
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => salvageState().position[0] > 4, null, {
    timeout: 15000,
  });
  await page.keyboard.up("KeyD");
  await page.keyboard.up("KeyW");
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => salvageState().position[2] < -16, null, {
    timeout: 30000,
  });
  await page.keyboard.up("KeyW");
  await page.waitForFunction(() => salvageState().nearest !== null);
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => salvageState().searched.length === 1);
  await page.screenshot({ path: "/tmp/salvage-yard.png" });
  await page.keyboard.press("Escape");
  // Seed a saved collection to exercise crafting without hundreds of searches.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("salvage-workshop-v1"));
    Object.keys(s.inventory).forEach((k) => (s.inventory[k] = 30));
    localStorage.setItem("salvage-workshop-v1", JSON.stringify(s));
  });
  await page.reload();
  await page.waitForFunction(() => window.salvageState);
  await page.locator("#start-light").click();
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => salvageState().position[2] < 6.8, null, {
    timeout: 15000,
  });
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await page
    .getByRole("button", { name: "Машинка с камерой", exact: true })
    .click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Установить", exact: true })
      .first()
      .click();
  await page.locator('[data-port="bat+"]').click();
  await page.locator('[data-port="pwr-"]').click();
  await expect(page.locator("#launch")).toBeDisabled();
  await page.getByRole("button", { name: "Снять bat+ → pwr-" }).click();
  for (const [a, b] of [
    ["bat+", "pwr+"],
    ["bat-", "pwr-"],
    ["out1", "motor1"],
    ["out2", "motor2"],
    ["video", "cam"],
  ]) {
    await page.locator('[data-port="' + a + '"]').click();
    await page.locator('[data-port="' + b + '"]').click();
  }
  await expect(page.locator("#launch")).toBeEnabled();
  await page.screenshot({ path: "/tmp/salvage-wiring.png" });
  await page.locator("#rover-target").selectOption("pipe");
  await page.locator("#launch").click();
  await page.waitForFunction(
    () => salvageState().cargo === "pipe",
    {},
    { timeout: 45000 },
  );
  await page.waitForFunction(
    () => salvageState().flight === null,
    {},
    { timeout: 45000 },
  );
  await page.screenshot({ path: "/tmp/salvage-rover.png" });
  await page.keyboard.press("KeyE");
  await page.locator("#unload").click();
  expect((await page.evaluate(() => salvageState())).cargo).toBeNull();
  expect(errors).toEqual([]);
});

for (const type of ["rocket", "drone"])
  test(type + " flight starts after verified assembly", async ({ page }) => {
    const fixture = createState();
    fixture.type = type;
    fixture.builds[type] = {
      parts: PROJECTS[type].slots.map((r) => r[0]),
      wires: circuit(type).map((n) => [n[0], n[1]]),
    };
    await page.addInitScript(
      (s) => localStorage.setItem("salvage-workshop-v1", JSON.stringify(s)),
      fixture,
    );
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/my-game/salvage.html");
    await page.locator("#start-light").click();
    await page.keyboard.down("KeyW");
    await page.waitForFunction(() => salvageState().position[2] < 6.8);
    await page.keyboard.up("KeyW");
    await page.keyboard.press("KeyE");
    await expect(page.locator("#launch")).toBeEnabled();
    await page.locator("#launch").click();
    await page.waitForFunction(() => salvageState().flight?.t > 1);
    expect(
      (await page.evaluate(() => salvageState())).vehiclePosition[1],
    ).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });
