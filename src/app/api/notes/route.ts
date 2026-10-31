import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { createClient } from "@supabase/supabase-js";
import { SCHOOLS } from "@/data/schools";
import { FIELDS, WHO_LABEL, type IntakeContext } from "@/lib/intake";
import { IntakeSchema } from "@/lib/intakeSchema";
import type { Talk } from "@/lib/players";

/**
 * Reads a call note and suggests where each fact goes. Nothing is saved here:
 * the profile shows the suggestions and z ticks what to keep.
 * Needs ANTHROPIC_API_KEY set in Vercel (Settings → Environment Variables).
 */
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ybppggggqjdudulslfjx.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_-EiG-Nx4o__njGb3YPdEqA_kOnRqWMd";

const fieldList = Object.entries(FIELDS)
  .map(([k, f]) => `- ${k}: ${f.label}${f.hint ? ` (${f.hint})` : ""}${f.options ? ` (one of: ${f.options.join(", ")})` : ""}${f.kind === "bool" ? " (true or false)" : ""}${f.min != null ? ` (${f.min} to ${f.max})` : ""}`)
  .join("\n");

const SYSTEM = `You file call notes for Trin Co, a sports agency that represents and scouts college long snappers (LS), kickers (K) and punters (P).

The agent just got off a call and typed what was said. Pull out every useful fact and say where it belongs. The agent reviews your list and ticks what to save, so suggest everything useful, but never invent facts that aren't in the note.

Return a list of changes. Each change has a "kind":
- "set": fill one profile box for a player. Use "player" (id), "field" and "value" (as text).
- "nil": NIL pay for one college year. Use "player", "year" (1 to 6, the player's year in college that the money is for) and "amount" (dollars per year, a number). Use the player's year in school and NIL history to pick the year. Money for next season goes in the year after the current one.
- "fact": anything useful that has no box: interest from schools, visits, injuries, grades, family, what they want, who represents them, rumors. Use "player", a short "label" (e.g. "Visiting", "Injury", "Wants") and "value".
- "new_player": a long snapper, kicker or punter the note mentions who isn't in otherPlayers. Use "player" as a new ref ("new1", "new2"), "name", "pos" and "school". If the name isn't given, describe them in "name", e.g. "Florida backup LS". Then use the same ref in other changes about them.
- "call": someone the agent should call back. "name" (who), "phone" if given, "label" (why, short), "date" (YYYY-MM-DD) if a day was said, and "player" if it's about a player.
- "event": something with a date for the calendar (visit, signing day, meeting, game). "label" (title), "date" (YYYY-MM-DD), "time" (HH:MM, 24-hour) if given, "player" if it's about a player.
- "coach": a coach's contact at a school. "school", "role" (HC head coach, GM general manager, ST special teams coach), "name", "phone", "email". Put "decision maker" in "value" if the note says this coach makes the decisions.

Rules:
- Players: match people in the note to "player" (the profile this call was logged on) or "otherPlayers" by name, school, position and depth role. "Their backup snapper" means the backup LS at the same school as the player. Use the existing id when it's clearly the same person.
- School calls: when agency_data.school is set, the call was logged on that school's page with one of its coaches, not on a player's profile, so agency_data.player is null. Players at that school are listed by id in school.players; "their snapper" or "the starter" means a player there. What the school needs or plans (the LS/K/P landscape, who's leaving, what they're recruiting, timelines) is already saved with the note on the school's page, so only suggest changes that belong somewhere else: players' profiles, new players, callbacks, dates and coach contacts. The coach on the call is schoolCoaches[who]; if the note gives their phone or email, add a "coach" change for that school.
- A player willing or planning to move schools: set "transfer" ("Open to transferring" if they'd consider it, "In the portal" once entered, or e.g. "Committed to Auburn"). This puts them on the agency's transfer list. Only set "school" once they've actually enrolled somewhere new; then also add the old school with field "priorSchools".
- Schools: use the exact name from the school list below or from addedSchools.
- Dates: work out real dates from words like "next Tuesday" using today's date.
- Don't repeat what's already in the profile, on the call list or on the calendar.
- "text" is what the agent sees in the review list: a few plain words, e.g. "Mark Ellis: NIL year 3 $8,000" or "Call back Coach Diaz Friday". No jargon.
- Fields that don't apply to a change's kind are null. "player" is "" when the change isn't about a player.
- If there's nothing to file, return an empty list.

Profile boxes for "set":
${fieldList}

School list:
${SCHOOLS.map((s) => s.name).join("; ")}`;

type Body = { note: string; who: Talk["who"]; coach?: string; when: string; today: string; context: IntakeContext };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "no-key" }, { status: 503 });

  // Only signed-in people with full access to an agency can use the AI.
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Sign in first." }, { status: 401 });
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: user } = await db.auth.getUser(token);
  if (!user.user) return Response.json({ error: "Sign in again." }, { status: 401 });
  const { data: member } = await db.from("members").select("role").eq("user_id", user.user.id).maybeSingle();
  if (!member || !["owner", "editor"].includes(member.role)) return Response.json({ error: "Only the agency owner can use this." }, { status: 403 });

  const body = (await req.json()) as Body;
  if (!body.note?.trim()) return Response.json({ changes: [] });
  // The agent's own date, so "next Tuesday" means their Tuesday.
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const weekday = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

  const client = new Anthropic();
  try {
    const res = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(IntakeSchema) },
      // If the model declines, the API retries on a fallback model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `Today is ${weekday}, ${today}. The call was on ${(body.when ?? today).slice(0, 10)} with: ${WHO_LABEL[body.who] ?? "Other"}${body.coach ? ` ${body.coach}` : ""}${body.context?.school ? ` at ${body.context.school.name}` : ""}.

<agency_data>
${JSON.stringify(body.context)}
</agency_data>

<call_note>
${body.note.trim()}
</call_note>`,
      }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return Response.json({ error: "The AI couldn't read that note. Save it as a plain note instead." }, { status: 502 });
    return Response.json(res.parsed_output);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return Response.json({ error: "The AI key isn't working. Check ANTHROPIC_API_KEY in Vercel." }, { status: 502 });
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "The AI is busy. Try again in a minute." }, { status: 429 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: `The AI had a problem (${e.status}). Try again.` }, { status: 502 });
    // Anything else is an answer that didn't match the expected shape.
    console.error(e);
    return Response.json({ error: "The AI couldn't read that note. Try again, or save it as a plain note." }, { status: 502 });
  }
}
