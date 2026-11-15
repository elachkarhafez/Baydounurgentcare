import { test, expect } from "@playwright/test";
import { fresh, openCard, pickTime, resetStore, tourButton } from "./helpers";

test.beforeEach(async ({ page }) => { await fresh(page); await resetStore(page); });

test("20. mobile search, filters, listing and tour request", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await expect(page.getByRole("navigation", { name: "Tabs" })).toBeVisible();
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("radio", { name: "3+" }).first().click();
  await page.getByRole("button", { name: /Show \d+ homes/ }).click();
  await expect(page).toHaveURL(/beds=3/);
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.locator(".mh-pin:visible").first()).toBeVisible();
  await page.getByRole("button", { name: "List" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await openCard(page.locator("article[data-listing]").first());
  await expect(page).toHaveURL(/\/homes\/MH-/);
  const btn = tourButton(page);
  const box = (await btn.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await btn.click();
  const dlg = page.getByRole("dialog");
  await pickTime(dlg);
  await dlg.getByRole("button", { name: "Next" }).click();
  await dlg.getByLabel("First name").fill("Sam"); await dlg.getByLabel("Last name").fill("Phone");
  await dlg.getByLabel("Email").fill("sam.phone@example.com"); await dlg.getByLabel("Phone").fill("3135550190");
  await dlg.getByRole("radio", { name: "Pre-approved", exact: true }).click();
  await dlg.getByRole("button", { name: "Request tour" }).click();
  await expect(dlg.getByTestId("success")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("Welcome back, Mike.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.goto("/dashboard/calendar");
  await expect(page.getByRole("tab", { name: "day", selected: true })).toBeVisible();
});

test("guided demo works on a phone, every Next button reachable", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("run-demo").click();
  const card = page.locator("[data-tour-overlay] [role=dialog]");
  for (let i = 0; i < 12; i++) {
    await expect(card).toBeVisible();
    if (i === 6) await expect(page.getByText("All steps complete")).toBeVisible({ timeout: 15000 });
    const next = card.locator("[data-tour-next]");
    await next.scrollIntoViewIfNeeded();
    const box = await next.boundingBox();
    const vh = page.viewportSize()!.height;
    expect(box!.y + box!.height, `step ${i + 1} Next button on screen`).toBeLessThanOrEqual(vh);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await next.click();
  }
  await expect(card).toHaveCount(0);
});
