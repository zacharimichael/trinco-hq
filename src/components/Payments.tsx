"use client";

import { useEffect, useRef, useState } from "react";
import { money, type Player } from "@/lib/players";
import { FEE_LABELS, type BillAddress, type Payment, type PaySetup, type PayUpdate } from "@/lib/payments";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useScouting } from "@/lib/useScouting";

const day = (d: string) => new Date(d).toLocaleDateString([], { dateStyle: "medium" });

async function pay(body: object): Promise<{ ok: boolean; out: Record<string, unknown> }> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/pay", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, out: await res.json().catch(() => ({})) };
}

const errorText = (out: Record<string, unknown>, demo: boolean) =>
  out.error === "no-key" ? "Stripe isn't connected yet. Add STRIPE_SECRET_KEY in Vercel, then try again."
    : typeof out.error === "string" ? out.error
      : demo ? "Payments only work when you're signed in." : "Something went wrong. Try again.";

/** Bill a signed athlete: make a Stripe pay link or email a Stripe invoice, and see when it's paid. */
export function Payments({ p }: { p: Player }) {
  const { mode } = useStore();
  const { canEdit, edit } = useScouting();
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState<string>(FEE_LABELS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const payments = p.payments ?? [];
  const [how, setHow] = useState<"link" | "invoice">("link");
  const [email, setEmail] = useState(() => payments.find((x) => x.email)?.email ?? "");
  const [addr, setAddr] = useState<BillAddress>({ line1: "", city: "", state: "", zip: "" });
  const [setup, setSetup] = useState<PaySetup | null>(null);

  // Ask once whether Stripe is in test mode and whether sales tax is on.
  useEffect(() => {
    if (mode !== "live" || !canEdit) return;
    pay({ action: "setup" }).then(({ ok, out }) => { if (ok) setSetup(out as PaySetup); }).catch(() => {});
  }, [mode, canEdit]);

  const change = (id: string, patch: Partial<Payment>) => edit((s) => {
    const pl = s.players.find((x) => x.id === p.id);
    if (pl?.payments) pl.payments = pl.payments.map((x) => (x.id === id ? { ...x, ...patch } : x));
  });

  // When the profile opens, ask Stripe whether any waiting links were paid.
  const checked = useRef(false);
  const waiting = payments.filter((x) => x.status === "Waiting").map((x) => x.id);
  useEffect(() => {
    if (checked.current || mode !== "live" || !canEdit || !waiting.length) return;
    checked.current = true;
    pay({ action: "check", ids: waiting }).then(({ ok, out }) => {
      if (ok) for (const u of (out.updates ?? []) as PayUpdate[]) change(u.id, { status: u.status, paidAt: u.paidAt ?? null, ...(u.total ? { total: u.total } : {}) });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, canEdit, waiting.join()]);

  const create = async () => {
    setError(null);
    const n = Number(amount.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0.5) return setError("Enter an amount, like 500.");
    const invoice = how === "invoice";
    const to = email.trim();
    if (invoice && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return setError("Enter the athlete's email.");
    if (invoice && setup?.tax && Object.values(addr).some((v) => !v.trim())) return setError("Fill in the athlete's street, city, state and ZIP so Stripe can add sales tax.");
    setBusy(true);
    try {
      const base = { playerId: p.id, playerName: p.name, amount: n, label };
      const { ok, out } = await pay(invoice ? { action: "invoice", ...base, email: to, address: setup?.tax ? addr : undefined } : { action: "create", ...base });
      if (!ok) return setError(errorText(out, mode === "demo"));
      const made: Payment = {
        id: String(out.id), url: String(out.url), amount: n, label, created: new Date().toISOString(), status: "Waiting",
        kind: invoice ? "invoice" : "link",
        ...(invoice ? { email: to, due: (out.due as string | null) ?? null, total: Number(out.total) || null } : {}),
      };
      edit((s) => { const pl = s.players.find((x) => x.id === p.id); if (pl) pl.payments = [made, ...(pl.payments ?? [])]; });
      setAmount("");
    } catch {
      setError("Couldn't reach Stripe. Check your internet and try again.");
    } finally { setBusy(false); }
  };

  const cancel = async (x: Payment) => {
    if (!confirm(x.kind === "invoice" ? `Cancel the ${money(x.amount)} invoice? Stripe will mark it void.` : `Cancel the ${money(x.amount)} link? It will stop working.`)) return;
    setError(null);
    const { ok, out } = await pay({ action: "cancel", id: x.id }).catch(() => ({ ok: false, out: {} }));
    if (!ok) return setError(errorText(out, mode === "demo"));
    change(x.id, { status: "Canceled" });
  };

  const copy = async (x: Payment) => {
    try { await navigator.clipboard.writeText(x.url); setCopied(x.id); setTimeout(() => setCopied(null), 2000); } catch { prompt("Copy this link:", x.url); }
  };

  const paid = payments.filter((x) => x.status === "Paid").reduce((t, x) => t + x.amount, 0);
  const waitingText = (x: Payment) => x.kind === "invoice"
    ? `Invoice emailed to ${x.email ?? "the athlete"}${x.due ? ` · due ${day(x.due)}` : ""}`
    : `Pay link · sent ${day(x.created)}`;
  const taxNote = (x: Payment) => (x.total && x.total > x.amount + 0.004 ? ` · ${money(x.total)} with tax` : "");

  return (
    <div className="card sec" id="payments">
      <h2>Payments</h2>
      {setup?.test && <p className="chip" style={{ background: "var(--wip-soft)", margin: 0 }}>Test mode: no real money moves</p>}
      {canEdit && (
        <>
          <fieldset className="seg">
            <legend>How to send it</legend>
            <div>
              <button type="button" aria-pressed={how === "link"} onClick={() => setHow("link")}>Pay link</button>
              <button type="button" aria-pressed={how === "invoice"} onClick={() => setHow("invoice")}>Email an invoice</button>
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="pay-for">Bill {p.name.trim() || "the athlete"} for</label>
            <select id="pay-for" value={label} onChange={(e) => setLabel(e.target.value)}>
              {FEE_LABELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          {how === "invoice" && (
            <div className="field">
              <label htmlFor="pay-email">Athlete&apos;s email</label>
              <input id="pay-email" type="email" autoComplete="off" placeholder="name@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          {how === "invoice" && setup?.tax && (
            <div className="field">
              <label htmlFor="pay-street">Athlete&apos;s address (for sales tax)</label>
              <input id="pay-street" placeholder="Street" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
              <div className="pair">
                <input aria-label="City" placeholder="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                <input aria-label="State" placeholder="State" maxLength={2} style={{ maxWidth: 80 }} value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} />
                <input aria-label="ZIP" placeholder="ZIP" inputMode="numeric" style={{ maxWidth: 110 }} value={addr.zip} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} />
              </div>
            </div>
          )}
          <div className="pair">
            <input aria-label="Amount in dollars" inputMode="decimal" placeholder="$ Amount" value={amount}
              onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void create(); } }} />
            <button type="button" className="btn" disabled={busy} onClick={create}>{busy ? (how === "invoice" ? "Sending…" : "Making…") : how === "invoice" ? "Email invoice" : "Make pay link"}</button>
          </div>
          {error && <p className="warnline">{error}</p>}
          {setup?.tax && <p className="muted" style={{ margin: 0 }}>Stripe adds sales tax on top where the agency is registered.</p>}
        </>
      )}
      {!payments.length && <p className="muted" style={{ margin: 0 }}>No payments yet. Make a pay link to text, or email {p.name.trim() || "the athlete"} an invoice.</p>}
      {payments.map((x) => (
        <div className="step" key={x.id}>
          <span className={`dot ${x.status === "Paid" ? "go" : x.status === "Waiting" ? "wip" : "stop"}`} style={{ marginTop: 6 }} />
          <div className="grow">
            <div className="t">{money(x.amount)} · {x.label}</div>
            <div className="d">{x.status === "Paid" ? `Paid ${day(x.paidAt ?? x.created)}${taxNote(x)}` : x.status === "Canceled" ? "Canceled" : `Waiting · ${waitingText(x)}`}</div>
          </div>
          {x.status === "Waiting" && (
            <>
              <button type="button" className="btn ghost" onClick={() => copy(x)}>{copied === x.id ? "Copied" : "Copy link"}</button>
              {canEdit && <button type="button" className="linkbtn" onClick={() => cancel(x)}>Cancel</button>}
            </>
          )}
        </div>
      ))}
      {paid > 0 && <div className="lines"><div className="total"><span>Paid so far</span><span>{money(paid)}</span></div></div>}
    </div>
  );
}
