import { expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Reference values come from the live site extraction (design/raw/computed-styles.json), not from our theme,
// so this check fails if our UI drifts from curiocrate.org.
type Styles = { fontFamily: string; fontSize: string; color: string; background: string; letterSpacing: string; textTransform: string };
const raw = JSON.parse(fs.readFileSync(path.join("design", "raw", "computed-styles.json"), "utf8"));
const home = raw["/"];
const refBody: Styles = home.body;
const refNav: Styles = home.a.find((a: { text: string }) => a.text === "NEWSLETTER");
const refDonate: Styles = home.a.find((a: { text: string }) => a.text === "DONATE");
const refFooter: Styles = home.footer[0];
const refFooterLabel: Styles = home.footerChildren.find((c: { cls: string }) => c.cls === "label");

const family = (f: string) => f.split(",")[0].replace(/"/g, "").trim();
// Every h1 family the live site uses (Cormorant Garamond on most pages, Barlow Condensed on kit pages).
const refH1Families = new Set<string>(Object.values(raw as Record<string, { h1: { fontFamily: string }[] }>).flatMap((p) => p.h1.map((h) => family(h.fontFamily))));

export async function expectBrand(page: Page, label: string) {
  await page.evaluate(() => document.fonts.ready);
  const ours = await page.evaluate(() => {
    const cs = (el: Element | null) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      return { fontFamily: c.fontFamily, fontSize: c.fontSize, color: c.color, background: c.backgroundColor, letterSpacing: c.letterSpacing, textTransform: c.textTransform };
    };
    const logo = document.querySelector<HTMLImageElement>("header img");
    const r = logo?.getBoundingClientRect();
    return {
      body: cs(document.body),
      nav: cs(document.querySelector("header nav ul a, header nav ul button")),
      solid: cs(document.querySelector('header [data-brand="solid"]')),
      footer: cs(document.querySelector("footer")),
      footerLabel: cs(document.querySelector("footer h2")),
      heading: cs(document.querySelector("main h1")),
      logo: logo ? { src: logo.currentSrc || logo.src, naturalRatio: logo.naturalWidth / logo.naturalHeight, ratio: r!.width / r!.height, w: r!.width } : null,
      fontsLoaded: ["Plus Jakarta Sans", "Cormorant Garamond", "JetBrains Mono"].map((f) => [...document.fonts].some((ff) => ff.family.replace(/"/g, "") === f && ff.status === "loaded")),
    };
  });

  const ctx = `brand check on ${label}`;
  // Body and nav fonts are on every page; the display serif must be loaded wherever the h1 uses it.
  expect([ours.fontsLoaded[0], ours.fontsLoaded[2]], `${ctx}: body + nav brand fonts loaded`).toEqual([true, true]);
  if (ours.heading && family(ours.heading.fontFamily) === "Cormorant Garamond") expect(ours.fontsLoaded[1], `${ctx}: display font loaded`).toBe(true);
  // Body
  expect(family(ours.body!.fontFamily), ctx).toBe(family(refBody.fontFamily));
  expect(ours.body!.background, ctx).toBe(refBody.background);
  expect(ours.body!.color, ctx).toBe(refBody.color);
  // Header nav link
  expect(family(ours.nav!.fontFamily), ctx).toBe(family(refNav.fontFamily));
  expect(ours.nav!.fontSize, ctx).toBe(refNav.fontSize);
  expect(ours.nav!.letterSpacing, ctx).toBe(refNav.letterSpacing);
  expect(ours.nav!.textTransform, ctx).toBe("uppercase");
  // Solid header button = site's Donate button
  expect(ours.solid!.background, ctx).toBe(refDonate.background);
  expect(ours.solid!.color, ctx).toBe(refDonate.color);
  // Footer
  expect(ours.footer!.background, ctx).toBe(refFooter.background);
  expect(family(ours.footerLabel!.fontFamily), ctx).toBe(family(refFooterLabel.fontFamily));
  expect(ours.footerLabel!.letterSpacing, ctx).toBe(refFooterLabel.letterSpacing);
  // Headline in the display serif
  if (ours.heading) expect([...refH1Families], `${ctx}: h1 font is one curiocrate.org uses for h1`).toContain(family(ours.heading.fontFamily));
  // Logo: the site's file, not stretched
  expect(ours.logo, ctx).not.toBeNull();
  expect(ours.logo!.src, ctx).toContain("cclogofull5.png");
  expect(Math.abs(ours.logo!.ratio - ours.logo!.naturalRatio) / ours.logo!.naturalRatio, `${ctx}: logo aspect ratio`).toBeLessThan(0.02);
}
