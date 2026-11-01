import { expect, test, type Page } from "@playwright/test";
import type { roles as Roles } from "./helpers/pages";
import { expectAccessible } from "./helpers/a11y";
import { expectBrand } from "./helpers/brand";
import { roles, snapshot } from "./helpers/pages";

// Phase 1 gate: every page passes the automated accessibility check (axe-core, WCAG 2.1 A+AA)
// and the brand comparison against curiocrate.org's computed styles. Screenshots are saved to
// test-results/brand/ for the manual side-by-side review.
type R = Awaited<ReturnType<typeof Roles>>;
const visits: { label: string; page: (r: R) => Page; path: string | ((r: R) => string); prep?: (r: R) => Promise<void> }[] = [
    { label: "home", page: (r) => r.anon, path: "/" },
    { label: "catalog", page: (r) => r.anon, path: "/catalog" },
    { label: "catalog-filtered", page: (r) => r.anon, path: "/catalog?grade=6-8&type=instructions&free=1" },
    { label: "kit-luminol", page: (r) => r.anon, path: "/kits/luminol" },
    { label: "kit-circuits", page: (r) => r.anon, path: "/kits/circuits" },
    { label: "kit-clean-water", page: (r) => r.anon, path: "/kits/clean-water" },
    { label: "lesson-locked-anon", page: (r) => r.anon, path: "/lessons/luminol-a1-why-it-glows" },
    { label: "signin", page: (r) => r.anon, path: "/signin" },
    { label: "signin-error", page: (r) => r.anon, path: "/signin?error=state" },
    { label: "redeem-anon", page: (r) => r.anon, path: "/redeem?code=LMN-AAAA-BBBB-CCCC" },
    { label: "training", page: (r) => r.anon, path: "/training" },
    { label: "plans", page: (r) => r.anon, path: "/plans" },
    { label: "schools-it", page: (r) => r.anon, path: "/schools/it" },
    { label: "privacy", page: (r) => r.anon, path: "/privacy" },
    { label: "accessibility", page: (r) => r.anon, path: "/accessibility" },
    { label: "not-found", page: (r) => r.anon, path: "/this-does-not-exist" },
    { label: "test-idp", page: (r) => r.anon, path: "/api/auth/google/start?next=/dashboard" },
    { label: "onboarding", page: (r) => r.fresh, path: "/onboarding" },
    { label: "dashboard", page: (r) => r.teacher, path: "/dashboard" },
    { label: "kit-owned", page: (r) => r.teacher, path: "/kits/luminol" },
    { label: "lesson-open-video-pdf", page: (r) => r.teacher, path: "/lessons/luminol-a1-why-it-glows" },
    { label: "lesson-free", page: (r) => r.teacher, path: "/lessons/luminol-a0-predict" },
    { label: "lesson-subscription-locked", page: (r) => r.teacher, path: "/lessons/luminol-training-walkthrough" },
    { label: "lesson-pdf-item", page: (r) => r.teacher, path: "/lessons/luminol-teacher-guide" },
    { label: "redeem-form", page: (r) => r.teacher, path: "/redeem" },
    {
      label: "redeem-error",
      page: (r) => r.teacher,
      path: "/redeem",
      prep: async (r) => {
        await r.teacher.getByLabel("Kit code").fill("LMN-0000-0000-0000");
        await r.teacher.getByRole("button", { name: /redeem for/i }).click();
        await expect(r.teacher.getByText(/couldn.t find that code/i)).toBeVisible();
      },
    },
    {
      label: "redeem-success",
      page: (r) => r.teacher,
      path: "/redeem",
      prep: async (r) => {
        await r.teacher.getByLabel("Kit code").fill(r.spare);
        await r.teacher.getByRole("button", { name: /redeem for/i }).click();
        await expect(r.teacher.getByText("Code redeemed")).toBeVisible();
      },
    },
    { label: "admin-lookup", page: (r) => r.staff, path: "/admin/lookup?q=LMN" },
    { label: "admin-orders", page: (r) => r.staff, path: "/admin/orders" },
    { label: "admin-order", page: (r) => r.staff, path: (r) => r.orderPath },
    { label: "admin-print", page: (r) => r.staff, path: (r) => `${r.orderPath}/print` },
    { label: "admin-schools", page: (r) => r.staff, path: "/admin/schools" },
    { label: "admin-school", page: (r) => r.staff, path: (r) => r.schoolLink },
    { label: "admin-usage", page: (r) => r.staff, path: "/admin/usage" },
    { label: "admin-audit", page: (r) => r.staff, path: "/admin/audit" },
];

test.describe.serial("every page passes the accessibility check and the brand comparison", () => {
  let r: R;
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(300_000);
    r = await roles(browser);
  });
  for (const v of visits) {
    test(v.label, async () => {
      const page = v.page(r);
      await page.goto(typeof v.path === "function" ? v.path(r) : v.path);
      if (v.prep) await v.prep(r);
      await expectBrand(page, v.label);
      await expectAccessible(page, `p1 ${v.label}`);
      await snapshot(page, v.label);
    });
  }
});
