import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { createCodes, newSignedInPage, studioPage, uniqueEmail } from "./helpers/auth";
import { chromebookPage, measuredLoad } from "./helpers/chromebook";

// Phase 1 gate: pages load and work at 1366x768 with a slowed network and CPU.
const BUDGET_MS = 15_000;

test("pages load and work on a simulated low-end Chromebook", async ({ browser }) => {
  test.setTimeout(300_000);
  const staff = await studioPage(browser);
  const [code] = await createCodes(staff, "Luminol Forensics Kit", 1);
  const teacher = await newSignedInPage(browser, { email: uniqueEmail("cb") });
  expect((await teacher.request.post("/api/redeem", { data: { code } })).status()).toBe(200);

  const anon = await chromebookPage(browser);
  const page = await chromebookPage(browser, teacher);
  const staffCb = await chromebookPage(browser, staff);
  const results: Record<string, unknown> = {};

  for (const [p, url] of [
    [anon, "/"],
    [anon, "/catalog"],
    [anon, "/kits/luminol"],
    [anon, "/signin"],
    [page, "/dashboard"],
    [page, "/redeem"],
    [page, "/lessons/luminol-a1-why-it-glows"],
    [staffCb, "/admin"],
  ] as const) {
    const m = await measuredLoad(p, url);
    results[url] = m;
    expect(m.loadMs, `${url} load time`).toBeLessThan(BUDGET_MS);
    expect(m.overflow, `${url} horizontal overflow at 1366px`).toBeLessThanOrEqual(0);
  }

  // Things still work under throttling: the catalog filter, a header menu, and video playback.
  await anon.goto("/catalog");
  await anon.getByLabel("Grade band").selectOption("4-5");
  await anon.getByRole("button", { name: "Apply" }).click();
  await expect(anon.getByRole("heading", { level: 3, name: /circuit builders kit/i })).toBeVisible();
  await expect(anon.getByRole("heading", { level: 3, name: /luminol forensics kit/i })).toHaveCount(0);
  await anon.getByRole("button", { name: /^schools/i }).click();
  await expect(anon.getByRole("link", { name: "Redeem a kit code" })).toBeVisible();

  await page.goto("/lessons/luminol-a1-why-it-glows");
  await page.getByRole("radio", { name: /low 360p/i }).check({ force: true });
  const t0 = Date.now();
  await page.getByRole("button", { name: /play video/i }).click();
  await expect.poll(() => page.getByTestId("lesson-video").evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 45_000 }).toBeGreaterThan(0.5);
  results.videoStartMs = Date.now() - t0;
  results.videoHeight = await page.getByTestId("lesson-video").evaluate((v: HTMLVideoElement) => v.videoHeight);

  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync("test-results/chromebook.json", JSON.stringify(results, null, 1));
});
