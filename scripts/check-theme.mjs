// Fails if any UI file hard-codes a color or font instead of using the shared theme.
// Allowed: src/styles/tokens.css and src/styles/tokens.ts (the theme itself).
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const ALLOW = new Set([path.join(SRC, "styles", "tokens.css"), path.join(SRC, "styles", "tokens.ts")]);

const RULES = [
  { name: "hex color", re: /(?<![&\w/-])#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{1,5})?\b(?![-\w])/g, files: /\.(css|tsx?)$/ },
  { name: "rgb()/hsl() color", re: /\b(?:rgba?|hsla?)\(\s*\d/g, files: /\.(css|tsx?)$/ },
  { name: "named color", re: /(?:^|[\s:;{])(?:color|background|fill|stroke|border(?:-color)?)\s*:\s*(?:white|black|red|blue|green|gray|grey|orange|purple|yellow)\b/gi, files: /\.css$/ },
  { name: "font-family literal", re: /font-family\s*:(?!\s*(?:var\(|inherit))[^;]+;/g, files: /\.css$/ },
  { name: "fontFamily literal", re: /fontFamily\s*:\s*["'`]/g, files: /\.tsx?$/ },
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const problems = [];
for (const file of walk(SRC)) {
  if (ALLOW.has(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  for (const rule of RULES) {
    if (!rule.files.test(file)) continue;
    lines.forEach((line, i) => {
      if (line.includes("theme-check-ignore")) return;
      for (const m of line.matchAll(rule.re)) problems.push(`${path.relative(ROOT, file)}:${i + 1}  ${rule.name}: ${m[0].trim()}`);
    });
  }
}

if (problems.length) {
  console.error(`Theme check failed: ${problems.length} hard-coded value(s). Use tokens from src/styles/tokens.css.\n`);
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Theme check passed: no hard-coded colors or fonts outside src/styles/tokens.*");
