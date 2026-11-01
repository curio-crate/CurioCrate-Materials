import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers/a11y";
import { expectBrand } from "./helpers/brand";

// The home page uses the site theme (clean, light, CurioCrate blue) and passes the accessibility check.
for (const vp of [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "chromebook-1366x768", width: 1366, height: 768 },
]) {
  test(`sample page uses the site theme at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await expectBrand(page, `home ${vp.name}`);
    await expect(page.getByRole("link", { name: /curiocrate materials home/i })).toBeVisible();
  });

  test(`sample page passes axe WCAG 2.1 AA at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await expectAccessible(page, `phase0 home ${vp.name}`);
  });
}

test("brand files exist in public/brand", async ({ request }) => {
  for (const f of ["/brand/cclogofull5.png", "/brand/cclogosmall.png"]) {
    const res = await request.get(f);
    expect(res.status(), f).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
});
