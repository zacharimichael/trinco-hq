import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { INVOICE_DAYS, type PaySetup, type PayUpdate } from "@/lib/payments";

/**
 * Stripe billing for athlete fees: pay links, emailed invoices, and sales tax when the agency has a tax registration.
 * Nothing is saved here: the profile keeps each link or invoice and its status.
 * Needs STRIPE_SECRET_KEY set in Vercel (Settings → Environment Variables). The key stays on the server.
 *
 * POST { action: "setup" } → PaySetup   (test mode? tax on?)
 * POST { action: "create", playerId, playerName, amount, label } → { id, url }
 * POST { action: "invoice", playerId, playerName, amount, label, email, address? } → { id, url, due, total }
 * POST { action: "check", ids: string[] } → { updates: PayUpdate[] }   (paid or canceled since last look)
 * POST { action: "cancel", id } → { ok: true }
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ybppggggqjdudulslfjx.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_-EiG-Nx4o__njGb3YPdEqA_kOnRqWMd";

const fail = (error: string, status: number) => Response.json({ error }, { status });
const isTestKey = (key: string) => /^(sk|rk)_test_/.test(key);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v: unknown, n = 80) => String(v ?? "").trim().slice(0, n);

/**
 * Sales tax is added only when Stripe Tax is set up (head office address saved) and the agency has at least one
 * active tax registration in Stripe. Without a registration Stripe would quietly collect $0, so we leave tax off
 * and the card doesn't ask for an address. Checked at most every 5 minutes.
 */
let taxCache: { at: number; on: boolean } | null = null;
async function taxOn(stripe: Stripe): Promise<boolean> {
  if (taxCache && Date.now() - taxCache.at < 5 * 60_000) return taxCache.on;
  let on = false;
  try {
    const settings = await stripe.tax.settings.retrieve();
    if (settings.status === "active") on = (await stripe.tax.registrations.list({ status: "active", limit: 1 })).data.length > 0;
  } catch {
    // A key without Tax permissions just means tax stays off.
  }
  taxCache = { at: Date.now(), on };
  return on;
}

function cents(raw: unknown): number | string {
  const amount = Number(raw);
  const c = Math.round(amount * 100);
  if (!Number.isFinite(amount) || c < 50) return "Enter an amount of at least $0.50.";
  if (c > 99_999_999) return "That amount is too big for one bill.";
  return c;
}

/** The athlete's Stripe customer, found by email so repeat invoices land on one record. */
async function customerFor(stripe: Stripe, email: string, name: string, meta: Record<string, string>, address: Stripe.AddressParam | null) {
  const found = (await stripe.customers.list({ email, limit: 1 })).data[0];
  if (found) {
    if (address || (name && !found.name)) return stripe.customers.update(found.id, { ...(address ? { address } : {}), ...(name && !found.name ? { name } : {}) });
    return found;
  }
  return stripe.customers.create({ email, name: name || undefined, metadata: meta, ...(address ? { address } : {}) });
}

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
    if (body.action === "setup") {
      const setup: PaySetup = { test: isTestKey(key), tax: await taxOn(stripe) };
      return Response.json(setup);
    }

    if (body.action === "create" || body.action === "invoice") {
      const c = cents(body.amount);
      if (typeof c === "string") return fail(c, 400);
      const label = clip(body.label) || "Representation fee";
      const name = clip(body.playerName);
      const what = name ? `${label}: ${name}` : label;
      const metadata = { player_id: clip(body.playerId, 100), player_name: name, firm_id: String(member.firm_id), fee: label };
      const tax = await taxOn(stripe);

      if (body.action === "create") {
        const link = await stripe.paymentLinks.create({
          line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: c, product_data: { name: what }, ...(tax ? { tax_behavior: "exclusive" as const } : {}) } }],
          // Stripe asks for the athlete's address on the pay page and adds sales tax on top when tax is on.
          automatic_tax: { enabled: tax },
          // One payment per link, so an athlete can't pay the same fee twice.
          restrictions: { completed_sessions: { limit: 1 } },
          after_completion: { type: "hosted_confirmation", hosted_confirmation: { custom_message: "Thank you! Your payment to Trin Co went through." } },
          payment_intent_data: { description: what, metadata },
          metadata,
        });
        return Response.json({ id: link.id, url: link.url });
      }

      // Emailed invoice: Stripe sends it, hosts the pay page and the PDF, and sends reminders per the Dashboard settings.
      const email = clip(body.email, 200).toLowerCase();
      if (!EMAIL.test(email)) return fail("Enter the athlete's email, like name@school.edu.", 400);
      let address: Stripe.AddressParam | null = null;
      if (tax) {
        const a = body.address ?? {};
        const [line1, city, state, zip] = [clip(a.line1, 200), clip(a.city), clip(a.state, 40).toUpperCase(), clip(a.zip, 10)];
        if (!line1 || !city || !state || !zip) return fail("Sales tax is on, so Stripe needs the athlete's street, city, state and ZIP.", 400);
        address = { line1, city, state, postal_code: zip, country: "US" };
      }
      const customer = await customerFor(stripe, email, name, metadata, address);
      const draft = await stripe.invoices.create({
        customer: customer.id,
        collection_method: "send_invoice",
        days_until_due: INVOICE_DAYS,
        automatic_tax: { enabled: tax },
        // Only this fee goes on this invoice, never leftover items on the customer.
        pending_invoice_items_behavior: "exclude",
        description: "Thank you for working with Trin Co.",
        metadata,
      });
      try {
        await stripe.invoiceItems.create({ customer: customer.id, invoice: draft.id!, amount: c, currency: "usd", description: what, ...(tax ? { tax_behavior: "exclusive" as const } : {}), metadata });
        await stripe.invoices.finalizeInvoice(draft.id!, { auto_advance: true });
      } catch (e) {
        // Don't leave a half-made draft in Stripe.
        await stripe.invoices.del(draft.id!).catch(() => {});
        throw e;
      }
      const sent = await stripe.invoices.sendInvoice(draft.id!);
      return Response.json({
        id: sent.id,
        url: sent.hosted_invoice_url,
        due: sent.due_date ? new Date(sent.due_date * 1000).toISOString() : null,
        total: sent.total / 100,
      });
    }

    if (body.action === "check") {
      const ids = (Array.isArray(body.ids) ? body.ids : []).filter((x: unknown): x is string => typeof x === "string" && /^(plink|in)_/.test(x)).slice(0, 20);
      const updates: PayUpdate[] = [];
      for (const id of ids) {
        if (id.startsWith("in_")) {
          const inv = await stripe.invoices.retrieve(id);
          if (inv.status === "paid") {
            const at = inv.status_transitions?.paid_at;
            updates.push({ id, status: "Paid", paidAt: new Date((at ?? inv.created) * 1000).toISOString(), total: inv.total / 100 });
          } else if (inv.status === "void" || inv.status === "uncollectible") updates.push({ id, status: "Canceled" });
          continue;
        }
        const sessions = await stripe.checkout.sessions.list({ payment_link: id, status: "complete", limit: 5 });
        const paid = sessions.data.find((s) => s.payment_status === "paid");
        if (paid) { updates.push({ id, status: "Paid", paidAt: new Date(paid.created * 1000).toISOString(), total: (paid.amount_total ?? 0) / 100 || null }); continue; }
        const link = await stripe.paymentLinks.retrieve(id);
        if (!link.active) updates.push({ id, status: "Canceled" });
      }
      return Response.json({ updates });
    }

    if (body.action === "cancel") {
      const id = String(body.id ?? "");
      if (id.startsWith("in_")) { await stripe.invoices.voidInvoice(id); return Response.json({ ok: true }); }
      if (!id.startsWith("plink_")) return fail("That bill isn't from Stripe.", 400);
      await stripe.paymentLinks.update(id, { active: false });
      return Response.json({ ok: true });
    }

    return fail("Unknown action.", 400);
  } catch (e) {
    if (e instanceof Stripe.errors.StripeAuthenticationError) return fail("The Stripe key isn't working. Check STRIPE_SECRET_KEY in Vercel.", 502);
    if (e instanceof Stripe.errors.StripePermissionError) return fail("The Stripe key is missing a permission. See the setup steps.", 502);
    if (e instanceof Stripe.errors.StripeError) {
      if (e.code === "customer_tax_location_invalid") return fail("Stripe couldn't find that address. Check the street, city, state and ZIP.", 400);
      return fail(`Stripe said: ${e.message}`, 502);
    }
    console.error(e);
    return fail("Something went wrong with Stripe. Try again.", 502);
  }
}
