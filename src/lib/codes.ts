import { randomBytes, randomInt } from "node:crypto";

// Crockford base32: no I, L, O, U, so codes read aloud or typed from a box survive common mistakes.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomChars(n: number) {
  const bytes = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] & 31];
  return out;
}

/** Redemption code: kit prefix + 12 random base32 chars (60 bits). Stored normalized, shown grouped. */
export function newRedemptionCode(kitCode: string) {
  return normalizeCode(kitCode + randomChars(12));
}

/**
 * Uppercase, strip separators, and map look-alike characters (O→0, I/L→1, U→V) in the random part.
 * The 3-character kit prefix (e.g. LMN, H2O) is kept literally.
 */
export function normalizeCode(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const rest = clean.slice(3).replace(/O/g, "0").replace(/[IL]/g, "1").replace(/U/g, "V");
  return clean.slice(0, 3) + rest;
}

/** LMN7K3DQ9TX2MPR → LMN-7K3D-Q9TX-2MPR */
export function formatCode(normalized: string) {
  const prefix = normalized.slice(0, 3);
  const rest = normalized.slice(3).match(/.{1,4}/g) ?? [];
  return [prefix, ...rest].join("-");
}

export function isWellFormedCode(normalized: string) {
  return /^[0-9A-Z]{3}[0-9ABCDEFGHJKMNPQRSTVWXYZ]{12}$/.test(normalized);
}

/** Short join code for classes and schools: letters only (no I, L, O, U), easy to read off a board. */
export function newShortCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(10, 32)];
  return out;
}
