// User agreements. Bump TERMS_VERSION whenever /terms changes in substance; accounts store the version they accepted.
export const TERMS_VERSION = "2026-11-01";

/**
 * Students younger than this can't make their own account: an email address from a child under 13 would need
 * verifiable parental consent (COPPA). They use a class code from their teacher instead, which stores nothing
 * about them and runs under the school's authorization.
 */
export const STUDENT_MIN_AGE = 13;

/**
 * Age from birth month (1-12) and year. Without a day, a student in their birth month is treated as not having
 * had the birthday yet, so the answer can only err on the younger (safer) side.
 */
export function ageFrom(year: number, month: number, now = new Date()) {
  const age = now.getFullYear() - year;
  return month >= now.getMonth() + 1 ? age - 1 : age;
}
