"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { seesAllTabs } from "@/lib/model";
import { CreateFirm, SetPassword, SignIn } from "./Gate";

/** The agency's areas, in the order you use them: Home, Licensing and Calendar (owner only) first, then athletes and Match Maker.
 *  Home is the dashboard everything reports up to. Each area keeps to its own screens, listed in its sub-tabs. */
const AREAS = [
  // Home, Licensing, Pod leaders and Calendar are for the agency owner (z) only (homeOnly), plus anyone the owner turned "All tabs" on for.
  // Everyone else starts on School map instead.
  { href: "/", label: "Home", id: "tab-home", ownerOnly: false, homeOnly: true, match: (p: string) => p === "/", sub: [] },
  { href: "/licensing", label: "Licensing", id: "tab-map", ownerOnly: false, homeOnly: true, match: (p: string) => p.startsWith("/licensing"), sub: [
    { href: "/licensing", label: "Map", id: "sub-map", match: (p: string) => p === "/licensing" },
    { href: "/licensing/todo", label: "To-do", id: "tab-hub", match: (p: string) => p.startsWith("/licensing/todo") },
    { href: "/licensing/states", label: "All states", id: "sub-states", match: (p: string) => p.startsWith("/licensing/states") },
  ] },
  { href: "/pods", label: "Pod leaders", id: "tab-pods", ownerOnly: false, homeOnly: true, match: (p: string) => p.startsWith("/pods"), sub: [] },
  { href: "/calendar", label: "Calendar", id: "tab-calendar", ownerOnly: false, homeOnly: true, match: (p: string) => /^\/(calendar|calls)/.test(p), sub: [
    { href: "/calendar", label: "Calendar", id: "sub-calendar", match: (p: string) => p.startsWith("/calendar") },
    { href: "/calls", label: "Call list", id: "sub-calls", match: (p: string) => p.startsWith("/calls") },
  ] },
  { href: "/schools", label: "School map", id: "tab-schools", ownerOnly: false, match: (p: string) => p.startsWith("/schools"), sub: [] },
  { href: "/players", label: "Athletes", id: "tab-players", ownerOnly: false, match: (p: string) => /^\/(players|classes)/.test(p), sub: [
    { href: "/players", label: "Players", id: "sub-players", match: (p: string) => p.startsWith("/players") },
    { href: "/classes", label: "Classes", id: "sub-classes", match: (p: string) => p.startsWith("/classes") },
  ] },
  { href: "/transfers", label: "Match Maker", id: "tab-matchmaker", ownerOnly: false, match: (p: string) => p.startsWith("/transfers"), sub: [] },
  { href: "/coaches", label: "Coaching", id: "tab-coaching", ownerOnly: false, match: (p: string) => p.startsWith("/coaches"), sub: [] },
  { href: "/hq", label: "Agents", id: "tab-firm", ownerOnly: true, match: (p: string) => p.startsWith("/hq"), sub: [] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state, mode, email, signOut, save, retrySave } = useStore();
  const isOwner = mode === "demo" || state.me?.role === "owner" || state.me?.role === "viewer" || state.me?.role === "editor";
  const viewOnly = state.me?.role === "viewer";
  const area = AREAS.find((a) => a.match(path));
  const router = useRouter();
  // Only the real owner, and people the owner turned "All tabs" on for (Agents > Shared access), see Home, Licensing
  // (map, to-do, all states, state pages), Pod leaders and Calendar (calendar, call list).
  // Everyone else (editor, viewer, agent) is sent to School map, even from a direct link.
  const homeAllowed = mode === "demo" || seesAllTabs(state.me);
  const ownerOnlyPath = path === "/" || /^\/(licensing|state|todo|pods|calendar|calls)(\/|$)/.test(path);
  const blockedHome = mode === "live" && !homeAllowed && ownerOnlyPath;
  const startHref = homeAllowed ? "/" : "/schools";
  useEffect(() => {
    if (blockedHome) router.replace("/schools");
  }, [blockedHome, router]);

  if (mode === "loading") return <div className="wrap"><p className="muted">Loading…</p></div>;
  if (mode === "signed-out") return <div className="wrap"><SignIn /></div>;
  if (mode === "needs-firm") return <div className="wrap"><CreateFirm /></div>;

  return (
    <div className="wrap">
      {mode === "demo" && <div className="demo">Demo mode with example data. Nothing is sent, paid or filed. <button className="linkbtn" onClick={signOut}>Sign in instead</button></div>}
      <header className="top">
        <Link href={startHref} className="brand"><i></i>{state.agency.name}</Link>
        <nav className="tabs" aria-label="Main">
          {AREAS.filter((t) => (isOwner || !t.ownerOnly) && (homeAllowed || !("homeOnly" in t))).map((t) => (
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
      <main>{blockedHome ? <p className="muted">Opening School map…</p> : children}</main>
      {mode === "live" && (
        <footer className="muted" style={{ marginTop: 32, fontSize: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span>Signed in as {email}</span>
          <button className="linkbtn" onClick={signOut}>Sign out</button>
          <SetPassword />
        </footer>
      )}
    </div>
  );
}
