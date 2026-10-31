// Side-by-side brand comparison: screenshots our pages at 1440 and 1366x768 and composes each one
// next to the curiocrate.org reference so fonts, colors, logo, header and footer can be checked by eye.
// Usage: node scripts/brand/compare.mjs [baseUrl] [path ...]
//   e.g. node scripts/brand/compare.mjs http://localhost:3100 / /catalog
// Output: design/compare/<page>.<size>.png (ours) and design/compare/<page>.<size>.side-by-side.png
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "design/compare");
await fs.mkdir(OUT, { recursive: true });

const base = process.argv[2] ?? "http://localhost:3100";
const pages = process.argv.slice(3).length ? process.argv.slice(3) : ["/"];
const cookie = process.env.COMPARE_COOKIE; // optional "name=value" to screenshot signed-in pages
const REF = { "desktop-1440": "home.desktop-1440.viewport.png", "chromebook-1366x768": "home.chromebook-1366x768.viewport.png" };
const REF_FOOTER = "home.desktop-1440.png";
const sizes = { "desktop-1440": { width: 1440, height: 900 }, "chromebook-1366x768": { width: 1366, height: 768 } };

const browser = await chromium.launch();
const slug = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/[/?=&]/g, "_"));

for (const [label, vp] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport: vp });
  if (cookie) {
    const [name, ...rest] = cookie.split("=");
    await ctx.addCookies([{ name, value: rest.join("="), url: base }]);
  }
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const ours = path.join(OUT, `${slug(p)}.${label}.png`);
    await page.screenshot({ path: ours });
    const oursFull = path.join(OUT, `${slug(p)}.${label}.full.png`);
    await page.screenshot({ path: oursFull, fullPage: true });

    // Compose: reference viewport | ours viewport, then reference footer | our footer.
    const ref = path.join(ROOT, "design/reference", REF[label]);
    const refFull = path.join(ROOT, "design/reference", REF_FOOTER);
    const html = `<!doctype html><html><body style="margin:0;background:#222;font:14px sans-serif;color:#eee">
      <div style="display:flex;gap:8px;padding:8px"><div><div>curiocrate.org (reference)</div><img src="${pathToFileURL(ref)}" style="width:${vp.width / 2}px"></div>
      <div><div>materials ${p} (ours)</div><img src="${pathToFileURL(ours)}" style="width:${vp.width / 2}px"></div></div>
      <div style="display:flex;gap:8px;padding:8px"><div><div>reference footer</div><div style="width:720px;height:240px;overflow:hidden;position:relative"><img id="rf" src="${pathToFileURL(refFull)}" style="width:720px;position:absolute;bottom:0"></div></div>
      <div><div>our footer</div><div style="width:720px;height:240px;overflow:hidden;position:relative"><img src="${pathToFileURL(oursFull)}" style="width:720px;position:absolute;bottom:0"></div></div></div>
      </body></html>`; // theme-check-ignore (comparison sheet, not app UI)
    const tmp = path.join(OUT, `_sheet.html`);
    await fs.writeFile(tmp, html);
    const sheet = await browser.newPage({ viewport: { width: vp.width + 24, height: 400 } });
    await sheet.goto(pathToFileURL(tmp).href);
    await sheet.waitForTimeout(300);
    await sheet.screenshot({ path: path.join(OUT, `${slug(p)}.${label}.side-by-side.png`), fullPage: true });
    await sheet.close();
    console.log("compared", label, p);
  }
  await ctx.close();
}
await fs.rm(path.join(OUT, "_sheet.html"), { force: true });
await browser.close();
