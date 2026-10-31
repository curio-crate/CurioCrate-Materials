import { expect, type Browser, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createCodes, newSignedInPage, studioPage, uniqueEmail } from "./auth";

export type Visit = { label: string; path: string; as: "anon" | "teacher" | "fresh" | "staff"; setup?: (page: Page) => Promise<void> };

/** Signed-in pages for every role, prepared once per spec file. */
export async function roles(browser: Browser) {
  const staff = await studioPage(browser);
  const [code, spare] = await createCodes(staff, "Luminol Forensics Kit", 2);
  const orderPath = new URL(staff.url()).pathname;
  const teacher = await newSignedInPage(browser, { email: uniqueEmail("pages"), name: "Ms. Rivera", school: "Cerritos Middle School" });
  expect((await teacher.request.post("/api/redeem", { data: { code } })).status()).toBe(200);
  const fresh = await newSignedInPage(browser, { email: uniqueEmail("fresh"), school: null });
  const schoolLink = await (async () => {
    await staff.goto("/admin/schools?q=Cerritos");
    return (await staff.getByRole("link", { name: "Cerritos Middle School" }).first().getAttribute("href"))!;
  })();
  const anonCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const anon = await anonCtx.newPage();
  return { staff, teacher, fresh, anon, orderPath, schoolLink, spare };
}

/** Saves a screenshot of the current page for the side-by-side brand review (design/compare). */
export async function snapshot(page: Page, label: string) {
  const dir = path.join("test-results", "brand");
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${label.replace(/[^a-z0-9]+/gi, "_")}.png`) });
}
