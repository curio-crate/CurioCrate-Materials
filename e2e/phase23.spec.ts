import { expect, test } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
import fs from "node:fs";
import path from "node:path";
import { expectAccessible } from "./helpers/a11y";
import { createCodes, newSignedInPage, studioPage, uniqueEmail } from "./helpers/auth";
import { expectBrand } from "./helpers/brand";
import { chromebookPage, measuredLoad } from "./helpers/chromebook";
import { snapshot } from "./helpers/pages";

const companyPage = studioPage;

test("company login is separate from teachers and rejects a wrong password", async ({ page }) => {
  await page.goto("/admin/content");
  await expect(page).toHaveURL(/\/company\/login/);
  await page.getByLabel("Username").fill("CurioCrateAdmin");
  await page.getByLabel("Password").fill("nope");
  await page.getByRole("button", { name: /sign in to studio/i }).click();
  await expect(page.getByText(/wrong username or password/i)).toBeVisible();
});

test("company builds a lesson with a PDF and a video; it is live for teachers; codes unlock it", async ({ browser }) => {
  test.setTimeout(240_000);
  const co = await companyPage(browser);
  const title = `Magnets ${Date.now().toString(36)}`;
  await co.goto("/admin/content/new?type=instructions");
  await co.getByLabel("Title").fill(title);
  await co.getByLabel("Summary (one sentence teachers see in lists)").fill("Find the poles of a mystery magnet.");
  await co.getByLabel("Kit", { exact: true }).selectOption({ label: "Luminol Forensics Kit" });
  await co.getByLabel("Lesson text").fill("## Steps\n1. Hang the magnet\n2. Mark north\n> Safety: Keep magnets away from screens\n? Why does it point north?");
  await co.getByRole("button", { name: "Create" }).click();
  await expect(co.getByText(/live in the catalog/i)).toBeVisible();
  const lessonUrl = co.url();

  // Attach a PDF.
  await co.getByRole("link", { name: "+ PDF" }).click();
  await expect(co).toHaveURL(/new\?type=pdf/);
  await co.getByLabel("Title").fill(`${title} worksheet`);
  await co.getByRole("button", { name: "Create" }).click();
  await co.getByLabel("PDF file").setInputFiles(path.join(".media", "files", "luminol-a0-worksheet.pdf"));
  await expect(co.getByText(/uploaded\. it's live/i)).toBeVisible({ timeout: 30_000 });

  // Attach a video with captions; it processes automatically.
  await co.goto(lessonUrl);
  await co.getByRole("link", { name: "+ Video" }).click();
  await expect(co).toHaveURL(/new\?type=video/);
  await co.getByLabel("Title").fill(`${title} video`);
  await co.getByLabel("Captions / transcript").fill("First, hang the magnet.\nThen watch where it points.");
  await co.getByRole("button", { name: "Create" }).click();
  await co.getByLabel(/video file/i).setInputFiles(path.join(".media", "videos", "circuits-intro-video", "low.mp4"));
  await expect(co.getByText(/processing the video/i)).toBeVisible({ timeout: 60_000 });
  await expect.poll(async () => { await co.reload(); return co.getByText(/current: ready/i).count(); }, { timeout: 150_000, intervals: [3000] }).toBeGreaterThan(0);

  // Generate a code and let a teacher unlock it.
  await co.goto("/admin/orders");
  await co.getByLabel("Luminol Forensics Kit").fill("1");
  await co.getByRole("button", { name: /create order and codes/i }).click();
  const code = (await co.getByTestId("order-code").first().innerText()).trim();

  const teacher = await newSignedInPage(browser, { email: uniqueEmail("studio") });
  await teacher.goto("/catalog?q=Magnets");
  await teacher.getByRole("link", { name: title }).click();
  await expect(teacher.getByRole("heading", { name: /part of the luminol forensics kit/i })).toBeVisible();
  expect((await teacher.request.post("/api/redeem", { data: { code } })).status()).toBe(200);
  await teacher.reload();
  await expect(teacher.getByText("Hang the magnet", { exact: true })).toBeVisible();
  const [dl] = await Promise.all([teacher.waitForEvent("download"), teacher.getByTestId("pdf-download").click()]);
  expect(fs.readFileSync((await dl.path())!).subarray(0, 5).toString()).toBe("%PDF-");
  await teacher.getByRole("button", { name: /play video/i }).click();
  await expect.poll(() => teacher.getByTestId("lesson-video").evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 30_000 }).toBeGreaterThan(0.5);
});

test("a student joins with a class code, uses an assigned lab and Curie.AI; the teacher sees results and chats", async ({ browser }) => {
  test.setTimeout(180_000);
  const t = await newSignedInPage(browser, { email: uniqueEmail("class") });
  await t.goto("/classes");
  await t.getByLabel("Class name").fill("Period 3 Science");
  await t.getByRole("button", { name: "Create class" }).click();
  await expect(t).toHaveURL(/\/classes\/[0-9a-f-]{36}/);
  const classUrl = t.url();
  const code = (await t.getByTestId("join-code").innerText()).trim();
  await t.getByRole("button", { name: /assign find your limit/i }).click();
  await t.getByRole("button", { name: /assign a\.0 predict/i }).click();
  await expect(t.getByRole("button", { name: /unassign find your limit/i })).toBeVisible();
  await t.getByRole("button", { name: /turn curie\.ai on/i }).click();
  await expect(t.getByText(/curie\.ai is on/i)).toBeVisible();

  // Student on a throttled Chromebook, keyboard only.
  const s = await chromebookPage(browser);
  await s.goto("/join");
  await s.getByLabel("Class code").fill(code);
  await s.keyboard.press("Enter");
  await expect(s.getByRole("heading", { level: 1, name: "Period 3 Science" })).toBeVisible();
  const m = await measuredLoad(s, "/labs/luminol-limit");
  expect(m.loadMs).toBeLessThan(15_000);
  expect(m.overflow).toBeLessThanOrEqual(0);
  await s.getByRole("button", { name: /^5\s/ }).focus();
  await s.keyboard.press("Enter");
  await s.getByRole("button", { name: "Add three drops" }).focus();
  await s.keyboard.press("Enter");
  await expect(s.getByRole("status").first()).toContainText(/tube 5: you see/i);
  await s.getByText("1 barely").click();
  await s.getByLabel(/our limit of detection/i).selectOption("5");
  await s.getByRole("button", { name: "Save results" }).click();
  await expect(s.getByText(/saved\. your limit: tube 5/i)).toBeVisible();
  await expectAccessible(s, "p2 student lab");

  await s.goto("/class");
  await s.getByLabel("Message Curie").fill("why does the luminol glow in tube 1?");
  await s.getByRole("button", { name: "Send" }).click();
  await expect(s.locator("ol[aria-label='Conversation with Curie'] li").nth(2)).not.toHaveText(/thinking/i, { timeout: 20_000 });
  await s.getByLabel("Message Curie").fill("who won the game last night");
  await s.getByRole("button", { name: "Send" }).click();
  await expect(s.getByText(/outside our lab/i)).toBeVisible();
  await expectAccessible(s, "p3 student class with curie");

  // Unassigned content stays closed to the student.
  await s.goto("/lessons/luminol-a1-why-it-glows");
  await expect(s.getByRole("heading", { name: /not assigned to your class/i })).toBeVisible();

  await t.goto(classUrl);
  await expect(t.getByRole("cell", { name: "luminol-limit" })).toBeVisible();
  await expect(t.getByRole("cell", { name: /who won the game/i })).toBeVisible();
});

test("other labs run on a simulated Chromebook", async ({ browser }) => {
  const t = await newSignedInPage(browser, { email: uniqueEmail("labs") });
  const p = await chromebookPage(browser, t);
  for (const slug of ["circuit-sandbox", "filter-designer"]) {
    const m = await measuredLoad(p, `/labs/${slug}`);
    expect(m.loadMs, slug).toBeLessThan(15_000);
    expect(m.overflow).toBeLessThanOrEqual(0);
  }
  await p.getByRole("button", { name: "Pour the sample" }).click();
  await expect(p.getByRole("status").first()).toContainText(/NTU/);
  await p.goto("/labs/circuit-sandbox");
  await p.getByRole("button", { name: "Close the switch" }).click();
  await expect(p.getByRole("status").first()).toContainText(/bulb 1: (dim|very dim|bright)/i);
});

test("subscription in payment test mode starts access", async ({ browser }) => {
  const t = await newSignedInPage(browser, { email: uniqueEmail("sub") });
  expect((await t.request.get("/api/video/luminol-training-video/playback")).status()).toBe(403);
  await t.goto("/plans");
  await t.getByRole("button", { name: "Subscribe" }).nth(1).click();
  await expect(t.getByText(/subscription is active/i)).toBeVisible();
  expect((await t.request.get("/api/video/luminol-training-video/playback")).status()).toBe(200);
});

test("every new page passes the accessibility check and brand comparison", async ({ browser }) => {
  test.setTimeout(600_000);
  const co = await companyPage(browser);
  const teacher = await newSignedInPage(browser, { email: uniqueEmail("p23") });
  await teacher.goto("/classes");
  await teacher.getByLabel("Class name").fill("A11y class");
  await teacher.getByRole("button", { name: "Create class" }).click();
  await expect(teacher).toHaveURL(/\/classes\/[0-9a-f-]{36}/);
  const classPath = new URL(teacher.url()).pathname;
  const anon = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await co.goto("/admin/content");
  const firstEdit = await co.getByRole("link", { name: /edit/i }).nth(1).getAttribute("href");
  const visits = [
    { label: "labs", page: anon, path: "/labs" },
    { label: "join", page: anon, path: "/join" },
    { label: "join-error", page: anon, path: "/join?error=1" },
    { label: "company-login", page: anon, path: "/company/login" },
    { label: "lab-luminol", page: teacher, path: "/labs/luminol-limit" },
    { label: "lab-circuits", page: teacher, path: "/labs/circuit-sandbox" },
    { label: "lab-filter", page: teacher, path: "/labs/filter-designer" },
    { label: "classes", page: teacher, path: "/classes" },
    { label: "class", page: teacher, path: classPath },
    { label: "plans-signed-in", page: teacher, path: "/plans" },
    { label: "studio-content", page: co, path: "/admin/content" },
    { label: "studio-new-lesson", page: co, path: "/admin/content/new?type=instructions" },
    { label: "studio-new-video", page: co, path: "/admin/content/new?type=video" },
    { label: "studio-edit", page: co, path: firstEdit! },
    { label: "studio-kit", page: co, path: "/admin/kits/new" },
    { label: "studio-orders", page: co, path: "/admin/orders" },
    { label: "studio-access", page: co, path: "/admin/access" },
    { label: "studio-security", page: co, path: "/admin/security" },
    { label: "studio-team", page: co, path: "/admin/team" },
    { label: "account", page: teacher, path: "/account" },
  ];
  for (const v of visits) {
    await test.step(v.label, async () => {
      await v.page.goto(v.path);
      await expectBrand(v.page, v.label);
      await expectAccessible(v.page, `p23 ${v.label}`);
      await snapshot(v.page, v.label);
    });
  }
  for (const p of [co, teacher, anon]) await p.context().close();
});

test("a teacher's Google sign-in never opens Studio", async ({ browser }) => {
  const teacher = await newSignedInPage(browser, { email: uniqueEmail("nostudio") });
  await teacher.goto("/admin/files");
  await expect(teacher).toHaveURL(/\/company\/login/);
  expect((await teacher.request.post("/api/admin/uploads/sign", { data: { purpose: "file", name: "a.pdf", size: 10 } })).status()).toBe(401);
  await teacher.context().close();
});

test("the team uploads a pre-built JavaScript lesson; it runs in a sandbox for kit owners only", async ({ browser }) => {
  const co = await companyPage(browser);
  const title = `Pole finder ${Date.now().toString(36)}`;
  const pkg = zipSync({
    "pole-finder/index.html": strToU8('<!doctype html><title>x</title><p id="out">loading</p><script src="app.js"></script>'),
    "pole-finder/app.js": strToU8('document.getElementById("out").textContent = "JS lesson running"; try { document.cookie; document.getElementById("out").dataset.cookie = "readable"; } catch { document.getElementById("out").dataset.cookie = "blocked"; }'),
  });
  await co.goto("/admin/content");
  await co.getByLabel("Kit", { exact: true }).first().selectOption({ label: "Luminol Forensics Kit" });
  await co.locator("#up-files-package").setInputFiles({ name: "pole-finder.zip", mimeType: "application/zip", buffer: Buffer.from(pkg) });
  await co.getByLabel("Title for pole-finder.zip").fill(title);
  await co.getByRole("button", { name: /upload 1 file/i }).click();
  await expect(co.getByText(/live ✓/i)).toBeVisible({ timeout: 60_000 });
  await co.getByRole("list", { name: "Files to upload" }).getByRole("link", { name: "Edit" }).click();
  await co.getByRole("link", { name: /open as a teacher sees it/i }).click();
  const lessonUrl = new URL(co.url()).pathname;
  const frame = co.frameLocator('[data-testid="interactive-lesson"]');
  await expect(frame.locator("#out")).toHaveText("JS lesson running", { timeout: 20_000 });
  await expect(frame.locator("#out")).toHaveAttribute("data-cookie", "blocked"); // opaque origin: no access to cookies

  // A teacher without the kit sees it locked; the package itself needs a signed link.
  const teacher = await newSignedInPage(browser, { email: uniqueEmail("jsl") });
  await teacher.goto(lessonUrl);
  await expect(teacher.locator('[data-testid="interactive-lesson"]')).toHaveCount(0);
  await expect(teacher.getByRole("link", { name: /redeem a kit code/i })).toBeVisible();
  for (const p of [co, teacher]) await p.context().close();
});

test("a kit code unlocks one teacher; a colleague joining by school code waits for approval", async ({ browser }) => {
  const co = await companyPage(browser);
  const [code] = await createCodes(co, "Luminol Forensics Kit", 1);
  const a = await newSignedInPage(browser, { email: uniqueEmail("seat-a"), school: `Seat School ${Date.now().toString(36)}` });
  expect((await a.request.post("/api/redeem", { data: { code } })).status()).toBe(200);
  await a.goto("/dashboard");
  const joinCode = (await a.getByTestId("join-code").innerText()).trim();

  const b = await newSignedInPage(browser, { email: uniqueEmail("seat-b"), school: null });
  await b.goto("/onboarding");
  await b.getByLabel(/school code/i).fill(joinCode);
  await b.getByRole("button", { name: /join school/i }).click();
  await b.goto("/dashboard");
  await expect(b.getByText(/hasn.t approved you yet/i)).toBeVisible();
  expect((await b.request.get("/api/video/luminol-why-it-glows-video/playback")).status()).toBe(403);
  expect((await b.request.post("/api/redeem", { data: { code } })).status()).toBe(409);

  await a.goto("/dashboard");
  await expect(a.getByRole("heading", { name: /waiting for your approval/i })).toBeVisible();
  await a.getByRole("button", { name: /^approve/i }).click();
  await expect(a.getByText(/approved\./i)).toBeVisible();
  // Approved, but the kit code was A's personal seat: B still needs their own.
  expect((await b.request.get("/api/video/luminol-why-it-glows-video/playback")).status()).toBe(403);
  for (const p of [co, a, b]) await p.context().close();
});

