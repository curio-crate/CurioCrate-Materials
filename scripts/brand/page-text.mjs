// Dumps the rendered text of a curiocrate.org page (used to keep kit content accurate).
// Usage: node scripts/brand/page-text.mjs /kits/luminol
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://curiocrate.org" + (process.argv[2] ?? "/"), { waitUntil: "networkidle", timeout: 60000 });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 700) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 100));
  }
});
console.log(await page.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText));
await browser.close();
