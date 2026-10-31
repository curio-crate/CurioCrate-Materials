"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-solid btn-sm" onClick={() => window.print()}>
      Print sheet
    </button>
  );
}
