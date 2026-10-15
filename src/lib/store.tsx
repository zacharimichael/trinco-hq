"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AppState } from "./model";
import { DAY, startOfToday } from "./rules";

/**
 * App state. Today this runs in demo mode and saves to the browser.
 * When Supabase is connected, load() and save() switch to the database
 * (see supabase/migrations) and nothing in the screens changes.
 */
const KEY = "trinco-hq";
const VERSION = 1;

function seed(): AppState {
  const today = startOfToday().getTime();
  const iso = (daysAgo: number) => new Date(today - daysAgo * DAY).toISOString();
  return {
    v: VERSION,
    agency: { name: "Trin Co", split: 70 },
    profile: { name: "Jamie Carter", email: "jamie@trinco.com", phone: "(617) 555-0142", address: "200 Main St, Boston, MA 02110", dob: "1988-04-12" },
    done: { fl_app: true },
    athletes: [
      { id: "a1", name: "Jordan Ellis", school: "University of Florida", state: "FL", sport: "Football", signed: iso(1), done: { fl_nil_notice: true, contract: true } },
      { id: "a2", name: "Maya Brooks", school: "Boston College", state: "MA", sport: "Soccer", signed: null, done: {} },
    ],
    docs: [
      { name: "Florida application AA-4101", date: iso(2) },
      { name: "Notice to UF athletic director", date: iso(3) },
      { name: "NIL contract: Jordan Ellis", date: iso(1) },
    ],
    signatures: [],
    team: [
      { id: "t1", name: "Chris Taylor", email: "chris@trinco.com", stage: 3, split: 70, done: { fl_app: true, fl_prints: true, fl_fee: true, fl_submit: true, fl_approved: true, ma_school: true }, athletes: [{ name: "Devon Price", school: "Florida State", sport: "Basketball", state: "FL", contract: "Signed" }] },
      { id: "t2", name: "Sam Rivera", email: "sam@trinco.com", stage: 2, split: 70, done: { ma_school: true, fl_app: true }, athletes: [{ name: "Ava Lin", school: "Northeastern", sport: "Hockey", state: "MA", contract: "Signed" }] },
      { id: "t3", name: "Priya Shah", email: "priya@trinco.com", stage: 0, split: 70, done: {}, athletes: [] },
    ],
    deals: [
      { athlete: "Jordan Ellis", agent: "You", brand: "Gainesville Auto Group", amount: 5000, fee: 10, status: "Paid" },
      { athlete: "Devon Price", agent: "Chris Taylor", brand: "Seminole Sportswear", amount: 12000, fee: 10, status: "Pending" },
      { athlete: "Ava Lin", agent: "Sam Rivera", brand: "Boston Smoothie Co.", amount: 1800, fee: 10, status: "Paid" },
    ],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s.v === VERSION) return s;
    }
  } catch {}
  return seed();
}

type Ctx = { state: AppState; update: (fn: (draft: AppState) => void) => void; reset: () => void };
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const update = useCallback((fn: (draft: AppState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);
  const reset = useCallback(() => setState(seed()), []);

  return <StoreContext.Provider value={{ state, update, reset }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
