import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { PayUpdate } from "@/lib/payments";

/**
 * Stripe payment links for athlete fees. Nothing is saved here: the profile keeps the link and its status.
 * Needs STRIPE_SECRET_KEY set in Vercel (Settings → Environment Variables). The key stays on the server.
 *
 * POST { action: "create", playerId, playerName, amount, label } → { id, url }
 * POST { action: "check", ids: string[] } → { updates: PayUpdate[] }   (paid or canceled since last look)
 * POST { action: "cancel", id } → { ok: true }
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ybppggggqjdudulslfjx.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_-EiG-Nx4o__njGb3YPdEqA_kOnRqWMd";

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return fail("no-key", 503);

  // Only signed-in people with full access to an agency can bill athletes.
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail("Sign in first.", 401);
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: user } = await db.auth.getUser(token);
  if (!user.user) return fail("Sign in again.", 401);
  const { data: member } = await db.from("members").select("role, firm_id").eq("user_id", user.user.id).maybeSingle();
  if (!member || !["owner", "editor"].includes(member.role)) return fail("Only the agency owner can do this.", 403);

  const body = await req.json().catch(() => ({}));
  const stripe = new Stripe(key);

  try {
    if (body.action === "create") {
      const amount = Number(body.amount);
      const cents = Math.round(amount * 100);
      if (!Number.isFinite(amount) || cents < 50) return fail("Enter an amount of at least $0.50.", 400);
      if (cents > 99_999_999) return fail("That amount is too big for one link.", 400);
      const label = String(body.label ?? "").trim().slice(0, 80) || "Representation fee";
      const name = String(body.playerName ?? "").trim().slice(0, 80);
      const playerId = String(body.playerId ?? "").slice(0, 100);
      const metadata = { player_id: playerId, player_name: name, firm_id: String(member.firm_id), fee: label };
      const link = await stripe.paymentLinks.create({
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: cents, product_data: { name: name ? `${label}: ${name}` : label } } }],
        // One payment per link, so an athlete can't pay the same fee twice.
        restrictions: { completed_sessions: { limit: 1 } },
        after_completion: { type: "hosted_confirmation", hosted_confirmation: { custom_message: "Thank you! Your payment to Trin Co went through." } },
        payment_intent_data: { description: name ? `${label}: ${name}` : label, metadata },
        metadata,
      });
      return Response.json({ id: link.id, url: link.url });
    }

    if (body.action === "check") {
      const ids = (Array.isArray(body.ids) ? body.ids : []).filter((x: unknown): x is string => typeof x === "string" && x.startsWith("plink_")).slice(0, 20);
      const updates: PayUpdate[] = [];
      for (const id of ids) {
        const sessions = await stripe.checkout.sessions.list({ payment_link: id, status: "complete", limit: 5 });
        const paid = sessions.data.find((s) => s.payment_status === "paid");
        if (paid) { updates.push({ id, status: "Paid", paidAt: new Date(paid.created * 1000).toISOString() }); continue; }
        const link = await stripe.paymentLinks.retrieve(id);
        if (!link.active) updates.push({ id, status: "Canceled" });
      }
      return Response.json({ updates });
    }

    if (body.action === "cancel") {
      const id = String(body.id ?? "");
      if (!id.startsWith("plink_")) return fail("That link isn't from Stripe.", 400);
      await stripe.paymentLinks.update(id, { active: false });
      return Response.json({ ok: true });
    }

    return fail("Unknown action.", 400);
  } catch (e) {
    if (e instanceof Stripe.errors.StripeAuthenticationError) return fail("The Stripe key isn't working. Check STRIPE_SECRET_KEY in Vercel.", 502);
    if (e instanceof Stripe.errors.StripePermissionError) return fail("The Stripe key is missing a permission. See the setup steps.", 502);
    if (e instanceof Stripe.errors.StripeError) return fail(`Stripe said: ${e.message}`, 502);
    console.error(e);
    return fail("Something went wrong with Stripe. Try again.", 502);
  }
}
