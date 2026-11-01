import { expect, test, type Browser, type Page } from "@playwright/test";
import { expectAccessible } from "./helpers/a11y";
import { studioPage } from "./helpers/auth";

// Studio team features: chat between two people (live, with files), profile pictures, to-dos with notifications,
// and the "are you sure" + Recently deleted safety net.

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const stamp = Date.now().toString(36);
const director = { email: `dana-${stamp}@curiocrate.org`, name: `Dana ${stamp}`, password: "a temporary pass 42" };

async function signInAs(browser: Browser, email: string, password: string) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto("/company/login");
  await page.getByLabel("Email or username").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in to studio/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
  return page;
}

const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/team/${name}.png`, fullPage: false });

test.describe.configure({ mode: "serial" });
let admin: Page;
let dana: Page;

test("an admin adds a Director of Curriculum, who signs in", async ({ browser }) => {
  admin = await studioPage(browser);
  await admin.goto("/admin/team");
  await admin.getByLabel("Email").fill(director.email);
  await admin.getByLabel("Full name").fill(director.name);
  await admin.locator(".st-role").filter({ has: admin.locator(".st-roleName", { hasText: /^Director of Curriculum$/ }) }).click();
  await admin.getByLabel("Temporary password").fill(director.password);
  await admin.getByRole("button", { name: "Add person" }).click();
  await expect(admin.getByText(/^Added /)).toBeVisible();
  dana = await signInAs(browser, director.email, director.password);
  const nav = dana.getByRole("navigation", { name: "Studio" });
  for (const name of ["Inbox", "Chat", "To-dos", "Lessons"]) await expect(nav.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Recently deleted" })).toHaveCount(0);
  // Admins were told someone signed in.
  await admin.goto("/admin/inbox");
  await expect(admin.getByText(`${director.name} signed in to Studio`)).toBeVisible();
});

test("chat: messages and files arrive instantly, without reloading", async () => {
  await admin.goto("/admin/chat");
  await dana.goto("/admin/chat");
  await admin.getByLabel(/^Message # Everyone/).fill(`Hello team ${stamp}`);
  await admin.keyboard.press("Enter");
  await expect(admin.getByText(`Hello team ${stamp}`)).toBeVisible();
  await expect(dana.getByText(`Hello team ${stamp}`)).toBeVisible({ timeout: 10_000 });

  // A private conversation: Dana writes to the admin, who sees the unread badge, then the message.
  await dana.getByRole("button", { name: /CurioCrateAdmin/ }).click();
  await dana.getByLabel(/^Message CurioCrateAdmin/).fill("Can you check the manual?");
  await dana.getByRole("button", { name: "Send", exact: true }).click();
  await expect(admin.getByRole("button", { name: new RegExp(`${director.name}.*1 unread`) })).toBeVisible({ timeout: 10_000 });
  await admin.getByRole("button", { name: new RegExp(director.name) }).click();
  await expect(admin.getByText("Can you check the manual?")).toBeVisible();

  // Files: an image shows inline on both sides.
  await admin.locator("input[type=file]").setInputFiles({ name: "diagram.png", mimeType: "image/png", buffer: PNG });
  await expect(admin.getByText("diagram.png")).toBeVisible();
  await admin.getByRole("button", { name: "Send", exact: true }).click();
  await expect(admin.getByRole("img", { name: "diagram.png" })).toBeVisible();
  await expect(dana.getByRole("img", { name: "diagram.png" })).toBeVisible({ timeout: 10_000 });
  await shot(admin, "chat");
  await expectAccessible(admin, "studio-chat");
});

test("deleting a chat message asks first, and an admin can restore it", async () => {
  const mine = dana.locator(".st-msg").filter({ hasText: "Can you check the manual?" });
  await mine.hover();
  await mine.getByRole("button", { name: /^Delete/ }).click();
  const dialog = dana.getByRole("dialog");
  await expect(dialog.getByText(/Are you sure you want to delete this message\?/)).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(mine).toBeVisible();
  await mine.hover();
  await mine.getByRole("button", { name: /^Delete/ }).click();
  await dana.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(dana.getByText("Can you check the manual?")).toHaveCount(0);

  await admin.goto("/admin/trash");
  const row = admin.getByRole("row").filter({ hasText: "Can you check the manual?" });
  await expect(row).toContainText(director.name);
  await shot(admin, "trash");
  await expectAccessible(admin, "studio-trash");
  await row.getByRole("button", { name: /^Restore/ }).click();
  await expect(admin.getByText(/^Restored/)).toBeVisible();
  await dana.goto("/admin/chat?c=" + new URL(dana.url()).searchParams.get("c"));
  await expect(dana.getByText("Can you check the manual?")).toBeVisible();
});

test("profile picture shows in the sidebar", async () => {
  await dana.goto("/admin/account");
  await dana.getByLabel("Choose a profile picture").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
  await expect(dana.getByText("Profile picture saved.")).toBeVisible();
  await expect(dana.locator(".st-me .st-avatar img")).toBeVisible();
  await expectAccessible(dana, "studio-account-avatar");
});

test("to-dos: an admin gives one, the director sees it in the Inbox and marks it done, the giver is notified", async () => {
  await admin.goto("/admin/tasks");
  await admin.getByLabel("To-do", { exact: true }).fill(`Finish the optics manual ${stamp}`);
  await admin.getByLabel("Give to").selectOption({ label: `${director.name} (Director of Curriculum)` });
  await admin.getByRole("button", { name: "Give to-do" }).click();
  await expect(admin.getByText(/To-do given to/)).toBeVisible();
  await shot(admin, "tasks-admin");
  await expectAccessible(admin, "studio-tasks");

  await dana.goto("/admin/inbox");
  await expect(dana.getByText(`Finish the optics manual ${stamp}`, { exact: false })).toBeVisible();
  await shot(dana, "inbox-director");
  await expectAccessible(dana, "studio-inbox");
  await dana.getByRole("button", { name: /New to-do from/ }).click();
  await expect(dana).toHaveURL(/\/admin\/tasks/);
  const task = dana.locator(".st-task").filter({ hasText: `Finish the optics manual ${stamp}` });
  await expect(task).toContainText("Given by CurioCrateAdmin");
  await task.getByRole("button", { name: "Done" }).click();
  await expect(dana.getByText(/Marked done/)).toBeVisible();

  await admin.goto("/admin/inbox");
  await expect(admin.getByText(`${director.name} finished a to-do`)).toBeVisible();
});

test("deleting a file in the Materials library asks first and lands in Recently deleted", async () => {
  await admin.goto("/admin/files");
  const kitPages = await admin.locator("a.st-row").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
  const remove = admin.getByRole("button", { name: /^Remove / }).first();
  for (const href of kitPages) {
    await admin.goto(`${href}?tab=files`);
    if (await remove.count()) break;
  }
  expect(await remove.count(), "a kit with a file to delete").toBe(1);
  const label = (await remove.getAttribute("aria-label"))!.replace(/^Remove /, "");
  await remove.click();
  await expect(admin.getByRole("dialog").getByText(`Are you sure you want to delete “${label}”?`)).toBeVisible();
  await admin.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(admin.getByText(/Moved “.*” to Recently deleted/)).toBeVisible();
  await admin.goto("/admin/trash");
  const row = admin.getByRole("row").filter({ hasText: label });
  await row.getByRole("button", { name: /^Restore/ }).click();
  await expect(admin.getByText(`Restored “${label}”`, { exact: false })).toBeVisible();
});
