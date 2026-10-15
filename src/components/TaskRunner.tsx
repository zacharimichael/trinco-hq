"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { FormData, Screen, TaskDef } from "@/lib/tasks";
import type { AppState, SignatureRecord } from "@/lib/model";
import { useStore } from "@/lib/store";
import { buildSignedPdf } from "@/lib/signedPdf";

type Complete = (draft: AppState, data: FormData) => void;
type Open = (def: TaskDef, complete: Complete) => void;
const RunnerContext = createContext<Open | null>(null);

export function useTaskRunner() {
  const open = useContext(RunnerContext);
  if (!open) throw new Error("useTaskRunner must be used inside TaskRunnerProvider");
  return open;
}

export function TaskRunnerProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<{ def: TaskDef; complete: Complete } | null>(null);
  const open = useCallback<Open>((def, complete) => setActive({ def, complete }), []);
  return (
    <RunnerContext.Provider value={open}>
      {children}
      {active && <TaskModal key={active.def.id + active.def.title} def={active.def} complete={active.complete} onClose={() => setActive(null)} />}
    </RunnerContext.Provider>
  );
}

function total(lines: [string, number][]) {
  return lines.reduce((s, l) => s + l[1], 0);
}

function TaskModal({ def, complete, onClose }: { def: TaskDef; complete: Complete; onClose: () => void }) {
  const { state, update, recordSignature } = useStore();
  const [screens] = useState<Screen[]>(() => def.screens());
  const [i, setI] = useState(0);
  const [data, setData] = useState<FormData>(() => {
    const d: FormData = {};
    for (const s of screens) {
      if (s.type === "fields") for (const f of s.fields) d[f.key] = f.value;
      if (s.type === "pick") d.pick = s.options[0];
      if (s.type === "multi") d.multi = [s.options[0]];
    }
    return d;
  });
  const [sig, setSig] = useState<{ method: "drawn" | "typed"; value: string } | null>(null);
  const [agree, setAgree] = useState(false);
  const [result, setResult] = useState<ReturnType<TaskDef["done"]> | null>(null);
  const [busy, setBusy] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const docText = useRef("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sc = screens[i];
  const last = i === screens.length - 1;
  const set = (k: string, v: string | string[]) => setData((d) => ({ ...d, [k]: v }));

  async function finish() {
    const res = def.done(data);
    const signedAt = new Date();
    let pdf: string | undefined, hash: string | undefined;
    if (sig && res.doc) {
      setBusy(true);
      const out = await buildSignedPdf({
        title: res.doc, text: docText.current || res.doc, signer: { name: state.profile.name, email: state.profile.email },
        signature: sig, signedAt, userAgent: navigator.userAgent, agency: state.agency.name,
      });
      pdf = out.dataUrl;
      hash = out.hash;
    }
    const now = signedAt.toISOString();
    const rec: SignatureRecord | null = sig && res.doc && hash
      ? { document: res.doc, documentSha256: hash, signer: state.profile.name, method: sig.method, value: sig.value, consent: true, signedAt: now, userAgent: navigator.userAgent }
      : null;
    update((draft) => {
      complete(draft, data);
      if (res.doc) draft.docs.push({ name: res.doc, date: now, pdf });
      if (rec) draft.signatures.push(rec);
    });
    if (rec) recordSignature(rec);
    setBusy(false);
    setResult(res);
  }

  function next() {
    if (sc.type === "doc" && docRef.current) docText.current = docRef.current.innerText;
    if (last) void finish();
    else setI(i + 1);
  }

  if (result)
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="m-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ alignItems: "center", textAlign: "center" }}>
          <div className="bigok">✓</div>
          <h2 id="m-title">Done</h2>
          <p style={{ margin: 0 }}>{result.msg}</p>
          {state.docs.at(-1)?.pdf && <p className="muted" style={{ margin: 0, fontSize: 14 }}>Signed copy saved to Documents.</p>}
          <button className="btn" id="m-close" type="button" autoFocus onClick={onClose}>Back to my list</button>
        </div>
      </div>
    );

  const signReady = sc.type !== "sign" || (!!sig && agree);
  const nextLabel = sc.type === "sign" ? "Sign" : !last ? "Next" : sc.type === "pay" ? `Pay $${total(sc.lines)}` : sc.type === "confirm" ? "Send" : "Done";

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="m-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="stepno">Step {i + 1} of {screens.length} · {def.title}</div>
        <h2 id="m-title">{sc.title}</h2>

        {sc.type === "fields" && sc.fields.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`f-${f.key}`}>{f.label}</label>
            {f.options ? (
              <select id={`f-${f.key}`} value={String(data[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                {f.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input id={`f-${f.key}`} type={f.type ?? "text"} value={String(data[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
            )}
          </div>
        ))}

        {sc.type === "doc" && <div className="doc" ref={docRef}>{sc.body(data)}</div>}

        {sc.type === "pick" && (<>
          {sc.note && <p className="muted" style={{ margin: 0 }}>{sc.note}</p>}
          <div className="choices">{sc.options.map((o) => (
            <label className="choice" key={o}><input type="radio" name="pick" checked={data.pick === o} onChange={() => set("pick", o)} />{o}</label>
          ))}</div>
        </>)}

        {sc.type === "multi" && (
          <div className="choices">{sc.options.map((o) => {
            const cur = (data.multi as string[]) ?? [];
            return (
              <label className="choice" key={o}><input type="checkbox" checked={cur.includes(o)} onChange={(e) => set("multi", e.target.checked ? [...cur, o] : cur.filter((x) => x !== o))} />{o}</label>
            );
          })}</div>
        )}

        {sc.type === "pay" && (<>
          <div className="lines">
            {sc.lines.map(([l, a]) => <div key={l}><span>{l}</span><span>${a}</span></div>)}
            <div className="total"><span>Total</span><span>${total(sc.lines)}</span></div>
          </div>
          <div className="field"><label htmlFor="f-card">Card number</label><input id="f-card" defaultValue="4242 4242 4242 4242" inputMode="numeric" /></div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>We pay the state for you and send the receipt to your documents.</p>
        </>)}

        {sc.type === "confirm" && (
          <div className="lines">{sc.items.map((x) => <div key={x}><span>{x}</span><span className="okchip">✓</span></div>)}</div>
        )}

        {sc.type === "sign" && (<>
          <p style={{ margin: 0 }}>Draw your signature to sign {sc.what}.</p>
          <SignaturePad signerName={state.profile.name} onChange={setSig} />
          <label className="agree"><input type="checkbox" id="sig-agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I agree to sign electronically. My e-signature is as valid as my handwritten one.</label>
        </>)}

        <div className="actions">
          <button className="btn ghost" id="m-back" type="button" onClick={() => (i ? setI(i - 1) : onClose())}>{i ? "Back" : "Cancel"}</button>
          <button className="btn" id="m-next" type="button" disabled={!signReady || busy} onClick={next}>{busy ? "Signing…" : nextLabel}</button>
        </div>
      </div>
    </div>
  );
}

function SignaturePad({ onChange, signerName }: { onChange: (s: { method: "drawn" | "typed"; value: string } | null) => void; signerName: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const drawn = useRef(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.strokeStyle = getComputedStyle(document.body).color;
  }, []);

  const pos = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top] as const;
  };

  return (<>
    <canvas ref={ref} className="sigpad" id="sigpad" aria-label="Signature pad"
      onPointerDown={(e) => { drawing.current = true; ref.current!.setPointerCapture(e.pointerId); const ctx = ref.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(...pos(e)); }}
      onPointerMove={(e) => { if (!drawing.current) return; const ctx = ref.current!.getContext("2d")!; ctx.lineTo(...pos(e)); ctx.stroke(); drawn.current = true; }}
      onPointerUp={() => { drawing.current = false; if (drawn.current) onChange({ method: "drawn", value: ref.current!.toDataURL("image/png") }); }}
    />
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button className="linkbtn" type="button" onClick={() => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); drawn.current = false; onChange(typed.trim().length > 1 ? { method: "typed", value: typed } : null); }}>Clear</button>
      <span className="muted" style={{ fontSize: 14 }}>or type your name:</span>
      <input id="sig-typed" className="typed" placeholder={signerName} aria-label="Type your name to sign" value={typed}
        onChange={(e) => { setTyped(e.target.value); if (!drawn.current) onChange(e.target.value.trim().length > 1 ? { method: "typed", value: e.target.value } : null); }} />
    </div>
  </>);
}
