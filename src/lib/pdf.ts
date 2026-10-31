import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { PdfSpec } from "@/content/lessons";
import { THEME } from "@/styles/tokens";

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Renders a lesson handout / guide as a print-friendly Letter PDF with the Curiocrate header. */
export async function renderPdf(spec: PdfSpec, meta: { title: string; slug: string }) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${spec.heading} · ${spec.subtitle}`);
  doc.setAuthor("Curiocrate");
  doc.setSubject(meta.title);
  doc.setLanguage("en-US");
  doc.setProducer("materials.curiocrate.org");
  doc.setCreator("Curiocrate Materials");

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "brand", "cclogofull5.png"));
  const logo = await doc.embedPng(logoBytes);

  const W = 612;
  const H = 792;
  const M = 56;
  let page: PDFPage;
  let y = 0;
  let pageNo = 0;

  const newPage = () => {
    page = doc.addPage([W, H]);
    pageNo++;
    page.drawRectangle({ x: 0, y: H - 64, width: W, height: 64, color: hex(THEME.void) });
    const lh = 34;
    page.drawImage(logo, { x: M - 6, y: H - 49, width: (logo.width / logo.height) * lh, height: lh });
    const label = "MATERIALS";
    page.drawText(label, { x: W - M - mono.widthOfTextAtSize(label, 8), y: H - 36, size: 8, font: mono, color: hex(THEME.pastel1) });
    page.drawText(`materials.curiocrate.org  ·  ${meta.title}`, { x: M, y: 30, size: 8, font: sans, color: hex(THEME.printMuted) });
    const pn = `${pageNo}`;
    page.drawText(pn, { x: W - M - sans.widthOfTextAtSize(pn, 8), y: 30, size: 8, font: sans, color: hex(THEME.printMuted) });
    page.drawLine({ start: { x: M, y: 44 }, end: { x: W - M, y: 44 }, thickness: 0.5, color: hex(THEME.printRule) });
    y = H - 104;
  };
  const ensure = (h: number) => {
    if (y - h < 64) newPage();
  };
  const wrap = (text: string, font: PDFFont, size: number, width: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > width && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  newPage();
  page!.drawText(spec.subtitle.toUpperCase(), { x: M, y, size: 8.5, font: mono, color: hex(THEME.printAccent) });
  y -= 34;
  page!.drawText(spec.heading, { x: M, y, size: 30, font: serif, color: hex(THEME.printInk) });
  y -= 18;
  page!.drawText("Name ____________________________   Class ________   Date ____________", { x: M, y: y - 10, size: 9.5, font: sans, color: hex(THEME.printMuted) });
  y -= 44;

  for (const section of spec.sections) {
    ensure(70);
    page!.drawRectangle({ x: M, y: y - 6, width: 3, height: 18, color: hex(THEME.printAccent) });
    page!.drawText(section.heading, { x: M + 12, y, size: 15, font: serifItalic, color: hex(THEME.printInk) });
    y -= 26;
    for (const line of section.lines) {
      for (const l of wrap(line, sans, 11, W - 2 * M - 12)) {
        ensure(18);
        page!.drawText(l, { x: M + 12, y, size: 11, font: sans, color: hex(THEME.printInk) });
        y -= 17;
      }
    }
    for (let i = 0; i < (section.writeLines ?? 0); i++) {
      ensure(26);
      y -= 12;
      page!.drawLine({ start: { x: M + 12, y }, end: { x: W - M, y }, thickness: 0.6, color: hex(THEME.printRule) });
      y -= 12;
    }
    y -= 18;
  }

  ensure(40);
  page!.drawRectangle({ x: M, y: y - 26, width: W - 2 * M, height: 34, color: hex(THEME.printTint) });
  page!.drawText("Safety first: follow the safety page in your manual and your teacher's directions.", { x: M + 12, y: y - 13, size: 9, font: sansBold, color: hex(THEME.printInk) });
  return doc.save();
}
