import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { createCodes, studioPage, uniqueEmail } from "./helpers/auth";

test("teacher signs in, redeems a code, opens a lesson, downloads the PDF and plays the video", async ({ browser }) => {
  test.setTimeout(180_000);
  // Support staff issue a purchase-order code (as for a kit box).
  const staff = await studioPage(browser);
  const [code] = await createCodes(staff, "Luminol Forensics Kit", 1);
  expect(code).toMatch(/^LMN-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);

  // A teacher arrives from the QR code, signs in with Google (test mode), sets up their school, redeems.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`/redeem?code=${code}`);
  await page.getByRole("main").getByRole("link", { name: /teacher sign in/i }).click();
  await page.getByRole("link", { name: /continue with google/i }).click();
  await page.getByLabel("Teacher email").fill(uniqueEmail("flow"));
  await page.getByLabel("Display name").fill("Ms. Rivera");
  await page.getByRole("button", { name: /continue as this teacher/i }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("School name").fill("Cerritos Middle School");
  await page.getByRole("button", { name: /create school/i }).click();
  await expect(page).toHaveURL(/\/redeem\?code=/);
  await expect(page.getByLabel("Kit code")).toHaveValue(code);
  await page.getByRole("button", { name: /redeem for my account/i }).click();
  await expect(page.getByText("Kit unlocked")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Luminol Forensics Kit" })).toBeVisible();

  // Open the kit and a kit-owner lesson.
  await page.getByRole("link", { name: /open the kit/i }).click();
  await expect(page.getByText(/unlocked on your account/i)).toBeVisible();
  await page.getByRole("link", { name: "A.1 Why it glows" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "A.1 Why it glows" })).toBeVisible();
  await expect(page.getByText("Add three drops from tube 6 (water). Observe: still dark.")).toBeVisible();

  // Download the PDF (signed, short-lived link) and check it is a real PDF.
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("pdf-download").first().click()]);
  const file = await download.path();
  expect(fs.readFileSync(file!).subarray(0, 5).toString()).toBe("%PDF-");
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);

  // Play the video: HLS via signed token, captions track present, playback advances.
  await page.getByRole("button", { name: /play video: why luminol glows/i }).click();
  const video = page.getByTestId("lesson-video");
  await expect.poll(async () => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 30_000 }).toBeGreaterThan(1.5);
  expect(await video.evaluate((v: HTMLVideoElement) => v.textTracks.length)).toBe(1);
  expect(await video.evaluate((v: HTMLVideoElement) => v.textTracks[0].mode)).toBe("showing");
  // The transcript follows along.
  await expect(page.locator('[aria-current="true"]').first()).toBeVisible({ timeout: 15_000 });
  await ctx.close();
});
