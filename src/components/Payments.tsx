"use client";

import { useEffect, useRef, useState } from "react";
import { money, type Player } from "@/lib/players";
import { FEE_LABELS, type Payment, type PayUpdate } from "@/lib/payments";
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

/** Bill a signed athlete: make a Stripe payment link, send it, and see when it's paid. */
export function Payments({ p }: { p: Player }) {
  const { mode } = useStore();
  const { canEdit, edit } = useScouting();
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState<string>(FEE_LABELS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const payments = p.payments ?? [];

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
      if (ok) for (const u of (out.updates ?? []) as PayUpdate[]) change(u.id, { status: u.status, paidAt: u.paidAt ?? null });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, canEdit, waiting.join()]);

  const create = async () => {
    setError(null);
    const n = Number(amount.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0.5) return setError("Enter an amount, like 500.");
    setBusy(true);
    try {
      const { ok, out } = await pay({ action: "create", playerId: p.id, playerName: p.name, amount: n, label });
      if (!ok) return setError(errorText(out, mode === "demo"));
      const made: Payment = { id: String(out.id), url: String(out.url), amount: n, label, created: new Date().toISOString(), status: "Waiting" };
      edit((s) => { const pl = s.players.find((x) => x.id === p.id); if (pl) pl.payments = [made, ...(pl.payments ?? [])]; });
      setAmount("");
    } catch {
      setError("Couldn't reach Stripe. Check your internet and try again.");
    } finally { setBusy(false); }
  };

  const cancel = async (x: Payment) => {
    if (!confirm(`Cancel the ${money(x.amount)} link? It will stop working.`)) return;
    setError(null);
    const { ok, out } = await pay({ action: "cancel", id: x.id }).catch(() => ({ ok: false, out: {} }));
    if (!ok) return setError(errorText(out, mode === "demo"));
    change(x.id, { status: "Canceled" });
  };

  const copy = async (x: Payment) => {
    try { await navigator.clipboard.writeText(x.url); setCopied(x.id); setTimeout(() => setCopied(null), 2000); } catch { prompt("Copy this link:", x.url); }
  };

  const paid = payments.filter((x) => x.status === "Paid").reduce((t, x) => t + x.amount, 0);

  return (
    <div className="card sec" id="payments">
      <h2>Payments</h2>
      {canEdit && (
        <>
          <div className="field">
            <label htmlFor="pay-for">Bill {p.name.trim() || "the athlete"} for</label>
            <select id="pay-for" value={label} onChange={(e) => setLabel(e.target.value)}>
              {FEE_LABELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="pair">
            <input aria-label="Amount in dollars" inputMode="decimal" placeholder="$ Amount" value={amount}
              onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void create(); } }} />
            <button type="button" className="btn" disabled={busy} onClick={create}>{busy ? "Making…" : "Make pay link"}</button>
          </div>
          {error && <p className="warnline">{error}</p>}
        </>
      )}
      {!payments.length && <p className="muted" style={{ margin: 0 }}>No payments yet. Make a link and text or email it to {p.name.trim() || "the athlete"}.</p>}
      {payments.map((x) => (
        <div className="step" key={x.id}>
          <span className={`dot ${x.status === "Paid" ? "go" : x.status === "Waiting" ? "wip" : "stop"}`} style={{ marginTop: 6 }} />
          <div className="grow">
            <div className="t">{money(x.amount)} · {x.label}</div>
            <div className="d">{x.status === "Paid" ? `Paid ${day(x.paidAt ?? x.created)}` : x.status === "Canceled" ? "Canceled" : `Waiting · sent ${day(x.created)}`}</div>
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
