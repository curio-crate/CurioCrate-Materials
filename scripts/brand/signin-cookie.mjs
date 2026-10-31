// Signs in through the local test identity provider and prints "cc_session=<token>" for
// screenshotting signed-in pages with compare.mjs (COMPARE_COOKIE). Dev/test mode only.
// Usage: node scripts/brand/signin-cookie.mjs http://localhost:3100 teacher@school.test "Ms. Rivera" "Cerritos Middle School"
import { chromium } from "@playwright/test";

const [base = "http://localhost:3100", email = "ms.rivera@cerritos-ms.test", name = "Ms. Rivera", school = "Cerritos Middle School"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/api/auth/google/start?next=/dashboard`);
await page.getByLabel("Teacher email").fill(email);
await page.getByLabel("Display name").fill(name);
await page.getByRole("button", { name: /continue as this teacher/i }).click();
await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 60000 });
if (page.url().includes("/onboarding")) {
  await page.getByLabel("School name").fill(school);
  await page.getByRole("button", { name: /create school/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 60000 });
}
const cookie = (await page.context().cookies()).find((c) => c.name === "cc_session");
console.log(`cc_session=${cookie.value}`);
await browser.close();
