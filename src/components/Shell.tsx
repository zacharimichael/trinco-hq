"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

const TABS = [
  { href: "/", label: "My map", id: "tab-map" },
  { href: "/todo", label: "To-do", id: "tab-hub" },
  { href: "/hq", label: "HQ", id: "tab-firm" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state } = useStore();
  const current = (href: string) => (href === "/" ? path === "/" || path.startsWith("/state") : path.startsWith(href));
  return (
    <div className="wrap">
      <div className="demo">Demo mode with example data. Nothing is sent, paid or filed yet.</div>
      <header className="top">
        <Link href="/" className="brand"><i></i>{state.agency.name} HQ</Link>
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <Link key={t.href} id={t.id} href={t.href} aria-current={current(t.href) ? "page" : undefined} className="tablink">{t.label}</Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
