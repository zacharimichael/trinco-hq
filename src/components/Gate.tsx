"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

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
      <div className="card sec">
        <h1>Sign in</h1>
        {sent ? (
          <>
            <p style={{ margin: 0 }}>Check your email. We sent a sign-in link to <b>{email}</b>. Open it on this device.</p>
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
