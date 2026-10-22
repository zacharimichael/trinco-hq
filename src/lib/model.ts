import type { Done } from "./rules";

export interface Profile {
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
}

export interface Athlete {
  id: string;
  name: string;
  school: string;
  state: string;
  sport: string;
  /** When the athlete signed the NIL contract. Starts the 72-hour notice clock. */
  signed: string | null;
  done: Done;
}

export interface Doc {
  name: string;
  date: string;
  /** Signed PDF as a data URL in demo mode; a storage path once Supabase is connected. */
  pdf?: string;
}

/** Signature evidence kept with every e-signed document (ESIGN / UETA audit trail). */
export interface SignatureRecord {
  document: string;
  documentSha256: string;
  signer: string;
  method: "drawn" | "typed";
  value: string;
  consent: true;
  signedAt: string;
  userAgent: string;
}

export const STAGES = ["Invited", "Signing agency agreement", "Getting licensed", "Active"] as const;

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  stage: number;
  split: number;
  done: Done;
  athletes: { name: string; school: string; sport: string; state: string; contract: "Signed" | "Not sent" }[];
}

export interface Deal {
  athlete: string;
  agent: string;
  brand: string;
  amount: number;
  fee: number;
  status: "Paid" | "Pending";
}

export interface Me {
  memberId: string;
  role: "owner" | "agent";
  stage: number;
}

export interface AppState {
  v: number;
  /** Set when signed in. Absent in demo mode. */
  me?: Me;
  agency: { name: string; split: number };
  profile: Profile;
  done: Done;
  athletes: Athlete[];
  docs: Doc[];
  signatures: SignatureRecord[];
  team: TeamMember[];
  deals: Deal[];
  /** When each state approved the license (ISO date), for renewal reminders. */
  licensedOn?: Record<string, string>;
}
