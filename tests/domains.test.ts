import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALLOWED_DOMAINS } from "@/lib/domains";

// Districts allow-list the domains in src/lib/domains.ts. Fail if code references an external https
// domain that is not on that list (server-to-server API hosts are listed separately below).
const SERVER_ONLY = new Set(["oauth2.googleapis.com", "openidconnect.googleapis.com", "api.stripe.com", "api.anthropic.com", "api.mux.com", "clever.com", "api.clever.com", "launchpad.classlink.com", "nodeapi.classlink.com"]);
const IGNORE = new Set(["www.w3.org", "react.dev", "nextjs.org", "openapi.vercel.sh"]);

function walk(dir: string, out: string[] = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("domain allow-list for school web filters", () => {
  it("lists every browser-facing domain the app uses", () => {
    const listed = new Set(ALLOWED_DOMAINS.map((d) => d.domain));
    const missing = new Set<string>();
    for (const file of walk(path.join(process.cwd(), "src"))) {
      if (file.endsWith(path.join("lib", "domains.ts"))) continue;
      for (const m of fs.readFileSync(file, "utf8").matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
        const host = m[1].toLowerCase();
        if (!listed.has(host) && !SERVER_ONLY.has(host) && !IGNORE.has(host)) missing.add(`${host} (${path.relative(process.cwd(), file)})`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it("docs/domains.md matches the list", () => {
    const doc = fs.readFileSync(path.join(process.cwd(), "docs", "domains.md"), "utf8");
    for (const d of ALLOWED_DOMAINS) expect(doc, d.domain).toContain(d.domain);
  });
});
