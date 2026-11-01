import { joinClass } from "@/lib/classes";

/** Joins a class and fails the test if the code is wrong or the class is full. */
export async function joinOrFail(code: string) {
  const j = await joinClass(code);
  if (!j || j.full) throw new Error(`could not join ${code}`);
  return j;
}
