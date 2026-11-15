import { expect, type Locator, type Page } from "@playwright/test";

export async function fresh(page: Page) {
  await page.addInitScript(() => { try { sessionStorage.setItem("mh-intro", "1"); } catch {} });
}
export async function resetStore(page: Page) {
  await page.goto("/");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem("mh-intro", "1"); });
}
export const prices = async (page: Page) =>
  (await page.locator("article[data-listing] p.tabular").allTextContents()).map((t) => +t.replace(/[^\d]/g, ""));

/** Click a listing card in its text area (photos are swipeable). */
export async function openCard(card: Locator) {
  const link = card.getByRole("link", { name: /\$/ });
  const box = (await link.boundingBox())!;
  await link.click({ position: { x: 24, y: box.height - 20 } });
}

export const tourButton = (page: Page) => page.locator("[data-tour=request-showing]:visible").first();

/** Pick the first open day and time in the tour dialog. */
export async function pickTime(dlg: Locator) {
  await dlg.locator('[id^="d1-day-"]').first().click();
  await dlg.locator('[role=radio][id^="t1-"]:not([disabled])').first().click();
}

export async function submitRequest(page: Page, listingId: string, opts: { file?: { name: string; mimeType: string; buffer: Buffer } } = {}) {
  await page.goto(`/homes/${listingId}`);
  await tourButton(page).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByText("Choose a day")).toBeVisible();
  await pickTime(dlg);
  await dlg.getByRole("button", { name: "Next" }).click();
  await dlg.getByLabel("First name").fill("Test");
  await dlg.getByLabel("Last name").fill("Buyer");
  await dlg.getByLabel("Email").fill(`test.buyer.${Date.now()}@example.com`);
  await dlg.getByLabel("Phone").fill("3135550177");
  await dlg.getByRole("radio", { name: "Pre-approved", exact: true }).click();
  await dlg.getByRole("button", { name: "Add a message" }).click();
  await dlg.getByLabel("Message (optional)").fill("Automated test request");
  if (opts.file) {
    await dlg.getByTestId("file-input").setInputFiles(opts.file);
    await expect(dlg.getByTestId("doc-selected")).toBeVisible();
  }
  await dlg.getByRole("button", { name: "Request tour" }).click();
  await expect(dlg.getByTestId("success")).toBeVisible();
  return (await dlg.getByTestId("ref").textContent())!.trim();
}
