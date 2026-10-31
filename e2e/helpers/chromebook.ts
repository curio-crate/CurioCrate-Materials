import type { Browser, Page } from "@playwright/test";

// Low-end Chromebook simulation: 1366x768, CPU slowed 4x, and a slow school network
// (~1.6 Mbps down / 750 kbps up, 150 ms round trip: Chrome DevTools "Fast 3G" class).
export const CHROMEBOOK = { width: 1366, height: 768 };
export const NETWORK = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
export const CPU_SLOWDOWN = 4;

export async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", NETWORK);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
  return cdp;
}

export async function chromebookPage(browser: Browser, storageFrom?: Page) {
  const ctx = await browser.newContext({ viewport: CHROMEBOOK, storageState: storageFrom ? await storageFrom.context().storageState() : undefined });
  const page = await ctx.newPage();
  await throttle(page);
  return page;
}

/** Loads a URL and returns timing; asserts nothing overflows horizontally at 1366px. */
export async function measuredLoad(page: Page, url: string) {
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  const loadMs = Date.now() - t0;
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const lcp = (performance.getEntriesByType("largest-contentful-paint") as PerformanceEntry[]).at(-1)?.startTime ?? null;
    return { domContentLoaded: nav?.domContentLoadedEventEnd ?? null, lcp, overflow: document.documentElement.scrollWidth - window.innerWidth };
  });
  return { loadMs, ...metrics };
}
