# Accessibility Conformance Report (VPAT® 2.5, WCAG edition) - DRAFT

**Product:** Curiocrate Materials (materials.curiocrate.org)
**Report date:** 2026-10-31
**Standard:** WCAG 2.1 Level A and AA
**Evaluation methods:** automated axe-core 4.x scans (tags wcag2a, wcag2aa, wcag21a, wcag21aa) of 55 page states across teacher, student, company and anonymous roles, run by the end-to-end suite in Google Chrome; keyboard-only end-to-end tests; Chromebook simulation (1366x768, 4x CPU slowdown, slow network); manual review of screenshots.
**Automated result:** 0 violations on every scanned page state.

> Draft built from the actual check results in `test-results/a11y/` by `scripts/vpat.mjs`. A manual audit with a screen reader (NVDA/JAWS/VoiceOver/ChromeVox) is still needed before publishing.

## Pages and states checked

- p1 accessibility (`/accessibility`): 0 violations
- p1 admin-audit (`/admin/audit`): 0 violations
- p1 admin-lookup (`/admin?q=LMN`): 0 violations
- p1 admin-order (`/admin/orders/78b75c23-82d1-4478-a31d-4de45eb4ad34`): 0 violations
- p1 admin-orders (`/admin/orders`): 0 violations
- p1 admin-print (`/admin/orders/78b75c23-82d1-4478-a31d-4de45eb4ad34/print`): 0 violations
- p1 admin-school (`/admin/schools/ca881b50-9862-4b2f-8cc6-a1117d1e21b3`): 0 violations
- p1 admin-schools (`/admin/schools`): 0 violations
- p1 admin-usage (`/admin/usage`): 0 violations
- p1 catalog (`/catalog`): 0 violations
- p1 catalog-filtered (`/catalog?grade=6-8&type=instructions&free=1`): 0 violations
- p1 dashboard (`/dashboard`): 0 violations
- p1 home (`/`): 0 violations
- p1 kit-circuits (`/kits/circuits`): 0 violations
- p1 kit-clean-water (`/kits/clean-water`): 0 violations
- p1 kit-luminol (`/kits/luminol`): 0 violations
- p1 kit-owned (`/kits/luminol`): 0 violations
- p1 lesson-free (`/lessons/luminol-a0-predict`): 0 violations
- p1 lesson-locked-anon (`/lessons/luminol-a1-why-it-glows`): 0 violations
- p1 lesson-open-video-pdf (`/lessons/luminol-a1-why-it-glows`): 0 violations
- p1 lesson-pdf-item (`/lessons/luminol-teacher-guide`): 0 violations
- p1 lesson-subscription-locked (`/lessons/luminol-training-walkthrough`): 0 violations
- p1 not-found (`/this-does-not-exist`): 0 violations
- p1 onboarding (`/onboarding`): 0 violations
- p1 plans (`/plans`): 0 violations
- p1 privacy (`/privacy`): 0 violations
- p1 redeem-anon (`/redeem?code=LMN-AAAA-BBBB-CCCC`): 0 violations
- p1 redeem-error (`/redeem`): 0 violations
- p1 redeem-form (`/redeem`): 0 violations
- p1 redeem-success (`/redeem`): 0 violations
- p1 schools-it (`/schools/it`): 0 violations
- p1 signin (`/signin`): 0 violations
- p1 signin-error (`/signin?error=state`): 0 violations
- p1 test-idp (`/auth/test-idp?provider=google&state=eGMFhIfmnhpW37orn52slw&redirect_uri=http%3A%2F%2Flocalhost%3A3210%2Fapi%2Fauth%2Fgoogle%2Fcallback&code_challenge=5ofdM9Vw9scOWPNYeQFaab8T-lrE4B3Hi4YLcSIUHis`): 0 violations
- p1 training (`/training`): 0 violations
- p23 class (`/classes/e97243df-98e3-438f-9e4f-57e3a4288828`): 0 violations
- p23 classes (`/classes`): 0 violations
- p23 company-login (`/company/login`): 0 violations
- p23 join (`/join`): 0 violations
- p23 join-error (`/join?error=1`): 0 violations
- p23 labs (`/labs`): 0 violations
- p23 lab-circuits (`/labs/circuit-sandbox`): 0 violations
- p23 lab-filter (`/labs/filter-designer`): 0 violations
- p23 lab-luminol (`/labs/luminol-limit`): 0 violations
- p23 plans-signed-in (`/plans`): 0 violations
- p23 studio-content (`/admin/content`): 0 violations
- p23 studio-edit (`/admin/content/f84e0a94-6813-40fc-94ad-6ae1ef894e4f`): 0 violations
- p23 studio-kit (`/admin/kits/new`): 0 violations
- p23 studio-new-lesson (`/admin/content/new?type=instructions`): 0 violations
- p23 studio-new-video (`/admin/content/new?type=video`): 0 violations
- p23 studio-orders (`/admin/orders`): 0 violations
- p2 student lab (`/labs/luminol-limit`): 0 violations
- p3 student class with curie (`/class`): 0 violations
- phase0 home chromebook-1366x768 (`/`): 0 violations
- phase0 home desktop-1440 (`/`): 0 violations

## WCAG 2.1 Report

| Criteria | Level | Conformance | Remarks and explanations |
| --- | --- | --- | --- |
| 1.1.1 Non-text Content | A | Supports | Automated (axe-core): pass. Decorative SVGs are aria-hidden; lab drawings carry a live text description. |
| 1.2.1 Audio-only and Video-only | A | Supports | Manual / end-to-end test. Every video has a full transcript under the player. |
| 1.2.2 Captions (Prerecorded) | A | Supports | Manual / end-to-end test. Every video has a WebVTT captions track, on by default (e2e asserts the track is showing). |
| 1.2.3 Audio Description or Media Alternative | A | Supports | Manual / end-to-end test. Transcript is a full text alternative. |
| 1.2.5 Audio Description (Prerecorded) | AA | Partially Supports | Manual / end-to-end test. Partially supports: stand-in videos are narrated slides; real kit videos will need described visuals review. |
| 1.3.1 Info and Relationships | A | Supports | Automated (axe-core): pass. Semantic headings, lists, tables with scoped headers, labelled form fields. |
| 1.3.2 Meaningful Sequence | A | Supports | Manual / end-to-end test. DOM order matches visual order. |
| 1.3.4 Orientation | AA | Supports | Manual / end-to-end test. Responsive layout; no orientation lock. |
| 1.3.5 Identify Input Purpose | AA | Supports | Automated (axe-core): pass. autocomplete set on email, name, organization fields. |
| 1.4.1 Use of Color | A | Supports | Automated (axe-core): pass. Tier and status shown with text labels, not color alone. |
| 1.4.3 Contrast (Minimum) | AA | Supports | Automated (axe-core): pass. Brand colors adjusted where needed (DECISIONS D-02). |
| 1.4.4 Resize Text | AA | Supports | Automated (axe-core): pass. rem-based type; no zoom restrictions. |
| 1.4.10 Reflow | AA | Supports | Manual / end-to-end test. Tested at 1366px and mobile widths with no horizontal scroll (e2e asserts no overflow). |
| 1.4.11 Non-text Contrast | AA | Supports | Manual / end-to-end test. Focus ring and control borders use pastel1 on the dark background. |
| 1.4.12 Text Spacing | AA | Supports | Manual / end-to-end test. No fixed-height text containers. |
| 1.4.13 Content on Hover or Focus | AA | Supports | Manual / end-to-end test. Dropdowns open on hover or Enter, close on Escape, and stay open while hovered. |
| 2.1.1 Keyboard | A | Supports | Automated (axe-core): pass. Keyboard-only e2e tests: sign-in, onboarding, redeem, lesson, video, transcript, labs. |
| 2.1.2 No Keyboard Trap | A | Supports | Manual / end-to-end test. Verified in keyboard e2e tests. |
| 2.1.4 Character Key Shortcuts | A | Supports | Manual / end-to-end test. No single-key shortcuts. |
| 2.2.2 Pause, Stop, Hide | A | Supports | Manual / end-to-end test. Star twinkle and circuit animation stop under prefers-reduced-motion. |
| 2.4.1 Bypass Blocks | A | Supports | Automated (axe-core): pass. Skip link on every page (e2e verified). |
| 2.4.2 Page Titled | A | Supports | Automated (axe-core): pass. Every page has a unique title. |
| 2.4.3 Focus Order | A | Supports | Automated (axe-core): not applicable on tested pages. Logical order; verified by keyboard e2e. |
| 2.4.4 Link Purpose (In Context) | A | Supports | Automated (axe-core): pass. Descriptive link text; locked items announce their state. |
| 2.4.6 Headings and Labels | AA | Supports | Automated (axe-core): not applicable on tested pages. Descriptive headings and labels. |
| 2.4.7 Focus Visible | AA | Supports | Manual / end-to-end test. Visible focus ring on every control (e2e checks outline). |
| 2.5.3 Label in Name | A | Supports | Automated (axe-core): pass.  |
| 3.1.1 Language of Page | A | Supports | Automated (axe-core): pass. lang=en. |
| 3.2.1 On Focus / 3.2.2 On Input | A | Supports | Manual / end-to-end test. No context changes on focus or input; filters apply on submit. |
| 3.3.1 Error Identification | A | Supports | Automated (axe-core): pass. Errors shown in role=alert text next to the form; invalid fields marked aria-invalid. |
| 3.3.2 Labels or Instructions | A | Supports | Automated (axe-core): pass. Every input has a visible label and hint. |
| 4.1.1 Parsing | A | Supports | Automated (axe-core): pass.  |
| 4.1.2 Name, Role, Value | A | Supports | Automated (axe-core): pass. Native controls; aria-pressed/expanded on toggles. |
| 4.1.3 Status Messages | AA | Supports | Automated (axe-core): not applicable on tested pages. Live regions for redeem results, lab results, Curie replies, copy confirmations. |

## Open items

- No automated violations. Pending: manual screen-reader audit; audio-description review for real kit videos (1.2.5).
