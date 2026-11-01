// TypeScript mirror of the few theme values needed outside CSS (meta tags, generated PDFs).
// Must match src/styles/tokens.css. This file and tokens.css are the only places literal colors may appear.
export const THEME = {
  void: "#03050f",
  deep: "#060d1f",
  navy: "#162a5c",
  pastel1: "#a8d4f0",
  cream: "#f0f7ff",
  lumGlow: "#46e3d3",
  gold: "#f0c070",
  brandBlue: "#1b7fe8",
  siteBg: "#f6f8fc", // the teacher & student site background (tokens.css --sx-bg)
  // Print colors for generated PDFs (light paper for school printers)
  printInk: "#0f2044",
  printMuted: "#4a5a72",
  printRule: "#c5d6e6",
  printAccent: "#1b7fe8",
  printTint: "#eef6fc",
  paper: "#ffffff",
} as const;
