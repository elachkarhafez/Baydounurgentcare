import { expect, type Page } from "@playwright/test";

export async function fresh(page: Page) {
  await page.addInitScript(() => { try { sessionStorage.setItem("mh-intro", "1"); } catch {} });
}
export async function resetStore(page: Page) {
  await page.goto("/");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem("mh-intro", "1"); });
}
export const prices = async (page: Page) =>
  (await page.locator("article[data-listing] p.font-display").allTextContents()).map((t) => +t.replace(/[^\d]/g, ""));

/** Walk the showing wizard with a real file upload. Returns the reference code. */
export async function submitRequest(page: Page, listingId: string, opts: { file?: { name: string; mimeType: string; buffer: Buffer } } = {}) {
  await page.goto(`/homes/${listingId}`);
  await page.getByRole("button", { name: "Request a Showing" }).first().click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByText("Request a showing")).toBeVisible();
  await dlg.getByRole("button", { name: "Continue" }).click(); // property -> date
  // pick the first enabled day that has a free slot
  const days = dlg.locator("[data-slot=calendar] button[data-day]:not([disabled])");
  await days.first().waitFor();
  const n = await days.count();
  for (let i = 1; i < n; i++) {
    await days.nth(i).click();
    const free = dlg.locator('[role=radio][id^="t1-"]:not([disabled])');
    if (await free.count()) { await free.first().click(); break; }
  }
  await dlg.getByRole("button", { name: "Continue" }).click();
  await dlg.getByLabel("First name").fill("Test");
  await dlg.getByLabel("Last name").fill("Buyer");
  await dlg.getByLabel("Email").fill(`test.buyer.${Date.now()}@example.com`);
  await dlg.getByLabel("Phone").fill("3135550177");
  await dlg.getByRole("radio", { name: "Ready to purchase" }).click();
  await dlg.getByRole("radio", { name: "Pre-approved", exact: true }).click();
  await dlg.getByLabel(/Notes for Mike/).fill("Automated test request");
  await dlg.getByRole("button", { name: "Continue" }).click();
  if (opts.file) {
    await dlg.getByTestId("file-input").setInputFiles(opts.file);
    await expect(dlg.getByTestId("doc-selected")).toBeVisible();
  } else {
    await dlg.getByRole("button", { name: "Skip for now" }).click();
  }
  if (opts.file) await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg.getByTestId("review")).toBeVisible();
  await dlg.getByRole("button", { name: "Submit Showing Request" }).click();
  await expect(dlg.getByTestId("success")).toBeVisible();
  return (await dlg.getByTestId("ref").textContent())!.trim();
}
