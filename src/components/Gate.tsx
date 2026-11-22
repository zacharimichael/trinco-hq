"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { isPreviewSite, MAIN_SITE, supabase } from "@/lib/supabase";

/** Shown instead of the app until someone is signed in. The site is private, so there's no demo. */
export function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // For people the owner gave a password (see 0006_give_access.sql), so they don't need the email.
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (usePassword) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) setError(/invalid/i.test(error.message) ? "That email and password don't match." : error.message);
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <section className="view" style={{ maxWidth: 460, margin: "40px auto" }}>
      {isPreviewSite() && (
        <div className="card sec" style={{ marginBottom: 16 }}>
          <p style={{ margin: 0 }}><b>This is a preview link, not the main site.</b> Each preview is its own site, so it asks you to sign in again.</p>
          <a className="btn" href={MAIN_SITE}>Go to the main site</a>
        </div>
      )}
      <div className="card sec">
        <h1>Sign in</h1>
        {sent ? (
          <>
            <p style={{ margin: 0 }}>Check your email. We sent a sign-in link to <b>{email}</b>. Use the newest email: each link works once.</p>
            <button className="linkbtn" type="button" onClick={() => setSent(false)}>Use a different email</button>
          </>
        ) : (
          <form onSubmit={send} className="sec">
            <p className="muted" style={{ margin: 0 }}>{usePassword ? "Sign in with the password you were given." : "No password. We email you a link."}</p>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {usePassword && (
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}
            {error && <p style={{ margin: 0, color: "var(--stop)" }}>{error}</p>}
            <button className="btn" type="submit" disabled={busy}>{usePassword ? (busy ? "Signing in…" : "Sign in") : busy ? "Sending…" : "Email me a sign-in link"}</button>
            <button className="linkbtn" type="button" id="use-password" onClick={() => { setUsePassword(!usePassword); setError(""); }}>
              {usePassword ? "Email me a link instead" : "Use a password instead"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

/** Lets a signed-in person set a password, so next time they sign in right away instead of waiting for an email. */
export function SetPassword() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: /weak|short|at least/i.test(error.message) ? "Pick a longer password (at least 8 characters)." : error.message });
    setPassword("");
    setOpen(false);
    setMsg({ ok: true, text: "Password saved. Next time tap \"Use a password instead\" to sign in." });
  }

  if (!open) return (
    <>
      <button className="linkbtn" type="button" id="set-password" onClick={() => { setOpen(true); setMsg(null); }}>Set a password</button>
      {msg && <span style={{ color: msg.ok ? "var(--go)" : "var(--stop)" }}>{msg.text}</span>}
    </>
  );
  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <label htmlFor="new-password">New password</label>
      <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
      <button className="linkbtn" type="button" onClick={() => setOpen(false)}>Cancel</button>
      {msg && <span style={{ color: "var(--stop)" }}>{msg.text}</span>}
    </form>
  );
}

/** First sign-in for a new agency owner: name the agency. */
export function CreateFirm() {
  const { createFirm, email, signOut } = useStore();
  const [firm, setFirm] = useState("Trin Co");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await createFirm(firm.trim(), name.trim());
    setBusy(false);
    if (err) setError(/private/i.test(err) ? "This site is private. Only the owner's account can use it." : err);
  }

  return (
    <section className="view" style={{ maxWidth: 460, margin: "40px auto" }}>
      <form className="card sec" onSubmit={submit}>
        <h1>Set up your agency</h1>
        <p className="muted" style={{ margin: 0 }}>Signed in as {email}. If an agency invited you, ask them to add this email, then sign in again.</p>
        <div className="field"><label htmlFor="firm">Agency name</label><input id="firm" required value={firm} onChange={(e) => setFirm(e.target.value)} /></div>
        <div className="field"><label htmlFor="owner">Your full name</label><input id="owner" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        {error && <p style={{ margin: 0, color: "var(--stop)" }}>{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? "Creating…" : "Create my agency"}</button>
      </form>
      <button className="linkbtn" type="button" onClick={signOut}>Sign out</button>
    </section>
  );
}
