/** One fee the athlete owes the agency, sent as a Stripe payment link. Saved on the player's profile. */
export interface Payment {
  /** Stripe payment link id (plink_...). */
  id: string;
  url: string;
  /** Dollars. */
  amount: number;
  /** What it's for, e.g. "Representation fee". */
  label: string;
  /** When the link was made (ISO). */
  created: string;
  status: "Waiting" | "Paid" | "Canceled";
  /** When Stripe says it was paid (ISO). */
  paidAt?: string | null;
}

export const FEE_LABELS = ["Representation fee", "Monthly fee", "Deal commission"] as const;

/** What the payment route answers when asked about links: the new status of each one that changed. */
export type PayUpdate = { id: string; status: Payment["status"]; paidAt?: string | null };
