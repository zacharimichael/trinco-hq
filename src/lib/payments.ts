/** One fee the athlete owes the agency, sent as a Stripe pay link or an emailed Stripe invoice. Saved on the player's profile. */
export interface Payment {
  /** Stripe id: plink_... for a pay link, in_... for an invoice. */
  id: string;
  /** The page the athlete pays on (pay link, or the invoice's hosted page). */
  url: string;
  /** Dollars billed, before any sales tax. */
  amount: number;
  /** What it's for, e.g. "Representation fee". */
  label: string;
  /** When the link or invoice was made (ISO). */
  created: string;
  status: "Waiting" | "Paid" | "Canceled";
  /** When Stripe says it was paid (ISO). */
  paidAt?: string | null;
  /** How it was sent. Missing means a pay link (older payments). */
  kind?: "link" | "invoice";
  /** Who the invoice was emailed to. */
  email?: string | null;
  /** When the invoice is due (ISO). */
  due?: string | null;
  /** Dollars paid including sales tax, when Stripe added tax. */
  total?: number | null;
}

export const FEE_LABELS = ["Representation fee", "Monthly fee", "Deal commission"] as const;

/** Days an athlete has to pay an emailed invoice. */
export const INVOICE_DAYS = 14;

/** What the payment route answers when asked about links and invoices: the new status of each one that changed. */
export type PayUpdate = { id: string; status: Payment["status"]; paidAt?: string | null; total?: number | null };

/** How Stripe is set up, so the card can say "Test mode" and ask for an address when tax is on. */
export type PaySetup = { test: boolean; tax: boolean };

/** Mailing address Stripe needs to work out sales tax on an invoice. */
export type BillAddress = { line1: string; city: string; state: string; zip: string };
