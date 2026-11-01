import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers/a11y";
import { newSignedInPage, uniqueEmail } from "./helpers/auth";

test("a student 13+ makes a free account, opens free material only, and deletes the account", async ({ page }) => {
  await page.goto("/join");
  await page.getByRole("link", { name: "Create a free account" }).click();
  await page.getByLabel("Month").selectOption("1");
  await page.getByLabel("Year").selectOption(String(new Date().getFullYear() - 15));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Pick your nickname")).toBeVisible();
  await expectAccessible(page, "student signup form");
  await page.getByLabel("Email").fill(uniqueEmail("learner"));
  await page.getByLabel("Password").fill("a-good-password");
  await page.getByRole("checkbox", { name: /i agree/i }).check();
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My learning" })).toBeVisible();
  await expectAccessible(page, "student home");

  // Free lesson opens; kit lessons, teacher pages and kit pages don't.
  await page.getByRole("link", { name: /A\.0 Predict/ }).click();
  await expect(page.getByRole("link", { name: "My learning" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /how faint can a glow get/i })).toBeVisible();
  await page.goto("/lessons/luminol-a1-why-it-glows");
  await expect(page.getByRole("heading", { name: /your teacher can share this one/i })).toBeVisible();
  await page.goto("/kits/luminol");
  await expect(page).toHaveURL(/\/student$/);

  await page.goto("/student");
  await page.locator("summary", { hasText: "My account" }).click();
  await page.getByRole("checkbox", { name: /delete my account/i }).check();
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/\?deleted=1$/);
  await page.goto("/student");
  await expect(page).toHaveURL(/\/student\/signin$/);
});

test("a student under 13 can't make an account and is pointed to a class code", async ({ page }) => {
  await page.goto("/student/signup");
  await page.getByLabel("Month").selectOption("6");
  await page.getByLabel("Year").selectOption(String(new Date().getFullYear() - 10));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: /ask your teacher for a class code/i })).toBeVisible();
  // Going back doesn't reopen the form for a different answer.
  await page.goto("/student/signup");
  await expect(page.getByRole("heading", { name: /ask your teacher for a class code/i })).toBeVisible();
  await expectAccessible(page, "student under 13");
});

test("a teacher can have six classes, and the header doesn't stick to the top", async ({ browser }) => {
  test.setTimeout(180_000);
  const t = await newSignedInPage(browser, { email: uniqueEmail("six") });
  for (let i = 1; i <= 6; i++) {
    await t.goto("/classes");
    await t.getByLabel("Class name").fill(`Period ${i}`);
    await t.getByRole("button", { name: "Create class" }).click();
    await expect(t).toHaveURL(/\/classes\/[0-9a-f-]{36}/);
  }
  await t.goto("/classes");
  await expect(t.getByText(/you have 6 classes, the most allowed/i)).toBeVisible();
  await expect(t.getByLabel("Class name")).toHaveCount(0);
  await t.goto("/dashboard");
  await expect(t.getByRole("link", { name: /new class/i })).toHaveCount(0);
  await t.mouse.wheel(0, 1200);
  const top = await t.locator("header").first().evaluate((h) => h.getBoundingClientRect().top);
  expect(top).toBeLessThan(0);
});
