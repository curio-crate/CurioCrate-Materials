import { eq } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { contentItems, kits } from "@/db/schema";
import { createFileItem, fileLibrary, uploadFile } from "@/lib/cms";
import { fileKind, fileLabel, looksLike, titleFromFileName } from "@/lib/files";
import { MEDIA_DIR } from "@/lib/storage";
import { freshDb } from "./helpers/db";

const actor = { teacherId: null, email: "CurioCrateAdmin" };
const PDF = Buffer.from("%PDF-1.4\n%test\n");
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("word/document.xml")]);
const written: string[] = [];
let kitId: string;

beforeAll(async () => {
  await freshDb();
  const d = await db();
  [{ id: kitId }] = await d.select({ id: kits.id }).from(kits).limit(1);
});

afterAll(async () => {
  await Promise.all(written.map((k) => fs.rm(path.join(MEDIA_DIR, k), { force: true })));
});

const input = (title: string) => ({ kitId, parentId: null, requiredTier: "kit_owner" as const, title, summary: "" });

describe("files studio", () => {
  it("knows each accepted type by extension and first bytes", () => {
    expect(fileKind("Guide.PDF")?.ext).toBe("pdf");
    expect(fileKind("notes.exe")).toBeNull();
    expect(looksLike(fileKind("a.pdf")!, PDF)).toBe(true);
    expect(looksLike(fileKind("a.pdf")!, DOCX)).toBe(false);
    expect(looksLike(fileKind("a.docx")!, DOCX)).toBe(true);
    expect(fileLabel("slides.pptx")).toBe("Slides");
    expect(titleFromFileName("Lab_worksheet-v2.pdf")).toBe("Lab worksheet v2");
  });

  it("creates a live handout from a PDF and from a Word file", async () => {
    const pdf = await createFileItem(actor, input("Magnet worksheet"), new File([PDF], "magnet worksheet.pdf", { type: "application/pdf" }));
    const doc = await createFileItem(actor, input("Teacher notes"), new File([DOCX], "notes.docx"));
    const d = await db();
    const [p] = await d.select().from(contentItems).where(eq(contentItems.id, pdf.id));
    const [w] = await d.select().from(contentItems).where(eq(contentItems.id, doc.id));
    written.push(p.fileKey!, w.fileKey!);
    expect(p).toMatchObject({ type: "pdf", fileName: "magnet_worksheet.pdf", mediaStatus: "ready", fileBytes: PDF.length });
    expect(p.fileKey).toMatch(/^uploads\/file\/\d{4}-\d{2}\/[0-9a-f-]{36}-magnet_worksheet\.pdf$/);
    expect(w.fileKey).toMatch(/notes\.docx$/);
    expect(await fs.readFile(path.join(MEDIA_DIR, w.fileKey!))).toEqual(DOCX);
    const lib = await fileLibrary();
    expect(lib.files.map((f) => f.id)).toEqual(expect.arrayContaining([pdf.id, doc.id]));
  });

  it("rejects a renamed or unsupported file and leaves nothing behind", async () => {
    const d = await db();
    const before = (await d.select({ id: contentItems.id }).from(contentItems)).length;
    await expect(createFileItem(actor, input("Fake"), new File([DOCX], "fake.pdf"))).rejects.toThrow(/not a real PDF/);
    await expect(createFileItem(actor, input("Program"), new File([PDF], "setup.exe"))).rejects.toThrow(/isn't a supported file/);
    expect((await d.select({ id: contentItems.id }).from(contentItems)).length).toBe(before);
  });

  it("replacing a PDF with slides switches the stored file", async () => {
    const row = await createFileItem(actor, input("Deck"), new File([PDF], "deck.pdf"));
    const d = await db();
    const [before] = await d.select().from(contentItems).where(eq(contentItems.id, row.id));
    await uploadFile(actor, row.id, new File([DOCX], "deck.pptx"));
    const [r] = await d.select().from(contentItems).where(eq(contentItems.id, row.id));
    written.push(r.fileKey!);
    expect(r.fileKey).toMatch(/deck\.pptx$/);
    expect(fileLabel(r.fileName)).toBe("Slides");
    // The replaced file is removed from storage.
    await expect(fs.stat(path.join(MEDIA_DIR, before.fileKey!))).rejects.toThrow();
  });
});
