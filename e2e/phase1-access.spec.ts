import { expect, test } from "@playwright/test";
import { createCodes, newSignedInPage, studioPage, uniqueEmail } from "./helpers/auth";

const KIT_LESSON = "luminol-a1-why-it-glows";
const KIT_PDF = "luminol-a1-notes";
const KIT_VIDEO = "luminol-why-it-glows-video";

test.describe("a teacher without access cannot get a lesson, PDF or video link", () => {
  test("signed-in teacher without the kit", async ({ browser }) => {
    const page = await newSignedInPage(browser, { email: uniqueEmail("noaccess") });
    // Lesson: locked panel, and none of the lesson body is sent.
    await page.goto(`/lessons/${KIT_LESSON}`);
    await expect(page.getByRole("heading", { name: /part of the luminol forensics kit/i })).toBeVisible();
    expect(await page.content()).not.toContain("Add three drops from tube 6");
    // PDF and video: the server refuses to sign links.
    const pdf = await page.request.get(`/api/files/${KIT_PDF}`, { maxRedirects: 0 });
    expect(pdf.status()).toBe(403);
    const video = await page.request.get(`/api/video/${KIT_VIDEO}/playback`);
    expect(video.status()).toBe(403);
    expect(await video.text()).not.toMatch(/m3u8|token|\?t=/);
    // Subscription content is also refused.
    expect((await page.request.get(`/api/video/luminol-training-video/playback`)).status()).toBe(403);
    // Free content still works.
    expect((await page.request.get(`/api/video/luminol-case-intro-video/playback`)).status()).toBe(200);
    expect((await page.request.get(`/api/files/luminol-a0-worksheet`, { maxRedirects: 0 })).status()).toBe(302);
  });

  test("anonymous visitor", async ({ request }) => {
    expect((await request.get(`/api/files/${KIT_PDF}`, { maxRedirects: 0 })).status()).toBe(401);
    expect((await request.get(`/api/video/${KIT_VIDEO}/playback`)).status()).toBe(401);
    expect((await request.get(`/api/files/luminol-a0-worksheet`, { maxRedirects: 0 })).status()).toBe(401);
  });

  test("signed links can't be forged, reused for another file, or used after they expire", async ({ browser, request }) => {
    // Media without a token, or with a forged one, is refused.
    expect((await request.get(`/api/media/hls/${KIT_VIDEO}/master.m3u8`)).status()).toBe(403);
    expect((await request.get(`/api/media/hls/${KIT_VIDEO}/master.m3u8?t=forged`)).status()).toBe(403);
    expect((await request.get(`/api/media/file/files/${KIT_PDF}.pdf?exp=9999999999&sig=forged`)).status()).toBe(403);
    expect((await request.get(`/api/media/file/files/${KIT_PDF}.pdf?exp=1&sig=x`)).status()).toBe(403);

    // A real token for a free video does not open a paid one.
    const page = await newSignedInPage(browser, { email: uniqueEmail("swap") });
    const free = await (await page.request.get(`/api/video/luminol-case-intro-video/playback`)).json();
    const token = new URL(free.hls, "http://x").searchParams.get("t");
    expect((await request.get(`/api/media/hls/${KIT_VIDEO}/master.m3u8?t=${token}`)).status()).toBe(403);
    // A real signature for one file does not open another.
    const signed = await page.request.get(`/api/files/luminol-a0-worksheet?format=json`);
    const u = new URL((await signed.json()).url, "http://x");
    const other = `/api/media/file/files/${KIT_PDF}.pdf?${u.searchParams}`;
    expect((await request.get(other)).status()).toBe(403);
  });

  test("after redeeming, the same teacher gets signed links", async ({ browser }) => {
    const staff = await studioPage(browser);
    const [code] = await createCodes(staff, "Luminol Forensics Kit", 1);
    const page = await newSignedInPage(browser, { email: uniqueEmail("gets") });
    expect((await page.request.get(`/api/video/${KIT_VIDEO}/playback`)).status()).toBe(403);
    const r = await page.request.post("/api/redeem", { data: { code } });
    expect(r.status()).toBe(200);
    const pb = await page.request.get(`/api/video/${KIT_VIDEO}/playback`);
    expect(pb.status()).toBe(200);
    const body = await pb.json();
    expect(body.hls).toContain("?t=");
    expect((await page.request.get(body.hls)).status()).toBe(200);
    expect((await page.request.get(body.captions)).headers()["content-type"]).toContain("text/vtt");
  });
});

test("a code cannot be redeemed twice, including two attempts at the same moment", async ({ browser }) => {
  const staff = await studioPage(browser);
  const [code] = await createCodes(staff, "Luminol Forensics Kit", 1);
  const a = await newSignedInPage(browser, { email: uniqueEmail("race-a") });
  const b = await newSignedInPage(browser, { email: uniqueEmail("race-b") });
  const [ra, rb] = await Promise.all([a.request.post("/api/redeem", { data: { code } }), b.request.post("/api/redeem", { data: { code } })]);
  const statuses = [ra.status(), rb.status()].sort();
  expect(statuses).toEqual([200, 409]);
  const loser = ra.status() === 409 ? await ra.json() : await rb.json();
  expect(loser.error).toBe("already_redeemed");
  // And a third, later attempt also fails.
  const c = await newSignedInPage(browser, { email: uniqueEmail("race-c") });
  expect((await c.request.post("/api/redeem", { data: { code } })).status()).toBe(409);
});
