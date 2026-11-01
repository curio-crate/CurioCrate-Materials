import { expect, type Page } from "@playwright/test";

// Studio has its own frame; the teacher & student site has the clean light theme (src/app/(site)/site.css).
const family = (f: string) => f.split(",")[0].replace(/"/g, "").trim();

export async function expectBrand(page: Page, label: string) {
  await page.evaluate(() => document.fonts.ready);
  // Studio is the company workspace: deliberately its own calm frame (no site header/footer), same brand fonts,
  // CurioCrate blue accent. The curiocrate.org comparison applies to the teacher site only.
  if (await page.locator(".studio").count()) {
    const st = await page.evaluate(() => ({
      body: getComputedStyle(document.querySelector(".studio")!).fontFamily,
      siteHeader: !!document.querySelector("header nav[aria-label='Main']"),
      fonts: ["Plus Jakarta Sans", "Cormorant Garamond", "JetBrains Mono"].map((f) => [...document.fonts].some((ff) => ff.family.replace(/"/g, "") === f && ff.status === "loaded")),
    }));
    expect(family(st.body), `studio check on ${label}`).toBe("Plus Jakarta Sans");
    expect(st.siteHeader, `studio check on ${label}: no teacher-site navigation`).toBe(false);
    expect(st.fonts[0], `studio check on ${label}: body font loaded`).toBe(true);
    return;
  }
  // Teacher & student site: its own clean, light look on the CurioCrate blue (the main curiocrate.org site makes the
  // statement; this one is a tool). Checked against the site theme, not curiocrate.org's computed styles.
  const ours = await page.evaluate(() => {
    const site = document.querySelector<HTMLElement>(".site");
    const header = document.querySelector("header");
    const logo = document.querySelector<HTMLImageElement>("header img");
    const r = logo?.getBoundingClientRect();
    const solid = document.querySelector("header .btn-solid");
    return {
      site: !!site,
      body: site ? getComputedStyle(site).fontFamily : "",
      headerPosition: header ? getComputedStyle(header).position : "",
      brandLabel: document.querySelector("header a[aria-label]")?.getAttribute("aria-label") ?? "",
      solidBg: solid ? getComputedStyle(solid).backgroundColor : null,
      accent: site ? getComputedStyle(site).getPropertyValue("--sx-accent").trim() : "",
      footer: !!document.querySelector("footer"),
      logo: logo ? { src: logo.currentSrc || logo.src, naturalRatio: logo.naturalWidth / logo.naturalHeight, ratio: r!.width / r!.height } : null,
      bodyFontLoaded: [...document.fonts].some((ff) => ff.family.replace(/"/g, "") === "Plus Jakarta Sans" && ff.status === "loaded"),
    };
  });

  const ctx = `site check on ${label}`;
  expect(ours.site, `${ctx}: site frame`).toBe(true);
  expect(family(ours.body), ctx).toBe("Plus Jakarta Sans");
  expect(ours.bodyFontLoaded, `${ctx}: body font loaded`).toBe(true);
  // The header scrolls away with the page: no bar sliding or sticking over content.
  expect(ours.headerPosition, `${ctx}: header is not fixed or sticky`).not.toMatch(/fixed|sticky/);
  expect(ours.brandLabel, ctx).toMatch(/curiocrate materials home/i);
  expect(ours.accent.toLowerCase(), `${ctx}: CurioCrate blue`).toBe("#1670d4");
  if (ours.solidBg) expect(ours.solidBg, `${ctx}: solid button is the CurioCrate blue`).toBe("rgb(22, 112, 212)");
  expect(ours.footer, ctx).toBe(true);
  // Logo: the CurioCrate star mark, not stretched
  expect(ours.logo, ctx).not.toBeNull();
  expect(ours.logo!.src, ctx).toContain("cclogosmall.png");
  expect(Math.abs(ours.logo!.ratio - ours.logo!.naturalRatio) / ours.logo!.naturalRatio, `${ctx}: logo aspect ratio`).toBeLessThan(0.02);
}
