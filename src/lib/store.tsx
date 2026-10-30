"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppState, Deal, Me, SharedFilm, SignatureRecord, TeamMember } from "./model";
import { DAY, startOfToday } from "./rules";
import { supabase } from "./supabase";
import { ROSTER_PLAYERS } from "@/data/roster-specialists";
import { emptyScouting, missingRosterPlayers, withoutDemoPlayers, type Film, type Scouting } from "./players";

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
type MemberData = Pick<AppState, "profile" | "done" | "athletes" | "docs" | "licensedOn" | "myTodos" | "calls" | "events">;
const memberData = (s: AppState): MemberData => ({ profile: s.profile, done: s.done, athletes: s.athletes, docs: s.docs, licensedOn: s.licensedOn ?? {}, myTodos: s.myTodos ?? [], calls: s.calls ?? [], events: s.events ?? [] });

const ROSTER_POSITIONS = ["LS", "P", "K"] as const;
const ROSTER_IDS = Object.fromEntries(ROSTER_POSITIONS.map((pos) => [pos, new Set(ROSTER_PLAYERS.filter((r) => r.pos === pos).map((r) => r.id))]));

/** Firm-wide data the owner saves to firms.data. */
type FirmData = { deals?: Deal[]; scouting?: Scouting };
const firmData = (s: AppState): FirmData => ({ deals: s.deals, scouting: s.scouting });

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// Older databases (before 0005_editor.sql) don't have the merge-save functions yet.
const noFunction = (e: { code?: string; message: string }) => e.code === "PGRST202" || /could not find the function/i.test(e.message);

/** Only what changed since the last save, so two people saving at once merge instead of overwrite. */
function memberChanges(prev: MemberData, next: MemberData) {
  const patch: Record<string, unknown> = {};
  const merge: Record<string, Record<string, unknown>> = {};
  for (const k of Object.keys(next) as (keyof MemberData)[]) {
    if (same(prev[k], next[k])) continue;
    if (k === "done" || k === "licensedOn") {
      const a: Record<string, unknown> = prev[k] ?? {}, b: Record<string, unknown> = next[k] ?? {};
      merge[k] = {};
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) if (!same(a[key], b[key])) merge[k][key] = b[key] ?? null;
    } else patch[k] = next[k];
  }
  return { p_patch: patch, p_merge: merge };
}

function firmChanges(prev: FirmData, next: FirmData) {
  const a = prev.scouting ?? emptyScouting(), b = next.scouting ?? emptyScouting();
  const before = new Map(a.players.map((p) => [p.id, p]));
  const now = new Set(b.players.map((p) => p.id));
  return {
    p_players: b.players.filter((p) => !same(before.get(p.id), p)),
    p_removed: a.players.filter((p) => !now.has(p.id)).map((p) => p.id),
    p_staff: Object.fromEntries(Object.entries(b.staff).filter(([k, v]) => !same(a.staff[k], v))),
    p_schools: b.extraSchools.filter((x) => !a.extraSchools.some((y) => y.id === x.id)),
    p_deals: same(prev.deals, next.deals) ? null : next.deals ?? [],
  };
}

type MemberRow = { id: string; email: string; name: string; role: Me["role"]; stage: number; split: number | null; user_id: string | null };

async function loadLive(session: Session): Promise<AppState | null> {
  await supabase.rpc("claim_invite");
  const { data: mine } = await supabase.from("members").select("id, firm_id, email, name, role, stage, split").eq("user_id", session.user.id).maybeSingle();
  if (!mine) return null;

  const [{ data: firm }, { data: members }, { data: states }, { data: films }] = await Promise.all([
    supabase.from("firms").select("name, default_split, data").eq("id", mine.firm_id).single(),
    supabase.from("members").select("id, email, name, role, stage, split, user_id").eq("firm_id", mine.firm_id).order("created_at"),
    supabase.from("member_state").select("member_id, data"),
    supabase.from("shared_film").select("id, player_id, film, added_by").order("created_at"),
  ]);
  const rows = (members ?? []) as MemberRow[];
  // Someone the owner shared with works on the owner's map.
  const base = ((mine.role === "viewer" || mine.role === "editor") && rows.find((m) => m.role === "owner")) || mine;
  const stateOf = (id: string) => (states ?? []).find((r) => r.member_id === id)?.data as Partial<MemberData> | undefined;
  const own = stateOf(base.id) ?? {};

  const team: TeamMember[] =
    mine.role !== "agent"
      ? rows
          .filter((m) => m.role === "agent")
          .map((m) => {
            const d = stateOf(m.id) ?? {};
            return {
              id: m.id, name: m.name, email: m.email, stage: m.stage, split: m.split ?? firm?.default_split ?? 70, done: d.done ?? {},
              athletes: (d.athletes ?? []).map((a) => ({ name: a.name, school: a.school, sport: a.sport, state: a.state, contract: a.done?.contract ? "Signed" : "Not sent" })),
            };
          })
      : [];
  const shared = mine.role === "owner" ? rows.filter((m) => m.role === "viewer" || m.role === "editor").map((m) => ({ id: m.id, email: m.email, joined: !!m.user_id })) : [];
  const sharedFilm: SharedFilm[] = (films ?? []).map((r) => ({ id: r.id, player: r.player_id, film: r.film as Film, by: r.added_by }));

  const me: Me = { memberId: base.id, role: mine.role, stage: base === mine ? mine.stage : 3 };
  return {
    v: VERSION,
    me,
    agency: { name: firm?.name ?? "Your agency", split: firm?.default_split ?? 70 },
    profile: { name: base.name, email: base.email, phone: "", address: "", dob: "", ...own.profile },
    done: own.done ?? {},
    athletes: own.athletes ?? [],
    docs: own.docs ?? [],
    licensedOn: own.licensedOn ?? {},
    myTodos: own.myTodos ?? [],
    calls: own.calls ?? [],
    events: own.events ?? [],
    signatures: [],
    team,
    shared,
    sharedFilm,
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
  /** Owner only: lets one more person sign in and do everything the owner can, except manage who has access. */
  share: (email: string) => Promise<string | null>;
  unshare: (id: string) => Promise<string | null>;
  /** Someone the owner shared with adds a clip to a player. */
  addSharedFilm: (playerId: string, film: Film) => Promise<string | null>;
  removeSharedFilm: (id: string) => Promise<string | null>;
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
  const saved = useRef<{ member: MemberData; firm: FirmData; stage: number } | null>(null);

  const enterLive = useCallback(async (s: Session) => {
    setSession(s);
    const live = await loadLive(s);
    if (!live) return setMode("needs-firm");
    saved.current = { member: memberData(live), firm: firmData(live), stage: live.me?.stage ?? 0 };
    // The first time an owner or editor opens the app, fill the depth charts with the real 2026 long snappers, punters and kickers,
    // each position once. Left out of the saved copy so they save like any other change. After that, the Depth charts button adds new ones.
    const lead = live.me?.role === "owner" || live.me?.role === "editor";
    if (lead) for (const pos of ROSTER_POSITIONS)
      if (!live.scouting.players.some((p) => ROSTER_IDS[pos].has(p.id))) live.scouting = { ...live.scouting, players: [...live.scouting.players, ...missingRosterPlayers(live.scouting, pos)] };
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
    // View-only people never save.
    if (mode !== "live" || !state.me || state.me.role === "viewer" || !saved.current) return;
    const me = state.me, last = saved.current;
    const lead = me.role === "owner" || me.role === "editor";
    const m = memberData(state), f = firmData(state);
    const dirty = !same(m, last.member) || (lead && !same(f, last.firm));
    if (dirty) setSave({ status: "saving" });
    const t = setTimeout(async () => {
      const problems: string[] = [];
      // Signing the agency agreement on the to-do list moves an agent from stage 1 to 2.
      if (me.stage === 2 && last.stage === 1) {
        const { error } = await supabase.rpc("sign_agency_agreement");
        if (!error) last.stage = 2;
      }
      if (!same(m, last.member)) {
        let { error } = await supabase.rpc("save_my_state", memberChanges(last.member, m));
        if (error && noFunction(error) && me.role !== "editor")
          ({ error } = await supabase.from("member_state").upsert({ member_id: me.memberId, data: m, updated_at: new Date().toISOString() }));
        if (!error) last.member = m; else problems.push(error.message);
      }
      if (lead && !same(f, last.firm)) {
        let { error } = await supabase.rpc("save_firm_changes", firmChanges(last.firm, f));
        if (error && noFunction(error) && me.role === "owner") {
          // An update the database refuses can come back with no error and no rows, so check a row came back.
          const r = await supabase.from("firms").update({ data: f }).eq("id", (await supabase.rpc("my_firm_id")).data).select("id");
          error = r.error ?? (r.data?.length ? null : { message: "The database didn't accept the change." } as typeof error);
        }
        if (!error) last.firm = f; else problems.push(error.message);
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
    // View-only: nothing they tap changes anything.
    state, mode, email: session?.user.email ?? null, update: state.me?.role === "viewer" ? () => {} : update,
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
    share: async (raw) => {
      const email = raw.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return "Type their full email.";
      const { data: firmId } = await supabase.rpc("my_firm_id");
      const { data, error } = await supabase.from("members").insert({ firm_id: firmId, name: email, email, role: "editor", stage: 3 }).select("id").single();
      if (error) return /duplicate|unique/i.test(error.message) ? "That email already has access."
        : /row-level security|check constraint/i.test(error.message) ? "The database isn't set up for sharing yet. Run 0004_share.sql in Supabase (SQL Editor), then try again."
        : error.message;
      update((d) => { (d.shared ??= []).push({ id: data.id, email, joined: false }); });
      return null;
    },
    unshare: async (id) => {
      const { data, error } = await supabase.from("members").delete().eq("id", id).select("id");
      if (error || !data?.length) return error?.message ?? "The database didn't accept the change.";
      update((d) => { d.shared = (d.shared ?? []).filter((p) => p.id !== id); });
      return null;
    },
    addSharedFilm: async (playerId, film) => {
      const { data: firmId } = await supabase.rpc("my_firm_id");
      const { data, error } = await supabase.from("shared_film").insert({ firm_id: firmId, player_id: playerId, film }).select("id, added_by").single();
      if (error) return error.message;
      update((d) => { (d.sharedFilm ??= []).push({ id: data.id, player: playerId, film, by: data.added_by }); });
      return null;
    },
    removeSharedFilm: async (id) => {
      const { data, error } = await supabase.from("shared_film").delete().eq("id", id).select("id");
      if (error || !data?.length) return error?.message ?? "The database didn't accept the change.";
      update((d) => { d.sharedFilm = (d.sharedFilm ?? []).filter((f) => f.id !== id); });
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
