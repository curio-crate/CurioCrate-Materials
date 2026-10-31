import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// Runs axe-core against the current page (WCAG 2.1 A + AA) and records the result so docs/vpat.md can be
// written from real check output. Fails the test on any violation.
export async function expectAccessible(page: Page, label: string) {
  await page.evaluate(() => document.fonts.ready);
  // Measure the settled page: wait for finite entrance animations (fade-ins) to finish; the star twinkle is infinite.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const record = {
    label,
    url: page.url().replace(/^https?:\/\/[^/]+/, ""),
    violations: results.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })),
    passes: results.passes.map((p) => p.id),
    incomplete: results.incomplete.map((i) => i.id),
  };
  const dir = path.join("test-results", "a11y");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${label.replace(/[^a-z0-9]+/gi, "_")}.json`), JSON.stringify(record, null, 1));
  const summary = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ") + " :: " + n.failureSummary?.split("\n")[1]).join("\n  ")}`)
    .join("\n");
  expect(results.violations, `axe violations on ${label}:\n${summary}`).toEqual([]);
}
