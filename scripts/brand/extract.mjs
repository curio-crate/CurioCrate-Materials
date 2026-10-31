// Phase 0 brand extraction. Opens curiocrate.org in real Chromium, reads computed styles,
// downloads logos/favicons and the site stylesheet, and saves reference screenshots.
// Usage: node scripts/brand/extract.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT_RAW = path.join(ROOT, "design/raw");
const OUT_REF = path.join(ROOT, "design/reference");
const OUT_BRAND = path.join(ROOT, "public/brand");
await Promise.all([OUT_RAW, OUT_REF, OUT_BRAND].map((d) => fs.mkdir(d, { recursive: true })));

const SITE = "https://curiocrate.org";
const PAGES = [
  "/", "/kits/luminol", "/demo", "/kits", "/newsletter", "/initiatives/teaching",
  "/initiatives/sap", "/initiatives/kits", "/chapters", "/gallery", "/team", "/contact",
];
const SHOTS_ONLY = process.argv.includes("--shots-only");
const NO_SHOTS = process.argv.includes("--no-shots");

const browser = await chromium.launch();

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
  // Scroll through to trigger lazy/intersection content, then back to top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
}

const slug = (p) => (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_"));

// ---- screenshots for every page at both widths
if (!NO_SHOTS) {
  const sizes = [
    ["desktop-1440", { width: 1440, height: 900 }],
    ["chromebook-1366x768", { width: 1366, height: 768 }],
  ];
  for (const [label, vp] of sizes) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const p of PAGES) {
      try {
        await page.goto(SITE + p, { waitUntil: "domcontentloaded", timeout: 60000 });
        await settle(page);
        await page.screenshot({ path: path.join(OUT_REF, `${slug(p)}.${label}.png`), fullPage: true });
        await page.screenshot({ path: path.join(OUT_REF, `${slug(p)}.${label}.viewport.png`) });
        console.log("shot", label, p);
      } catch (e) {
        console.log("FAILED", label, p, e.message);
      }
    }
    await ctx.close();
  }
}
if (SHOTS_ONLY) { await browser.close(); process.exit(0); }

// ---- computed style extraction
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const results = {};
for (const p of PAGES) {
  await page.goto(SITE + p, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle(page);
  results[p] = await page.evaluate(() => {
    const pick = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const cls = typeof el.className === "string" ? el.className : "";
      return {
        tag: el.tagName.toLowerCase(), cls: cls.slice(0, 160),
        text: (el.innerText || el.alt || "").trim().slice(0, 60),
        box: { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, fontStyle: cs.fontStyle,
        color: cs.color, background: cs.backgroundColor, backgroundImage: cs.backgroundImage.slice(0, 300),
        border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
        borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
        radius: cs.borderRadius, padding: cs.padding, margin: cs.margin, shadow: cs.boxShadow, maxWidth: cs.maxWidth,
        display: cs.display, gap: cs.gap, position: cs.position, height: cs.height, transition: cs.transition.slice(0, 120),
        textDecoration: cs.textDecorationLine, backdrop: cs.backdropFilter,
      };
    };
    const q = (sel, n = 40) =>
      [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0).slice(0, n).map(pick);
    return {
      html: pick(document.documentElement), body: pick(document.body),
      header: q("header, nav", 6), headerChildren: q("header *, nav > *", 60),
      h1: q("h1"), h2: q("h2"), h3: q("h3"), h4: q("h4"), h5: q("h5"), h6: q("h6"),
      p: q("p", 25), a: q("a", 80), button: q("button", 30), img: q("img", 20),
      footer: q("footer"), footerChildren: q("footer *", 120),
      sections: q("main > *, section", 30),
      containers: q("[class*='container'], [class*='max-w'], [class*='wrap']", 20),
      inputs: q("input, textarea, select", 20), labels: q("label", 10),
      cardsGuess: q("[class*='card'], article, li", 30),
    };
  });
  console.log("styles", p);
}

// ---- hover states for header links and buttons on home
await page.goto(SITE + "/", { waitUntil: "domcontentloaded" });
await settle(page);
const hoverTargets = await page.$$("header a, header button, main a, main button");
const hovers = [];
const snap = (el) => {
  const c = getComputedStyle(el);
  return {
    text: el.innerText.trim().slice(0, 40), color: c.color, bg: c.backgroundColor, border: c.borderTopColor,
    shadow: c.boxShadow, transform: c.transform, deco: c.textDecorationLine,
  };
};
for (const h of hoverTargets.slice(0, 40)) {
  try {
    if (!(await h.isVisible())) continue;
    const before = await h.evaluate(snap);
    await h.hover({ timeout: 2000 });
    await page.waitForTimeout(450);
    const after = await h.evaluate(snap);
    hovers.push({ ...before, hover: after });
  } catch {}
}

// ---- open each nav dropdown to capture dropdown panel styles
const dropdowns = [];
for (const label of ["Kits", "Initiatives", "About us"]) {
  try {
    const trig = page.locator("header").getByText(new RegExp(`^${label}`, "i")).first();
    await trig.hover();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUT_REF, `dropdown-${label.replace(/\s/g, "").toLowerCase()}.png`),
      clip: { x: 0, y: 0, width: 1440, height: 520 },
    });
    dropdowns.push(
      await page.evaluate(() =>
        [...document.querySelectorAll("header *")]
          .filter((e) => {
            const c = getComputedStyle(e);
            return (c.position === "absolute" || c.position === "fixed") && e.getBoundingClientRect().height > 40 &&
              c.visibility !== "hidden" && c.opacity !== "0";
          })
          .slice(0, 4)
          .map((e) => {
            const c = getComputedStyle(e);
            return {
              cls: String(e.className).slice(0, 120), bg: c.backgroundColor, border: c.border, radius: c.borderRadius,
              shadow: c.boxShadow, padding: c.padding, w: e.getBoundingClientRect().width,
            };
          }),
      ),
    );
  } catch (e) {
    dropdowns.push({ label, error: e.message });
  }
}

// ---- fonts, css variables, stylesheets
const cssMeta = await page.evaluate(() => {
  const vars = {};
  const fontFaces = [];
  const imports = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (rs) => {
      for (const r of rs) {
        if (r.type === CSSRule.FONT_FACE_RULE) fontFaces.push(r.cssText.slice(0, 400));
        else if (r.type === CSSRule.IMPORT_RULE) imports.push(r.href);
        else if (r.style && r.selectorText && /:root|^html/.test(r.selectorText))
          for (const prop of r.style) if (prop.startsWith("--")) vars[`${r.selectorText} ${prop}`] = r.style.getPropertyValue(prop).trim();
        if (r.cssRules) walk(r.cssRules);
      }
    };
    walk(rules);
  }
  return {
    vars, fontFaces, imports,
    loadedFonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight} ${f.style}`),
    fontLinks: [...document.querySelectorAll("link")].map((l) => `${l.rel} ${l.href}`),
  };
});

await fs.writeFile(path.join(OUT_RAW, "computed-styles.json"), JSON.stringify(results, null, 1));
await fs.writeFile(path.join(OUT_RAW, "hover-states.json"), JSON.stringify({ hovers, dropdowns }, null, 1));
await fs.writeFile(path.join(OUT_RAW, "css-meta.json"), JSON.stringify(cssMeta, null, 1));

// ---- download stylesheet(s), logos, favicon
const sheetUrls = await page.evaluate(() => [...document.styleSheets].map((s) => s.href).filter(Boolean));
for (const u of sheetUrls) {
  const res = await page.request.get(u);
  await fs.writeFile(path.join(OUT_RAW, path.basename(new URL(u).pathname)), await res.body());
}
const assetUrls = await page.evaluate(() => [
  ...new Set([
    ...[...document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')].map((l) => l.href),
    ...[...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src).filter((s) => /cclogo/i.test(s)),
  ]),
]);
for (const extra of ["/favicon.ico", "/apple-touch-icon.png", "/site.webmanifest", "/manifest.json"]) assetUrls.push(SITE + extra);
for (const u of assetUrls) {
  try {
    const res = await page.request.get(u);
    if (!res.ok()) { console.log("missing", u, res.status()); continue; }
    const ct = res.headers()["content-type"] || "";
    if (ct.includes("text/html")) { console.log("html fallback (not a real file)", u); continue; }
    await fs.writeFile(path.join(OUT_BRAND, path.basename(new URL(u).pathname)), await res.body());
    console.log("saved", u, ct);
  } catch (e) {
    console.log("fail", u, e.message);
  }
}
await browser.close();
