import { z } from "zod/v4";

/** One suggested change. Fields that don't apply to its kind are null. */
export const ChangeSchema = z.object({
  kind: z.enum(["set", "nil", "fact", "new_player", "call", "event", "coach"]),
  /** An existing player's id, a new player's ref ("new1"), or "" when it's about no player. */
  player: z.string(),
  field: z.string().nullable(),
  value: z.string().nullable(),
  label: z.string().nullable(),
  year: z.number().nullable(),
  amount: z.number().nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  pos: z.enum(["LS", "K", "P"]).nullable(),
  school: z.string().nullable(),
  role: z.enum(["HC", "GM", "ST"]).nullable(),
  /** What it means, in a few plain words, for the review list. */
  text: z.string(),
});
export const IntakeSchema = z.object({ changes: z.array(ChangeSchema) });
export type Change = z.infer<typeof ChangeSchema>;
