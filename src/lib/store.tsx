"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppState, Deal, Me, SignatureRecord, TeamMember } from "./model";
import { DAY, startOfToday } from "./rules";
import { supabase } from "./supabase";
import { emptyScouting, withoutDemoPlayers, type Film, type Scouting } from "./players";

/**
 * App state, in one of two modes:
 * - live: signed in; each member's work is saved to Supabase (member_state),
 *   firm data (name, split, deals) to firms, and the team comes from members.
 */
const DEMO_KEY = "trinco-hq";
const DEMO_FLAG = "trinco-hq-demo";
const VERSION = 1;

export type Mode = "loading" | "signed-out" | "needs-firm" | "demo" | "live";

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
    scouting: emptyScouting(),
  };
}


/** The parts of AppState each member owns, stored in member_state.data. */
type MemberData = Pick<AppState, "profile" | "done" | "athletes" | "docs" | "licensedOn">;
const memberData = (s: AppState): MemberData => ({ profile: s.profile, done: s.done, athletes: s.athletes, docs: s.docs, licensedOn: s.licensedOn ?? {} });

/** Firm-wide data the owner saves to firms.data. */
type FirmData = { deals?: Deal[]; scouting?: Scouting };
const firmData = (s: AppState): FirmData => ({ deals: s.deals, scouting: s.scouting });

type MemberRow = { id: string; email: string; name: string; role: "owner" | "agent"; stage: number; split: number | null; user_id: string | null };

async function loadLive(session: Session): Promise<AppState | null> {
  await supabase.rpc("claim_invite");
  const { data: mine } = await supabase.from("members").select("id, firm_id, email, name, role, stage, split").eq("user_id", session.user.id).maybeSingle();
  if (!mine) return null;

  const [{ data: firm }, { data: members }, { data: states }] = await Promise.all([
    supabase.from("firms").select("name, default_split, data").eq("id", mine.firm_id).single(),
    supabase.from("members").select("id, email, name, role, stage, split, user_id").eq("firm_id", mine.firm_id).order("created_at"),
    supabase.from("member_state").select("member_id, data"),
  ]);
  const stateOf = (id: string) => (states ?? []).find((r) => r.member_id === id)?.data as Partial<MemberData> | undefined;
  const own = stateOf(mine.id) ?? {};

  const team: TeamMember[] =
    mine.role === "owner"
      ? ((members ?? []) as MemberRow[])
          .filter((m) => m.id !== mine.id)
          .map((m) => {
            const d = stateOf(m.id) ?? {};
            return {
              id: m.id, name: m.name, email: m.email, stage: m.stage, split: m.split ?? firm?.default_split ?? 70, done: d.done ?? {},
              athletes: (d.athletes ?? []).map((a) => ({ name: a.name, school: a.school, sport: a.sport, state: a.state, contract: a.done?.contract ? "Signed" : "Not sent" })),
            };
          })
      : [];

  const me: Me = { memberId: mine.id, role: mine.role, stage: mine.stage };
  return {
    v: VERSION,
    me,
    agency: { name: firm?.name ?? "Your agency", split: firm?.default_split ?? 70 },
    profile: { name: mine.name, email: mine.email, phone: "", address: "", dob: "", ...own.profile },
    done: own.done ?? {},
    athletes: own.athletes ?? [],
    docs: own.docs ?? [],
    licensedOn: own.licensedOn ?? {},
    signatures: [],
    team,
    deals: ((firm?.data as FirmData | null)?.deals ?? []),
    scouting: withoutDemoPlayers((firm?.data as FirmData | null)?.scouting),
  };
}

export type SaveState = { status: "saving" | "saved" | "error"; message?: string };

type Ctx = {
  state: AppState;
  /** Whether the latest changes reached the database. */
  save: SaveState;
  retrySave: () => void;
  mode: Mode;
  email: string | null;
  update: (fn: (draft: AppState) => void) => void;
  reset: () => void;
  signOut: () => Promise<void>;
  createFirm: (firmName: string, ownerName: string) => Promise<string | null>;
  inviteAgent: (name: string, email: string, split: number) => Promise<string | null>;
  recordSignature: (rec: SignatureRecord) => void;
  /** Saves a film clip. Signed in: to the firm's private storage. Demo: kept until refresh. */
  uploadFilm: (playerId: string, file: File) => Promise<Film | string>;
  /** A playable link for an uploaded clip. */
  filmUrl: (film: Film) => Promise<string>;
};
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(seed);
  const [mode, setMode] = useState<Mode>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "saved" });
  const [retry, setRetry] = useState(0);
  const saved = useRef<{ member: string; firm: string; stage: number }>({ member: "", firm: "", stage: 0 });

  const enterLive = useCallback(async (s: Session) => {
    setSession(s);
    const live = await loadLive(s);
    if (!live) return setMode("needs-firm");
    saved.current = { member: JSON.stringify(memberData(live)), firm: JSON.stringify(firmData(live)), stage: live.me?.stage ?? 0 };
    setState(live);
    setMode("live");
  }, []);

  useEffect(() => {
    // The site is private: no demo. Clear any demo data an older version left in this browser.
    try { localStorage.removeItem(DEMO_FLAG); localStorage.removeItem(DEMO_KEY); } catch {}
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void enterLive(data.session);
      else setMode("signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" && s) void enterLive(s);
      if (event === "SIGNED_OUT") { setSession(null); setMode("signed-out"); }
    });
    return () => sub.subscription.unsubscribe();
  }, [enterLive]);

  // Save after every change: demo to this browser, live to the database.
  useEffect(() => {
    if (mode === "demo") {
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(state)); } catch {}
      return;
    }
    if (mode !== "live" || !state.me) return;
    const me = state.me;
    const dirty = JSON.stringify(memberData(state)) !== saved.current.member || (me.role === "owner" && JSON.stringify(firmData(state)) !== saved.current.firm);
    if (dirty) setSave({ status: "saving" });
    const t = setTimeout(async () => {
      const problems: string[] = [];
      // Signing the agency agreement on the to-do list moves an agent from stage 1 to 2.
      if (me.stage === 2 && saved.current.stage === 1) {
        const { error } = await supabase.rpc("sign_agency_agreement");
        if (!error) saved.current.stage = 2;
      }
      const m = JSON.stringify(memberData(state));
      if (m !== saved.current.member) {
        const { error } = await supabase.from("member_state").upsert({ member_id: me.memberId, data: memberData(state), updated_at: new Date().toISOString() });
        if (!error) saved.current.member = m; else problems.push(error.message);
      }
      const f = JSON.stringify(firmData(state));
      if (me.role === "owner" && f !== saved.current.firm) {
        // An update the database refuses can come back with no error and no rows, so check a row came back.
        const { data, error } = await supabase.from("firms").update({ data: firmData(state) }).eq("id", (await supabase.rpc("my_firm_id")).data).select("id");
        if (!error && data?.length) saved.current.firm = f; else problems.push(error?.message ?? "The database didn't accept the change.");
      }
      setSave(problems.length ? { status: "error", message: problems[0] } : { status: "saved" });
    }, 600);
    return () => clearTimeout(t);
  }, [state, mode, retry]);

  // Don't let the tab close on unsaved work.
  useEffect(() => {
    if (save.status !== "saving" && save.status !== "error") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save.status]);

  const update = useCallback((fn: (draft: AppState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const value: Ctx = {
    state, mode, email: session?.user.email ?? null, update,
    save, retrySave: () => setRetry((n) => n + 1),
    reset: () => setState(seed()),
    signOut: async () => {
      try { localStorage.removeItem(DEMO_FLAG); } catch {}
      await supabase.auth.signOut();
      setMode("signed-out");
    },
    createFirm: async (firmName, ownerName) => {
      const { error } = await supabase.rpc("create_firm", { p_firm_name: firmName, p_owner_name: ownerName });
      if (error) return error.message;
      if (session) await enterLive(session);
      return null;
    },
    inviteAgent: async (name, email, split) => {
      if (mode !== "live") return null;
      const { data: firmId } = await supabase.rpc("my_firm_id");
      const { data, error } = await supabase.from("members").insert({ firm_id: firmId, name, email: email.toLowerCase(), split, role: "agent", stage: 0 }).select("id").single();
      if (error) return error.message;
      update((d) => { d.team.push({ id: data.id, name, email, stage: 0, split, done: {}, athletes: [] }); });
      return null;
    },
    recordSignature: (rec) => {
      if (mode !== "live" || !state.me) return;
      void supabase.from("signatures").insert({
        member_id: state.me.memberId, document: rec.document, document_sha256: rec.documentSha256,
        method: rec.method, value: rec.value, consent: true, user_agent: rec.userAgent, signed_at: rec.signedAt,
      });
    },
    uploadFilm: async (playerId, file) => {
      if (mode !== "live") return { kind: "Video", name: file.name, url: URL.createObjectURL(file) };
      const { data: firmId } = await supabase.rpc("my_firm_id");
      const path = `${firmId}/${playerId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage.from("film").upload(path, file, { contentType: file.type || "video/mp4" });
      if (error) return error.message;
      return { kind: "Video", name: file.name, url: "", path };
    },
    filmUrl: async (film) => {
      if (!film.path) return film.url;
      const { data } = await supabase.storage.from("film").createSignedUrl(film.path, 3600);
      return data?.signedUrl ?? "";
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
