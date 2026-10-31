import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/crypto";
import { cleanPackagePath, PACKAGE_TOKEN_AUDIENCE, packageMime } from "@/lib/packages";
import { getObjectBytes } from "@/lib/storage";

// Serves the files of an interactive (HTML/JS) lesson. The token in the path is issued by the lesson page only
// after the server-side access check, expires, and is bound to one package, so relative links inside the lesson
// (scripts, images, data files) keep working without exposing the package to anyone else.
// Every response is sandboxed: the lesson runs in an opaque origin, so it can't read the teacher's cookies or
// call this site's APIs as them, even if the file is opened directly.

// The site's origin is named explicitly: inside an opaque-origin sandbox, 'self' alone may match nothing.
const sandboxPolicy = (origin: string) =>
  [
    "sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock",
    `default-src 'self' ${origin} https: data: blob: 'unsafe-inline' 'unsafe-eval'`,
    `connect-src 'self' ${origin} https: data: blob:`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'none'",
    "object-src 'none'",
  ].join("; ");

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export async function GET(req: NextRequest, ctx: RouteContext<"/api/lesson-pkg/[token]/[...path]">) {
  const { token, path } = await ctx.params;
  const claims = await verifyToken<{ k: string }>(token, PACKAGE_TOKEN_AUDIENCE);
  if (!claims?.k?.startsWith("lessons/")) return new Response("This lesson link expired. Reload the lesson page.", { status: 403, headers: { "Content-Type": "text/plain" } });
  const rel = cleanPackagePath(path.map(safeDecode).join("/"));
  if (!rel) return new Response("Not found", { status: 404 });
  const bytes = await getObjectBytes(`${claims.k}/${rel}`);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": packageMime(rel),
      "Content-Length": String(bytes.length),
      "Content-Security-Policy": sandboxPolicy(new URL(req.url).origin),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      // The sandboxed lesson has an opaque ("null") origin: allow it to fetch its own data files and ES modules.
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
