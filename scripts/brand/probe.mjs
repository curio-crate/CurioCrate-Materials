// Quick probe: what platform powers curiocrate.org and what does the nav link to?
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://curiocrate.org", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
const info = await page.evaluate(() => ({
  title: document.title,
  generator: document.querySelector('meta[name="generator"]')?.content,
  stylesheets: [...document.styleSheets].map((s) => s.href).filter(Boolean),
  scripts: [...document.scripts].map((s) => s.src).filter(Boolean).slice(0, 30),
  links: [...document.querySelectorAll("a")].map((a) => ({ t: a.textContent.trim().slice(0, 40), h: a.getAttribute("href") })).slice(0, 80),
  imgs: [...document.querySelectorAll("img")].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })).slice(0, 40),
  icons: [...document.querySelectorAll('link[rel*="icon"]')].map((l) => l.href),
  fontLinks: [...document.querySelectorAll('link[href*="font"]')].map((l) => l.href),
  bodyText: document.body.innerText.slice(0, 3000),
}));
console.log(JSON.stringify(info, null, 2));
await browser.close();
