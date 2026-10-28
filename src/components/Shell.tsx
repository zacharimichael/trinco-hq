"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { CreateFirm, SignIn } from "./Gate";

/** The agency's areas. Home is the Trin Co Agency dashboard everything reports up to.
 *  Each area keeps to its own screens, listed in its sub-tabs. */
const AREAS = [
  { href: "/", label: "Home", id: "tab-home", ownerOnly: false, match: (p: string) => p === "/", sub: [] },
  { href: "/licensing", label: "Licensing", id: "tab-map", ownerOnly: false, match: (p: string) => p.startsWith("/licensing"), sub: [
    { href: "/licensing", label: "Map", id: "sub-map", match: (p: string) => p === "/licensing" },
    { href: "/licensing/todo", label: "To-do", id: "tab-hub", match: (p: string) => p.startsWith("/licensing/todo") },
    { href: "/licensing/states", label: "All states", id: "sub-states", match: (p: string) => p.startsWith("/licensing/states") },
  ] },
  { href: "/players", label: "Scouting", id: "tab-players", ownerOnly: false, match: (p: string) => /^\/(players|compare|depth)/.test(p), sub: [
    { href: "/players", label: "Players", id: "sub-players", match: (p: string) => /^\/(players|compare)/.test(p) },
    { href: "/depth", label: "Depth charts", id: "tab-depth", match: (p: string) => p.startsWith("/depth") },
  ] },
  { href: "/hq", label: "Agents & deals", id: "tab-firm", ownerOnly: true, match: (p: string) => p.startsWith("/hq"), sub: [] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state, mode, email, signOut, save, retrySave } = useStore();
  const isOwner = mode === "demo" || state.me?.role === "owner" || state.me?.role === "viewer" || state.me?.role === "editor";
  const viewOnly = state.me?.role === "viewer";
  const area = AREAS.find((a) => a.match(path));

  if (mode === "loading") return <div className="wrap"><p className="muted">Loading…</p></div>;
  if (mode === "signed-out") return <div className="wrap"><SignIn /></div>;
  if (mode === "needs-firm") return <div className="wrap"><CreateFirm /></div>;

  return (
    <div className="wrap">
      {mode === "demo" && <div className="demo">Demo mode with example data. Nothing is sent, paid or filed. <button className="linkbtn" onClick={signOut}>Sign in instead</button></div>}
      <header className="top">
        <Link href="/" className="brand"><i></i>{state.agency.name} Agency</Link>
        <nav className="tabs" aria-label="Main">
          {AREAS.filter((t) => isOwner || !t.ownerOnly).map((t) => (
            <Link key={t.href} id={t.id} href={t.href} aria-current={t.match(path) ? "page" : undefined} className="tablink">{t.label}</Link>
          ))}
        </nav>
      </header>
      {!!area?.sub.length && (
        <nav className="subtabs" aria-label={area.label}>
          {area.sub.map((t) => (
            <Link key={t.href} id={t.id} href={t.href} aria-current={t.match(path) ? "page" : undefined}>{t.label}</Link>
          ))}
        </nav>
      )}
      {mode === "live" && viewOnly && <div className="savechip saved" role="status">View only. You can add film to players.</div>}
      {mode === "live" && !viewOnly && (
        <div className={`savechip ${save.status}`} role="status" aria-live="polite">
          {save.status === "saving" ? "Saving…" : save.status === "saved" ? "✓ All changes saved" : <>Not saved: {save.message} <button className="linkbtn" type="button" onClick={retrySave}>Try again</button></>}
        </div>
      )}
      <main>{children}</main>
      {mode === "live" && (
        <footer className="muted" style={{ marginTop: 32, fontSize: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span>Signed in as {email}</span>
          <button className="linkbtn" onClick={signOut}>Sign out</button>
        </footer>
      )}
    </div>
  );
}
