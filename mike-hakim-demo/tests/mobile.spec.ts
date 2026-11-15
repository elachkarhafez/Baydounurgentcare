import { test, expect } from "@playwright/test";
import { fresh, resetStore } from "./helpers";

test.beforeEach(async ({ page }) => { await fresh(page); await resetStore(page); });

test("20. mobile navigation, filter drawer and showing form", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Find a Home" }).click();
  await expect(page).toHaveURL(/\/homes/);
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByRole("radio", { name: "3+" }).first().click();
  await page.getByRole("button", { name: /Show \d+ homes/ }).click();
  await expect(page).toHaveURL(/beds=3/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.locator("article[data-listing] a").first().click();
  await page.getByRole("button", { name: "Request a Showing" }).last().click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  const box = await dlg.boundingBox();
  expect(box!.width).toBeGreaterThan(380);
  await dlg.getByRole("button", { name: "Fill with sample details" }).click();
  for (let i = 0; i < 4; i++) await dlg.getByRole("button", { name: "Continue" }).click();
  await dlg.getByRole("button", { name: "Submit Showing Request" }).click();
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
