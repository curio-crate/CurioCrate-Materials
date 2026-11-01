// Supplementary materials attached to a lesson in Studio ("Create a new lesson" → + Teacher training, + Demo, …).
// Shared by Studio, the upload routes and the teacher-facing lesson page. Teacher-only kinds are never shown to
// students, even when the lesson is assigned to their class.

export const MATERIAL_KINDS = ["training_video", "demo", "manual", "teacher_manual", "file"] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

/** video: a video only; file: a document only; any: either (a video plays on the page, a document downloads). */
export type MaterialMedia = "video" | "file" | "any";

export const MATERIAL: Record<MaterialKind, { label: string; heading: string; media: MaterialMedia; teacherOnly: boolean; icon: string }> = {
  training_video: { label: "Teacher training", heading: "Teacher training", media: "any", teacherOnly: true, icon: "training" },
  demo: { label: "Demo", heading: "Demo", media: "any", teacherOnly: false, icon: "video" },
  manual: { label: "Manual", heading: "Manuals", media: "file", teacherOnly: false, icon: "manual" },
  teacher_manual: { label: "Teacher manual", heading: "Teacher manual", media: "file", teacherOnly: true, icon: "pdf" },
  file: { label: "File", heading: "Handouts", media: "file", teacherOnly: false, icon: "pdf" },
};

export const asMaterialKind = (v: unknown): MaterialKind | null => (MATERIAL_KINDS.includes(v as MaterialKind) ? (v as MaterialKind) : null);

export const isTeacherOnly = (kind: string | null | undefined) => !!kind && !!asMaterialKind(kind) && MATERIAL[kind as MaterialKind].teacherOnly;
