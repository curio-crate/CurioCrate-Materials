import { expect, test, type Page } from "@playwright/test";
import { createCodes, newSignedInPage, studioPage, uniqueEmail } from "./helpers/auth";

async function tabUntil(page: Page, predicate: () => Promise<boolean>, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await predicate()) return;
  }
  throw new Error("focus never reached the target by Tab");
}
const focusedText = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement)?.innerText?.trim() ?? "");

test("skip link, header menus and Escape work by keyboard alone", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();

  await page.goto("/");
  await tabUntil(page, async () => (await focusedText(page)).startsWith("KITS") || (await focusedText(page)).startsWith("Kits"));
  await page.keyboard.press("Enter");
  const kitsButton = page.getByRole("button", { name: /^kits/i });
  await expect(kitsButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText(/luminol forensics kit/i);
  await page.keyboard.press("Escape");
  await expect(kitsButton).toHaveAttribute("aria-expanded", "false");

  // Focus is always visible.
  await tabUntil(page, async () => (await focusedText(page)).toLowerCase().includes("redeem code"));
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
});

test("redeem a code, open the lesson and play the video by keyboard alone", async ({ browser }) => {
  const staff = await studioPage(browser);
  const [code] = await createCodes(staff, "Luminol Forensics Kit", 1);
  const page = await newSignedInPage(browser, { email: uniqueEmail("kbd") });

  await page.goto("/redeem");
  await tabUntil(page, () => page.getByLabel("Kit code").evaluate((el) => el === document.activeElement));
  await page.keyboard.type(code);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Kit unlocked")).toBeVisible();
  await tabUntil(page, async () => (await focusedText(page)).toLowerCase().includes("open the kit"));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/kits\/luminol/);

  await tabUntil(page, async () => (await focusedText(page)).includes("A.1 Why it glows"), 80);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/lessons\/luminol-a1-why-it-glows/);

  await tabUntil(page, async () => (await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "")).startsWith("Play video"), 80);
  await page.keyboard.press("Enter");
  const video = page.getByTestId("lesson-video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 30_000 }).toBeGreaterThan(1);

  // Transcript cues are buttons that seek.
  await tabUntil(page, async () => (await focusedText(page)).includes("Iron in blood acts as a catalyst"), 80);
  await page.keyboard.press("Enter");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(9);
});

test("sign-in and onboarding forms work by keyboard alone", async ({ page }) => {
  await page.goto("/signin");
  await tabUntil(page, async () => (await focusedText(page)).toLowerCase().includes("continue with google"));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Test sign-in" })).toBeVisible();
  await tabUntil(page, () => page.getByLabel("Teacher email").evaluate((el) => el === document.activeElement));
  await page.keyboard.type(uniqueEmail("kbd2"));
  await page.keyboard.press("Tab");
  await page.keyboard.type("Keyboard Teacher");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/onboarding/);
  await tabUntil(page, () => page.getByLabel("School name").evaluate((el) => el === document.activeElement));
  await page.keyboard.type("Keyboard Academy");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/welcome back, keyboard/i);
});
