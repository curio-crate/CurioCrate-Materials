import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, contentItems, curieMessages, curieUsage, studentSessions, type Block } from "@/db/schema";

// Curie.AI: a hint-giving lab partner for grades 4-10.
// - Off by default; a teacher turns it on per class. Students reach it only through a class-code session.
// - Every message passes our own filters before and after the model (personal info, age-inappropriate,
//   off-topic, answer-fishing). The model never sees anything a filter refused.
// - Daily message limit per class. Chats are deleted after CURIE_RETENTION_DAYS. Never used for training:
//   requests go to the Anthropic API, whose commercial terms exclude API data from model training.

export const CURIE_MODEL = process.env.CURIE_MODEL || "claude-opus-5-5";
const today = () => new Date().toISOString().slice(0, 10);

const PII = [/[\w.+-]+@[\w-]+\.[\w.]+/, /\b(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/, /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|blvd)\b/i, /\bmy (full |last )?name is\b/i, /\bi live (at|on)\b/i, /\bmy (address|phone|password|birthday)\b/i];
const UNSAFE = /\b(kill|murder|gun|weapon|bomb|explosive|drugs?|vape|alcohol|beer|sex|sexy|porn|nude|naked|hate|racist|slur|fuck|shit|bitch|damn|ass(hole)?|dick)\b/i;
const SELF_HARM = /\b(kill myself|suicide|self[- ]harm|hurt myself|cut myself|want to die)\b/i;
const MAKE_HARM = /\b(make|build|mix|create)\b.*\b(poison|toxic gas|explosive|bomb|weapon)\b/i;
const ANSWER_FISHING = /\b(just (tell|give) me (the )?answer|what('?s| is) the answer|do my (homework|worksheet)|write (it|my answer) for me)\b/i;
const SCIENCE = /\b(why|how|what|glow|light|luminol|blood|catalyst|reaction|chemical|redox|electron|energy|ph|acid|base|dilution|tube|sample|control|evidence|data|graph|predict|hypothes|experiment|test|circuit|bulb|battery|wire|current|series|parallel|switch|filter|water|sand|gravel|charcoal|turbidity|ntu|clean|design|cost|flow|science|lab|measure|observe|explain|limit|detect)\w*/i;

export type Verdict = { ok: true } | { ok: false; reason: "personal_info" | "inappropriate" | "self_harm" | "off_topic"; reply: string };

/** Filters a student message before it reaches the model. */
export function checkStudentMessage(text: string, lessonText = ""): Verdict {
  const t = text.trim();
  if (SELF_HARM.test(t)) return { ok: false, reason: "self_harm", reply: "I'm really glad you said something. Please talk to your teacher, a school counselor or another adult you trust right now. If you are in the U.S., you can call or text 988 any time to talk to someone who can help." };
  if (PII.some((r) => r.test(t))) return { ok: false, reason: "personal_info", reply: "Let's keep personal details private: no names, emails, phone numbers or addresses here. What part of the lab can I help you think through?" };
  if (UNSAFE.test(t) || MAKE_HARM.test(t)) return { ok: false, reason: "inappropriate", reply: "That's not something I can help with. I'm here for your science lab. What are you investigating right now?" };
  const COMMON = new Set(["teacher", "teachers", "student", "students", "class", "about", "their", "there", "which", "would", "could", "should", "people", "other", "every", "where", "after", "before", "today", "really", "think", "thing", "things", "night", "morning", "tonight", "yesterday", "tomorrow"]);
  const lessonWords = new Set((lessonText.toLowerCase().match(/[a-z]{5,}/g) ?? []).filter((w) => !COMMON.has(w)));
  const onTopic = SCIENCE.test(t) || (t.toLowerCase().match(/[a-z]{5,}/g) ?? []).filter((w) => lessonWords.has(w)).length >= 2;
  if (!onTopic) return { ok: false, reason: "off_topic", reply: "Good question, but it's outside our lab. Let's get back to the investigation: what did you observe in your last step?" };
  return { ok: true };
}

/** Filters the model's reply before a student sees it. */
export function checkReply(text: string): string {
  if (UNSAFE.test(text) || PII.slice(0, 2).some((r) => r.test(text))) return "Let's focus on your lab. What do you notice in your data so far?";
  return text.slice(0, 1200);
}

function lessonContext(body: Block[]) {
  return body
    .map((b) => ("text" in b ? b.text : "items" in b ? b.items.join("; ") : "prompt" in b ? b.prompt : ""))
    .join("\n")
    .slice(0, 6000);
}

const SYSTEM = (title: string, ctx: string) =>
  `You are Curie, a friendly science lab partner for students in grades 4-10. The class is working on the lesson "${title}".
Lesson material:
${ctx}

How you help:
- Give hints and ask guiding questions. Never give the final answer to an explain prompt, worksheet question or the lab's conclusion; help the student reason toward it.
- Stay on this lesson. If asked about anything else, gently steer back to the lab.
- Use short sentences a 10-year-old can read: at most 3 sentences per reply.
- Never ask for or repeat personal information (names, emails, addresses, schools).
- Keep everything age-appropriate. Safety first: remind students to follow the safety rules and their teacher's directions.`;

/** Local stand-in tutor (no API key): Socratic hints built from the lesson text. */
function localHint(message: string, title: string, body: Block[]) {
  if (ANSWER_FISHING.test(message)) return "I can't give you the answer, but I can help you find it. What does your data show for the last step you tried?";
  const steps = body.find((b) => b.type === "steps") as { items: string[] } | undefined;
  const explain = body.find((b) => b.type === "explain") as { prompt: string } | undefined;
  const words = message.toLowerCase();
  if (/why|how/.test(words) && explain) return `Think about this: ${explain.prompt} What evidence from "${title}" could support your idea?`;
  if (/next|stuck|what do i do/.test(words) && steps) return `Try this step: "${steps.items[0]}" What do you predict will happen?`;
  return `Let's think like scientists. What did you observe, and what do you think caused it? Compare it with the control in "${title}".`;
}

export async function usageToday(classId: string) {
  const d = await db();
  const [row] = await d.select().from(curieUsage).where(and(eq(curieUsage.classId, classId), eq(curieUsage.day, today())));
  return row?.count ?? 0;
}

export type CurieResult = { ok: true; reply: string; flagged?: string } | { ok: false; error: "disabled" | "limit" | "not_found" };

export async function askCurie(input: { classId: string; studentSessionId: string | null; contentSlug: string; message: string }): Promise<CurieResult> {
  const d = await db();
  const [cls] = await d.select().from(classes).where(eq(classes.id, input.classId));
  if (!cls) return { ok: false, error: "not_found" };
  if (!cls.curieEnabled) return { ok: false, error: "disabled" };

  // Daily limit: atomically count this message, refuse once the class reaches its limit.
  const [usage] = await d
    .insert(curieUsage)
    .values({ classId: cls.id, day: today(), count: 1 })
    .onConflictDoUpdate({ target: [curieUsage.classId, curieUsage.day], set: { count: sql`${curieUsage.count} + 1` } })
    .returning();
  if (usage.count > cls.curieDailyLimit) return { ok: false, error: "limit" };

  const [lesson] = await d.select().from(contentItems).where(eq(contentItems.slug, input.contentSlug));
  const title = lesson?.title ?? "your lab";
  const ctx = lessonContext(lesson?.body ?? []);
  const message = input.message.trim().slice(0, 500);
  const log = (role: string, content: string, flagged?: string) => d.insert(curieMessages).values({ classId: cls.id, studentSessionId: input.studentSessionId, contentSlug: input.contentSlug, role, content, flagged: flagged ?? null });

  const verdict = checkStudentMessage(message, `${title} ${ctx}`);
  if (!verdict.ok) {
    await log("user", verdict.reason === "personal_info" ? "[removed: personal information]" : message, verdict.reason);
    await log("assistant", verdict.reply, verdict.reason);
    return { ok: true, reply: verdict.reply, flagged: verdict.reason };
  }
  await log("user", message);

  let reply: string;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const history = await d.select().from(curieMessages).where(and(eq(curieMessages.classId, cls.id), input.studentSessionId ? eq(curieMessages.studentSessionId, input.studentSessionId) : sql`true`, sql`${curieMessages.flagged} is null`)).orderBy(desc(curieMessages.createdAt)).limit(8);
      const messages = history.reverse().map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content }));
      const client = new Anthropic();
      const res = await client.beta.messages.create({
        model: CURIE_MODEL,
        max_tokens: 1024,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: SYSTEM(title, ctx),
        messages,
      } as unknown as Parameters<typeof client.beta.messages.create>[0]) as Anthropic.Beta.BetaMessage;
      const text = res.stop_reason === "refusal" ? "" : res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      reply = text || "Let's look at your lab again. What did you observe?";
    } catch (e) {
      console.error("curie model error", e);
      reply = localHint(message, title, lesson?.body ?? []);
    }
  } else {
    reply = localHint(message, title, lesson?.body ?? []);
  }
  if (ANSWER_FISHING.test(message) && !/can't give|cannot give|help you find/i.test(reply)) reply = `I won't give the answer away, but here's a hint: ${reply}`;
  reply = checkReply(reply);
  await log("assistant", reply);
  return { ok: true, reply };
}

export async function classConversations(classId: string) {
  const d = await db();
  return d
    .select({ id: curieMessages.id, role: curieMessages.role, content: curieMessages.content, flagged: curieMessages.flagged, createdAt: curieMessages.createdAt, nickname: studentSessions.nickname })
    .from(curieMessages)
    .leftJoin(studentSessions, eq(studentSessions.id, curieMessages.studentSessionId))
    .where(eq(curieMessages.classId, classId))
    .orderBy(asc(curieMessages.createdAt))
    .limit(300);
}

/** Retention: delete chats older than CURIE_RETENTION_DAYS (default 30). Returns rows deleted. */
export async function purgeOldChats(now = new Date()) {
  const days = Number(process.env.CURIE_RETENTION_DAYS ?? 30);
  const d = await db();
  const gone = await d.delete(curieMessages).where(lt(curieMessages.createdAt, new Date(now.getTime() - days * 86400_000))).returning({ id: curieMessages.id });
  await d.delete(curieUsage).where(lt(curieUsage.day, new Date(now.getTime() - days * 86400_000).toISOString().slice(0, 10)));
  return gone.length;
}
