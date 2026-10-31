import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { env } from "./env";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

const key = () => new TextEncoder().encode(env.sessionSecret());

/** Short-lived signed token (HS256) used for OAuth state, test-IdP codes and local media links. */
export async function signToken(payload: JWTPayload, ttlSec: number, audience: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSec)
    .sign(key());
}

export async function verifyToken<T extends JWTPayload>(token: string | null | undefined, audience: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience, algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}

export function hmac(value: string) {
  return createHmac("sha256", env.sessionSecret()).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
