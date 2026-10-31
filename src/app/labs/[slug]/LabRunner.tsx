"use client";

import { CircuitLab } from "@/components/labs/CircuitLab";
import { FilterLab } from "@/components/labs/FilterLab";
import { LuminolLab, type LabResult } from "@/components/labs/LuminolLab";

export function LabRunner({ slug }: { slug: string }) {
  const save = async (r: LabResult) => {
    await fetch(`/api/labs/${slug}/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
  };
  if (slug === "luminol-limit") return <LuminolLab onSave={save} />;
  if (slug === "circuit-sandbox") return <CircuitLab onSave={save} />;
  return <FilterLab onSave={save} />;
}
