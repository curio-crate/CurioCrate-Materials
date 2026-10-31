import { expect, type Browser, type Page } from "@playwright/test";

// Studio is username + password only. This is the development account (never created on a deployed site).
export const STUDIO_USER = "CurioCrateAdmin";
export const STUDIO_PASSWORD = "WeLuvCurie@3322";
let n = 0;
export const uniqueEmail = (label: string) => `${label}-${Date.now().toString(36)}-${++n}@e2e-${label}.test`;

/** Signs in through the real OAuth routes using the provider's test mode (local test identity provider). */
export async function signIn(page: Page, opts: { email: string; name?: string; provider?: "google" | "clever" | "classlink"; next?: string; school?: string | null }) {
  const provider = opts.provider ?? "google";
  await page.goto(`/signin?next=${encodeURIComponent(opts.next ?? "/dashboard")}`);
  await page.getByRole("link", { name: new RegExp(`continue with ${provider}`, "i") }).click();
  await expect(page.getByRole("heading", { name: "Test sign-in" })).toBeVisible();
  await page.getByLabel("Teacher email").fill(opts.email);
  await page.getByLabel("Display name").fill(opts.name ?? "E2E Teacher");
  await page.getByRole("button", { name: /continue as this teacher/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/") && !u.pathname.startsWith("/api/auth/"));
  if (page.url().includes("/onboarding") && opts.school !== null) {
    await page.getByLabel("School name").fill(opts.school ?? `E2E School ${Date.now().toString(36)}`);
    await page.getByRole("button", { name: /create school/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/onboarding"));
  }
}

export async function newSignedInPage(browser: Browser, opts: Parameters<typeof signIn>[1]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await signIn(page, opts);
  return page;
}

/** A browser signed in to Curiocrate Studio with the company username and password. */
export async function studioPage(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/company/login");
  await page.getByLabel("Username").fill(STUDIO_USER);
  await page.getByLabel("Password").fill(STUDIO_PASSWORD);
  await page.getByRole("button", { name: /sign in to studio/i }).click();
  await expect(page).toHaveURL(/\/admin\/files/);
  return page;
}

/** As support staff: create a manual order and return the generated codes (formatted). */
export async function createCodes(page: Page, kitName: string, quantity: number, reference = `PO-E2E-${Date.now().toString(36)}`) {
  await page.goto("/admin/orders");
  await page.getByLabel("Source").selectOption("purchase_order");
  await page.getByLabel("PO / invoice / reference number").fill(reference);
  await page.getByLabel(kitName).fill(String(quantity));
  await page.getByRole("button", { name: /create order and codes/i }).click();
  await expect(page.getByText(/order created with/i)).toBeVisible();
  return (await page.getByTestId("order-code").allInnerTexts()).map((s) => s.trim());
}
