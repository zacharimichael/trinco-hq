"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { CreateFirm, SignIn } from "./Gate";

const TABS = [
  { href: "/", label: "My map", id: "tab-map", ownerOnly: false },
  { href: "/todo", label: "To-do", id: "tab-hub", ownerOnly: false },
  { href: "/hq", label: "HQ", id: "tab-firm", ownerOnly: true },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state, mode, email, signOut } = useStore();
  const current = (href: string) => (href === "/" ? path === "/" || path.startsWith("/state") : path.startsWith(href));
  const isOwner = mode === "demo" || state.me?.role === "owner";

  if (mode === "loading") return <div className="wrap"><p className="muted">Loading…</p></div>;
  if (mode === "signed-out") return <div className="wrap"><SignIn /></div>;
  if (mode === "needs-firm") return <div className="wrap"><CreateFirm /></div>;

  return (
    <div className="wrap">
      {mode === "demo" && <div className="demo">Demo mode with example data. Nothing is sent, paid or filed. <button className="linkbtn" onClick={signOut}>Sign in instead</button></div>}
      <header className="top">
        <Link href="/" className="brand"><i></i>{state.agency.name} HQ</Link>
        <nav className="tabs" aria-label="Main">
          {TABS.filter((t) => isOwner || !t.ownerOnly).map((t) => (
            <Link key={t.href} id={t.id} href={t.href} aria-current={current(t.href) ? "page" : undefined} className="tablink">{t.label}</Link>
          ))}
        </nav>
      </header>
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
