import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

test("22. no broken internal links or images on key pages", async ({ page, request }) => {
  await fresh(page);
  const pages = ["/", "/homes", "/homes/MH-24011", "/compare", "/dashboard", "/dashboard/leads", "/dashboard/showings", "/dashboard/calendar", "/dashboard/automations", "/dashboard/settings"];
  const links = new Set<string>();
  const bad: string[] = [];
  for (const p of pages) {
    page.removeAllListeners("response");
    page.on("response", (r) => { if (r.status() >= 400 && new URL(r.url()).host === new URL(page.url() || "http://x").host) bad.push(`${r.status()} ${r.url()}`); });
    await page.goto(p, { waitUntil: "load" });
    await page.waitForTimeout(800);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    await page.waitForTimeout(400);
    const broken = await page.evaluate(() => Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && !i.src.includes("tile.openstreetmap")).map((i) => i.src));
    expect(broken, `broken images on ${p}`).toEqual([]);
    (await page.locator("a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!))).forEach((h) => links.add(h.split("#")[0]));
  }
  for (const href of links) {
    if (!href) continue;
    const r = await request.get(href);
    expect(r.status(), href).toBeLessThan(400);
  }
  expect(bad.filter((b) => !b.includes("tile.openstreetmap"))).toEqual([]);
});

test("bot protection blocks crawler and headless user agents", async ({ request }) => {
  const r = await request.get("/", { headers: { "user-agent": "GPTBot/1.0" } });
  expect(r.status()).toBe(403);
  const ok = await request.get("/");
  expect(ok.status()).toBe(200);
});
