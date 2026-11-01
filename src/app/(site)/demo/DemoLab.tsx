"use client";

import { LuminolLab } from "@/components/labs/LuminolLab";

// The public demo runs the real lab; results stay in the browser (nothing is sent or stored).
export function DemoLab() {
  return <LuminolLab onSave={async () => {}} />;
}
