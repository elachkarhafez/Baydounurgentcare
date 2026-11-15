import { test, expect } from "@playwright/test";
import { fresh, openCard, prices, resetStore, tourButton } from "./helpers";

test.beforeEach(async ({ page }) => { await fresh(page); });

test("1. homepage opens on the map and list search", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("homes for sale");
  await expect(page.getByLabel(/Search by city/)).toBeVisible();
  await expect(page.getByTestId("result-count")).toHaveText("30");
  await expect(page.locator(".mh-pin").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("search from the homepage", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/Search by city/).fill("Canton");
  await expect(page).toHaveURL(/q=Canton/);
  await expect(page.getByTestId("result-count")).toHaveText("3");
});

test("2. search returns matching properties", async ({ page }) => {
  await page.goto("/homes");
  await expect(page.getByTestId("result-count")).toHaveText("30");
  await page.getByLabel(/Search by city/).fill("48124");
  await expect(page.getByTestId("result-count")).toHaveText("2");
  await expect(page.locator("article[data-listing]")).toHaveCount(2);
  for (const t of await page.locator("article[data-listing]").allTextContents()) expect(t).toContain("48124");
  await page.getByLabel(/Search by city/).fill("zzzz-nowhere");
  await expect(page.getByText("No homes match those filters")).toBeVisible();
});

test("3. multiple filters combine and clear", async ({ page }) => {
  await page.goto("/homes?q=Dearborn&beds=4&max=600000");
  const cards = page.locator("article[data-listing]");
  await expect(cards.first()).toBeVisible();
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(30);
  for (const t of await cards.allTextContents()) {
    expect(t).toMatch(/Dearborn/);
    expect(+(t.match(/(\d) bd/)![1])).toBeGreaterThanOrEqual(4);
  }
  for (const p of await prices(page)) expect(p).toBeLessThanOrEqual(600000);
  await page.getByRole("button", { name: "Clear all filters" }).first().click();
  await expect(page.getByTestId("result-count")).toHaveText("30");
  await page.goto("/homes?type=Condo,Townhouse");
  await expect(page.getByTestId("result-count")).toHaveText("3");
  await page.goto("/homes?open=1");
  for (const t of await page.locator("article[data-listing]").allTextContents()) expect(t).toContain("Open");
  await page.goto("/homes?status=Pending");
  await expect(page.getByTestId("result-count")).toHaveText("2");
});

test("4. sorting works", async ({ page }) => {
  await page.goto("/homes?sort=price_asc");
  const asc = await prices(page);
  expect(asc).toEqual([...asc].sort((a, b) => a - b));
  await page.goto("/homes?sort=price_desc");
  const desc = await prices(page);
  expect(desc).toEqual([...desc].sort((a, b) => b - a));
  await page.getByLabel("Sort results").click();
  await page.getByRole("option", { name: "Lowest price" }).click();
  await expect(page).toHaveURL(/sort=price_asc/);
});

test("favorites", async ({ page }) => {
  await resetStore(page);
  await page.goto("/homes");
  await page.locator("article[data-listing]").first().getByRole("button", { name: "Save this home" }).click();
  await page.goto("/homes?saved=1");
  await expect(page.getByTestId("result-count")).toHaveText("3"); // 2 seeded + 1
});

test("map toggles and marker highlights a listing", async ({ page }) => {
  await page.goto("/homes?map=1");
  const pin = page.locator(".mh-pin").first();
  await expect(pin).toBeVisible();
  const id = await pin.getAttribute("data-pin");
  await pin.dispatchEvent("click");
  await expect(page.locator(`#card-${id}`)).toHaveClass(/ring-gold/);
});

test("5. property cards navigate to detail; 6. gallery; 7. mortgage calculator", async ({ page }) => {
  await page.goto("/homes?sort=price_asc");
  const card = page.locator("article[data-listing]").first();
  const id = await card.getAttribute("data-listing");
  await openCard(card);
  await expect(page).toHaveURL(new RegExp(`/homes/${id}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(tourButton(page)).toContainText("Request a tour");
  await page.getByRole("button", { name: "See all 6 photos" }).click();
  await expect(page.getByText(/1 \/ 6 ·/)).toBeVisible();
  await page.getByRole("button", { name: "Next photo" }).click();
  await expect(page.getByText(/2 \/ 6 ·/)).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/3 \/ 6 ·/)).toBeVisible();
  await page.getByRole("button", { name: "Close gallery" }).click();
  const pay = page.getByTestId("monthly-payment");
  const before = await pay.textContent();
  await page.getByText("Customize estimate").click();
  await page.getByLabel("Interest rate").fill("9");
  await expect(pay).not.toHaveText(before!);
  const after9 = +(await pay.textContent())!.replace(/[^\d]/g, "");
  await page.getByLabel("Interest rate").fill("3");
  const after3 = +(await pay.textContent())!.replace(/[^\d]/g, "");
  expect(after3).toBeLessThan(after9);
  await page.getByLabel("Loan term").click();
  await page.getByRole("option", { name: "15-year fixed" }).click();
  expect(+(await pay.textContent())!.replace(/[^\d]/g, "")).toBeGreaterThan(after3);
});

test("mortgage math matches the amortization formula", async ({ page }) => {
  await page.goto("/homes/MH-24002");
  await page.getByText("Customize estimate").click();
  await page.getByLabel("Property tax (per year)").fill("0");
  await page.getByLabel("Home insurance (per year)").fill("0");
  await expect(page.getByTestId("monthly-payment")).toHaveText("$1,357");
});

test("contact Mike creates a lead", async ({ page }) => {
  await resetStore(page);
  await page.goto("/homes/MH-24003");
  await page.locator('button[aria-label="Contact Mike"]:visible').first().click();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Enter your name")).toBeVisible();
  await page.getByLabel("Name").fill("Quinn Sample");
  await page.getByLabel("Email").fill("quinn.sample@example.com");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Message sent to Mike")).toBeVisible();
  await page.goto("/dashboard/leads");
  await expect(page.getByText("Quinn Sample").first()).toBeVisible();
});

test("unknown listing and routes show the 404 page", async ({ page }) => {
  const r = await page.goto("/homes/MH-99999");
  expect(r?.status()).toBe(404);
  await expect(page.getByText("This door doesn't open.")).toBeVisible();
  const r2 = await page.goto("/nope");
  expect(r2?.status()).toBe(404);
});
