// Writes docs/vpat.md (VPAT 2.5, WCAG edition, draft) from the axe-core results that the e2e suite records
// in test-results/a11y/*.json. Usage: node scripts/vpat.mjs (after npm run test:e2e)
import fs from "node:fs";
import path from "node:path";

const dir = path.join("test-results", "a11y");
const runs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) : [];
if (!runs.length) throw new Error("No accessibility results found. Run npm run test:e2e first.");
const violations = runs.flatMap((r) => r.violations.map((v) => ({ ...v, page: r.label })));
const passes = new Set(runs.flatMap((r) => r.passes));
const date = new Date().toISOString().slice(0, 10);

// WCAG 2.1 A/AA criteria → the axe rules that test them (automated coverage) and our manual/e2e evidence.
const CRITERIA = [
  ["1.1.1 Non-text Content", "A", ["image-alt", "svg-img-alt", "role-img-alt", "input-image-alt"], "Decorative SVGs are aria-hidden; lab drawings carry a live text description."],
  ["1.2.1 Audio-only and Video-only", "A", [], "Every video has a full transcript under the player."],
  ["1.2.2 Captions (Prerecorded)", "A", [], "Every video has a WebVTT captions track, on by default (e2e asserts the track is showing)."],
  ["1.2.3 Audio Description or Media Alternative", "A", [], "Transcript is a full text alternative."],
  ["1.2.5 Audio Description (Prerecorded)", "AA", [], "Partially supports: stand-in videos are narrated slides; real kit videos will need described visuals review."],
  ["1.3.1 Info and Relationships", "A", ["list", "listitem", "definition-list", "dlitem", "th-has-data-cells", "td-headers-attr", "label", "heading-order"], "Semantic headings, lists, tables with scoped headers, labelled form fields."],
  ["1.3.2 Meaningful Sequence", "A", [], "DOM order matches visual order."],
  ["1.3.4 Orientation", "AA", [], "Responsive layout; no orientation lock."],
  ["1.3.5 Identify Input Purpose", "AA", ["autocomplete-valid"], "autocomplete set on email, name, organization fields."],
  ["1.4.1 Use of Color", "A", ["link-in-text-block"], "Tier and status shown with text labels, not color alone."],
  ["1.4.3 Contrast (Minimum)", "AA", ["color-contrast"], "Brand colors adjusted where needed (DECISIONS D-02)."],
  ["1.4.4 Resize Text", "AA", ["meta-viewport"], "rem-based type; no zoom restrictions."],
  ["1.4.10 Reflow", "AA", [], "Tested at 1366px and mobile widths with no horizontal scroll (e2e asserts no overflow)."],
  ["1.4.11 Non-text Contrast", "AA", [], "Focus ring and control borders use pastel1 on the dark background."],
  ["1.4.12 Text Spacing", "AA", [], "No fixed-height text containers."],
  ["1.4.13 Content on Hover or Focus", "AA", [], "Dropdowns open on hover or Enter, close on Escape, and stay open while hovered."],
  ["2.1.1 Keyboard", "A", ["scrollable-region-focusable"], "Keyboard-only e2e tests: sign-in, onboarding, redeem, lesson, video, transcript, labs."],
  ["2.1.2 No Keyboard Trap", "A", [], "Verified in keyboard e2e tests."],
  ["2.1.4 Character Key Shortcuts", "A", [], "No single-key shortcuts."],
  ["2.2.2 Pause, Stop, Hide", "A", [], "Star twinkle and circuit animation stop under prefers-reduced-motion."],
  ["2.4.1 Bypass Blocks", "A", ["bypass", "region", "skip-link"], "Skip link on every page (e2e verified)."],
  ["2.4.2 Page Titled", "A", ["document-title"], "Every page has a unique title."],
  ["2.4.3 Focus Order", "A", ["tabindex"], "Logical order; verified by keyboard e2e."],
  ["2.4.4 Link Purpose (In Context)", "A", ["link-name"], "Descriptive link text; locked items announce their state."],
  ["2.4.6 Headings and Labels", "AA", ["empty-heading"], "Descriptive headings and labels."],
  ["2.4.7 Focus Visible", "AA", [], "Visible focus ring on every control (e2e checks outline)."],
  ["2.5.3 Label in Name", "A", ["label-content-name-mismatch"], ""],
  ["3.1.1 Language of Page", "A", ["html-has-lang", "html-lang-valid"], "lang=en."],
  ["3.2.1 On Focus / 3.2.2 On Input", "A", [], "No context changes on focus or input; filters apply on submit."],
  ["3.3.1 Error Identification", "A", ["aria-valid-attr-value"], "Errors shown in role=alert text next to the form; invalid fields marked aria-invalid."],
  ["3.3.2 Labels or Instructions", "A", ["label", "select-name"], "Every input has a visible label and hint."],
  ["4.1.1 Parsing", "A", ["duplicate-id", "duplicate-id-aria"], ""],
  ["4.1.2 Name, Role, Value", "A", ["button-name", "aria-allowed-attr", "aria-required-attr", "aria-roles", "nested-interactive"], "Native controls; aria-pressed/expanded on toggles."],
  ["4.1.3 Status Messages", "AA", ["aria-allowed-role"], "Live regions for redeem results, lab results, Curie replies, copy confirmations."],
];

const failing = (rules) => violations.filter((v) => rules.includes(v.id));
const rows = CRITERIA.map(([name, level, rules, note]) => {
  const f = failing(rules);
  const level2 = f.length ? "Partially Supports" : name.startsWith("1.2.5") ? "Partially Supports" : "Supports";
  const auto = rules.length ? `Automated (axe-core): ${rules.filter((r) => passes.has(r)).length ? "pass" : "not applicable on tested pages"}${f.length ? `, ${f.length} issue(s): ${[...new Set(f.map((x) => x.page))].join(", ")}` : ""}.` : "Manual / end-to-end test.";
  return `| ${name} | ${level} | ${level2} | ${auto} ${note} |`;
});

const md = `# Accessibility Conformance Report (VPAT® 2.5, WCAG edition) - DRAFT

**Product:** Curiocrate Materials (materials.curiocrate.org)
**Report date:** ${date}
**Standard:** WCAG 2.1 Level A and AA
**Evaluation methods:** automated axe-core ${"4.x"} scans (tags wcag2a, wcag2aa, wcag21a, wcag21aa) of ${runs.length} page states across teacher, student, company and anonymous roles, run by the end-to-end suite in Google Chrome; keyboard-only end-to-end tests; Chromebook simulation (1366x768, 4x CPU slowdown, slow network); manual review of screenshots.
**Automated result:** ${violations.length === 0 ? "0 violations on every scanned page state." : `${violations.length} violation(s) remain (listed below).`}

> Draft built from the actual check results in \`test-results/a11y/\` by \`scripts/vpat.mjs\`. A manual audit with a screen reader (NVDA/JAWS/VoiceOver/ChromeVox) is still needed before publishing.

## Pages and states checked

${runs.map((r) => `- ${r.label} (\`${r.url}\`): ${r.violations.length} violations`).join("\n")}

## WCAG 2.1 Report

| Criteria | Level | Conformance | Remarks and explanations |
| --- | --- | --- | --- |
${rows.join("\n")}

## Open items

${violations.length ? violations.map((v) => `- ${v.page}: ${v.id} (${v.impact}): ${v.help}`).join("\n") : "- No automated violations. Pending: manual screen-reader audit; audio-description review for real kit videos (1.2.5)."}
`;
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(path.join("docs", "vpat.md"), md);
console.log(`docs/vpat.md written from ${runs.length} page states, ${violations.length} violations`);
