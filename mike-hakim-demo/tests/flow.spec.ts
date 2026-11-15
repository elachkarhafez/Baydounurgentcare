import { test, expect } from "@playwright/test";
import { fresh, resetStore, submitRequest } from "./helpers";

test.beforeEach(async ({ page }) => { await fresh(page); await resetStore(page); });

const MARKER = "SECRET-PREAPPROVAL-BYTES-7f3a";
const pdf = () => ({ name: "sample-letter.pdf", mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n${MARKER}\n%%EOF\n`) });

test("8-10. date/time selection, validation and file checks", async ({ page }) => {
  await page.goto("/homes/MH-24005");
  await page.getByRole("button", { name: "Request a Showing" }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("button", { name: "Continue" }).click();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg.getByText("Pick a date for the showing")).toBeVisible();
  // past days are disabled
  await expect(dlg.locator("[data-slot=calendar] button[data-day][disabled]").first()).toBeAttached();
  const days = dlg.locator("[data-slot=calendar] button[data-day]:not([disabled])");
  await days.nth(1).click();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg.getByText("Pick a time slot")).toBeVisible();
  await dlg.locator('[role=radio][id^="t1-"]:not([disabled])').first().click();
  await expect(dlg.getByText(/Detroit time/)).toBeVisible();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await dlg.getByRole("button", { name: "Continue" }).click();
  for (const m of ["Enter your first name", "Enter your last name", "Enter your email", "Enter a 10-digit phone number", "Choose where you are in your search", "Choose your financing status"]) await expect(dlg.getByText(m)).toBeVisible();
  await dlg.getByLabel("Email").fill("not-an-email");
  await dlg.getByLabel("Email").blur();
  await expect(dlg.getByText("That email doesn't look right")).toBeVisible();
  await dlg.getByLabel("First name").fill("A"); await dlg.getByLabel("Last name").fill("B");
  await dlg.getByLabel("Email").fill("a.b@example.com"); await dlg.getByLabel("Phone").fill("313 555 0101");
  await dlg.getByRole("radio", { name: "Just exploring" }).click(); await dlg.getByRole("radio", { name: "Cash buyer" }).click();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg.getByText("Demo only — please use a sample document, not your actual pre-approval letter.")).toBeVisible();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg.getByText("Attach a sample document or choose Skip for now")).toBeVisible();
  await dlg.getByTestId("file-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(dlg.getByText("That file type isn't supported. Use a PDF, JPG or PNG.")).toBeVisible();
  await dlg.getByTestId("file-input").setInputFiles({ name: "huge.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(11 * 1024 * 1024, 1) });
  await expect(dlg.getByText(/The limit is 10 MB/)).toBeVisible();
  await dlg.getByTestId("file-input").setInputFiles({ name: "scan.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]) });
  await expect(dlg.getByTestId("doc-selected")).toContainText("scan.png");
  await expect(dlg.getByTestId("doc-selected")).toContainText("PNG");
  await dlg.getByRole("button", { name: "Remove document" }).click();
  await expect(dlg.getByTestId("doc-selected")).toHaveCount(0);
  await dlg.getByRole("button", { name: "Skip for now" }).click();
  await expect(dlg.getByTestId("review")).toContainText("Skipped");
});

test("11-18. full journey: submit, automation, email, CRM, calendar, dashboard, persistence", async ({ page }) => {
  await page.goto("/dashboard");
  const newBefore = +(await page.getByTestId("metric-1").textContent())!;
  const totalBefore = +(await page.getByTestId("metric-0").textContent())!;

  const ref = await submitRequest(page, "MH-24001", { file: pdf() });
  expect(ref).toMatch(/^SR-[A-Z0-9]{6}$/);

  // 11. file bytes never persisted (only metadata)
  const dump = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
  expect(dump).not.toContain(MARKER);
  expect(dump).toContain("sample-letter.pdf");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("mh-demo")!));
  const sh = stored.showings.find((s: { ref: string }) => s.ref === ref);
  expect(sh.document).toEqual({ name: "sample-letter.pdf", type: "PDF", size: expect.any(Number) });
  expect(Object.keys(sh.document)).toEqual(["name", "type", "size"]);

  // 13. automation completes
  await page.getByRole("link", { name: "View the automation" }).click();
  await expect(page).toHaveURL(new RegExp(`/requests/${ref}`));
  await expect(page.getByText("All steps complete")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("[data-step][data-status=done]")).toHaveCount(5);
  await expect(page.getByText("Email notification generated (Demo)")).toBeVisible();

  // 14. email preview metadata
  const email = page.getByTestId("email-preview");
  await expect(email.getByText("Simulated Email — Not Sent")).toBeVisible();
  await expect(email.getByTestId("email-subject")).toHaveText("New Showing Request — 4182 Larkmoor Ct");
  await expect(email).toContainText("Test Buyer");
  await expect(email).toContainText("(313) 555-0177");
  await expect(email).toContainText("Pre-approved");
  await expect(email).toContainText("sample-letter.pdf");
  await expect(email).toContainText("Automated test request");

  // 15. CRM lead
  await page.getByRole("link", { name: "Open the CRM lead" }).click();
  const sheet = page.locator("[data-tour=lead-detail]");
  await expect(sheet.getByText("Test Buyer").first()).toBeVisible();
  await expect(sheet.getByText("Showing Requested").first()).toBeVisible();
  await expect(sheet).toContainText("4182 Larkmoor Ct");
  await expect(sheet).toContainText("metadata only");
  await sheet.getByLabel("New note").fill("Called, prefers evenings");
  await sheet.getByRole("button", { name: "Add note" }).click();
  await expect(sheet.getByText("Called, prefers evenings")).toBeVisible();
  await sheet.getByTestId("stage-select").click();
  await page.getByRole("option", { name: "Contacted" }).click();
  await expect(sheet.getByText("Contacted").first()).toBeVisible();
  await page.keyboard.press("Escape");

  // 17. dashboard counts
  await page.goto("/dashboard");
  await expect(page.getByTestId("metric-1")).toHaveText(String(newBefore + 1));
  await expect(page.getByTestId("metric-0")).toHaveText(String(totalBefore + 1));
  await expect(page.getByTestId("activity")).toContainText("Test Buyer requested a showing");

  // 16. calendar shows tentative showing
  const ev = stored.showings && (await page.evaluate((r) => { const s = JSON.parse(localStorage.getItem("mh-demo")!); const sh = s.showings.find((x: { ref: string }) => x.ref === r); return s.events.find((e: { showingId: string }) => e.showingId === sh.id); }, ref));
  expect(ev.status).toBe("tentative");
  expect(ev.title).toBe("Showing Requested: 4182 Larkmoor Ct");
  await page.goto(`/dashboard/calendar?event=${ev.id}`);
  const evDlg = page.locator("[data-tour=event-detail]");
  await expect(evDlg.getByText("Showing Requested: 4182 Larkmoor Ct")).toBeVisible();
  await expect(evDlg.getByText("Tentative", { exact: true })).toBeVisible();

  // calendar confirm updates the request (18. persists across reload)
  await evDlg.getByRole("button", { name: "Confirm" }).click();
  await expect(evDlg.getByText("Confirmed", { exact: true }).first()).toBeVisible();
  await page.reload();
  const after = await page.evaluate((r) => JSON.parse(localStorage.getItem("mh-demo")!).showings.find((x: { ref: string }) => x.ref === r).status, ref);
  expect(after).toBe("confirmed");
  await page.goto("/dashboard/showings?status=confirmed");
  await expect(page.locator(`[data-showing]`).filter({ hasText: "4182 Larkmoor Ct" }).first()).toBeVisible();

  // reschedule then cancel from the showings page
  const row = page.locator("[data-showing]").filter({ hasText: ref });
  await row.getByRole("button", { name: "Reschedule" }).click();
  const rs = page.getByRole("dialog");
  await rs.locator("[data-slot=calendar] button[data-day]:not([disabled])").nth(3).click();
  await rs.locator('[role=radio][id^="rs-"]:not([disabled])').first().click();
  await rs.getByRole("button", { name: "Save new time" }).click();
  await page.goto("/dashboard/showings?status=rescheduled");
  await expect(page.locator("[data-showing]").filter({ hasText: ref })).toBeVisible();
  await page.locator("[data-showing]").filter({ hasText: ref }).getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Cancel showing" }).click();
  await page.reload();
  const ev2 = await page.evaluate((r) => { const s = JSON.parse(localStorage.getItem("mh-demo")!); const sh = s.showings.find((x: { ref: string }) => x.ref === r); return [sh.status, s.events.find((e: { showingId: string }) => e.showingId === sh.id).status]; }, ref);
  expect(ev2).toEqual(["cancelled", "cancelled"]);

  // automations log + email list
  await page.goto("/dashboard/automations");
  await page.getByRole("tab", { name: "Email previews" }).click();
  await expect(page.getByText("New Showing Request — 4182 Larkmoor Ct").first()).toBeVisible();
  await page.getByRole("tab", { name: "CRM sync log" }).click();
  await expect(page.getByText(/Lead Test Buyer created/).first()).toBeVisible();
});

test("pipeline moves a lead between stages", async ({ page }) => {
  await page.goto("/dashboard/leads?view=pipeline");
  const card = page.locator("[data-stage=new]").getByText("Emily Kowalczyk");
  await expect(card).toBeVisible();
  await page.getByLabel("Move Emily Kowalczyk").click();
  await page.getByRole("option", { name: "Contacted" }).click();
  await expect(page.locator("[data-stage=contacted]").getByText("Emily Kowalczyk")).toBeVisible();
  await page.reload();
  await expect(page.locator("[data-stage=contacted]").getByText("Emily Kowalczyk")).toBeVisible();
});

test("leads search and filter", async ({ page }) => {
  await page.goto("/dashboard/leads");
  await page.getByLabel("Search leads").fill("haddadin");
  await expect(page.locator("tr[data-lead]")).toHaveCount(1);
  await page.getByLabel("Search leads").fill("");
  await page.goto("/dashboard/leads?stage=follow_up");
  await expect(page.locator("tr[data-lead]")).toHaveCount(2);
});

test("calendar month/week/day views and integrations simulation", async ({ page }) => {
  await page.goto("/dashboard/calendar");
  await expect(page.locator("[data-event]").first()).toBeVisible();
  await page.getByRole("tab", { name: "week" }).click();
  await page.getByRole("tab", { name: "day" }).click();
  await page.getByRole("tab", { name: "month" }).click();
  await page.goto("/dashboard/settings");
  await expect(page.getByText("Demo Simulation Active").first()).toBeVisible();
  await expect(page.getByText(/^Connected$/)).toHaveCount(0);
  await page.locator("[data-integration=email]").getByRole("button", { name: "Simulate Integration" }).click();
  await expect(page.getByTestId("email-preview")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("[data-integration=crm]").getByRole("button", { name: "Simulate Integration" }).click();
  await expect(page.getByText("Test CRM sync logged (simulated)")).toBeVisible();
});

test("19. Reset Demo restores seed data", async ({ page }) => {
  const ref = await submitRequest(page, "MH-24010");
  await page.goto("/dashboard/settings");
  await page.getByTestId("reset-demo").click();
  await page.getByRole("button", { name: "Reset Demo" }).last().click();
  await expect(page.getByText("Demo reset to the original sample data")).toBeVisible();
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("mh-demo")!));
  expect(s.showings.some((x: { ref: string }) => x.ref === ref)).toBe(false);
  expect(s.leads).toHaveLength(12);
  expect(s.showings).toHaveLength(8);
  expect(s.events.length).toBeGreaterThanOrEqual(10);
  await page.goto(`/requests/${ref}`);
  await expect(page.getByText("Request not found")).toBeVisible();
});

test("storage unavailable does not crash the app", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dashboard");
  await expect(page.getByText("Welcome back, Mike.")).toBeVisible();
  await page.goto("/dashboard/settings");
  await expect(page.getByText(/memory, storage is blocked/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("guided demo tour runs all 10 steps end to end", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Take the Demo Tour" }).first().click();
  const card = page.locator("[data-tour-overlay] [role=dialog]");
  const titles = ["Search the way buyers already do", "MLS-style filters", "A full listing page", "Request a showing", "Attach a pre-approval letter", "Review and submit", "Watch the automation run", "Mike's dashboard", "The new lead, ready to work", "Tentative on the calendar"];
  for (let i = 0; i < titles.length; i++) {
    await expect(card.getByRole("heading", { name: titles[i] })).toBeVisible();
    if (i === 4) await expect(page.getByTestId("doc-selected")).toContainText("sample-preapproval-letter.pdf");
    if (i === 6) await expect(page.getByText("All steps complete")).toBeVisible({ timeout: 15000 });
    if (i === 8) await expect(page.locator("[data-tour=lead-detail]").getByText("Alex Morgan").first()).toBeVisible();
    if (i === 9) { await expect(page.locator("[data-tour=event-detail]")).toContainText("4182 Larkmoor Ct"); }
    await card.locator("[data-tour-next]").click();
  }
  await expect(card).toHaveCount(0);
});

test("try a sample showing request prefills everything", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Try a Sample Showing Request/ }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.locator('[role=radio][aria-checked=true][id^="t1-"]')).toHaveCount(1);
  await dlg.getByRole("button", { name: "Continue" }).click();
  await expect(dlg.getByLabel("First name")).toHaveValue("Alex");
  await dlg.getByRole("button", { name: "Continue" }).click();
  await dlg.getByRole("button", { name: "Use a generated sample PDF" }).click();
  await expect(dlg.getByTestId("doc-selected")).toBeVisible();
  await dlg.getByRole("button", { name: "Continue" }).click();
  await dlg.getByRole("button", { name: "Submit Showing Request" }).click();
  await expect(dlg.getByTestId("success")).toContainText("Simulated request");
});
