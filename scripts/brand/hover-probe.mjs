// Records hover states (nav links, CTAs, footer links), dropdown panels and the
// scrolled header on curiocrate.org. Output: design/raw/hover-states.json
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://curiocrate.org/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

const snap = (el) => {
  const c = getComputedStyle(el);
  return {
    text: el.innerText.trim().slice(0, 40), color: c.color, bg: c.backgroundColor, border: c.borderTopColor,
    shadow: c.boxShadow, transform: c.transform, deco: c.textDecorationLine, opacity: c.opacity, transition: c.transition.slice(0, 100),
  };
};
async function probe(selector, limit = 30) {
  const out = [];
  for (const h of (await page.$$(selector)).slice(0, limit)) {
    if (!(await h.isVisible().catch(() => false))) continue;
    await page.mouse.move(5, 890);
    await page.waitForTimeout(250);
    const before = await h.evaluate(snap);
    await h.scrollIntoViewIfNeeded().catch(() => {});
    const box = await h.boundingBox();
    if (!box) continue;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
    out.push({ ...before, hover: await h.evaluate(snap) });
  }
  return out;
}

const navLinks = await probe("nav.cn-nav a, nav.cn-nav button", 20);
await page.evaluate(() => window.scrollTo(0, 0));
const heroCtas = await probe("section:first-of-type a, section:first-of-type button", 10);
const footerLinks = await probe("footer a", 6);

// dropdown panel
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
const dropdowns = [];
for (const name of ["KITS", "INITIATIVES", "ABOUT US"]) {
  const trig = page.locator("nav.cn-nav button", { hasText: name }).first();
  if (!(await trig.count())) continue;
  await trig.hover();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ROOT, `design/reference/dropdown-${name.replace(/\s/g, "").toLowerCase()}.png`), clip: { x: 300, y: 0, width: 1140, height: 420 } });
  dropdowns.push(await page.evaluate(() =>
    [...document.querySelectorAll("nav.cn-nav *")]
      .filter((e) => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.top > 50 && r.height > 60 && r.width > 150 && c.visibility !== "hidden" && Number(c.opacity) > 0.5; })
      .slice(0, 3)
      .map((e) => { const c = getComputedStyle(e); return { tag: e.tagName, bg: c.backgroundColor, border: `${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor}`, radius: c.borderRadius, shadow: c.boxShadow, padding: c.padding, backdrop: c.backdropFilter, w: Math.round(e.getBoundingClientRect().width) }; })));
}

// scrolled header
await page.mouse.move(700, 600);
await page.evaluate(() => window.scrollTo(0, 1600));
await page.waitForTimeout(900);
const scrolledNav = await page.evaluate(() => { const n = document.querySelector("nav.cn-nav"); const c = getComputedStyle(n); return { bg: c.backgroundColor, backdrop: c.backdropFilter, border: c.borderBottom, padding: c.padding, height: n.getBoundingClientRect().height, position: c.position, shadow: c.boxShadow, transition: c.transition }; });
await page.screenshot({ path: path.join(ROOT, "design/reference/header-scrolled.png"), clip: { x: 0, y: 0, width: 1440, height: 120 } });
const topNav = await page.evaluate(() => { window.scrollTo(0, 0); return null; });
await page.waitForTimeout(800);
const topNavStyle = await page.evaluate(() => { const n = document.querySelector("nav.cn-nav"); const c = getComputedStyle(n); return { bg: c.backgroundColor, backdrop: c.backdropFilter, border: c.borderBottom, padding: c.padding, height: n.getBoundingClientRect().height, position: c.position }; });
const logo = await page.evaluate(() => { const i = document.querySelector("nav.cn-nav img"); const r = i.getBoundingClientRect(); return { src: i.src, w: r.width, h: r.height, filter: getComputedStyle(i).filter }; });

await fs.writeFile(path.join(ROOT, "design/raw/hover-states.json"), JSON.stringify({ navLinks, heroCtas, footerLinks, dropdowns, scrolledNav, topNav: topNavStyle, logo }, null, 1));
console.log(JSON.stringify({ navLinks: navLinks.slice(0, 6), heroCtas, footerLinks: footerLinks.slice(0, 2), dropdowns, scrolledNav, topNav: topNavStyle, logo, _: topNav }, null, 1));
await browser.close();
