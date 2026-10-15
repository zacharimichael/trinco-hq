# Trin Co HQ

NIL agent licensing, compliance and agency management. Agents see a US map of their licenses (green, yellow, red), do every step on the site with e-signatures, and track athletes. The agency owner runs the business from **HQ**: onboarding agents, compliance across the team, athletes, deals and the commission split.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build and type check
```

The app runs in **demo mode** with example data saved in the browser (`src/lib/store.tsx`). Nothing is sent, paid or filed yet.

## Where things live

| Path | What it is |
|---|---|
| `src/data/states/*.json` | One file per state: licensing steps, per-athlete steps, ongoing rules, renewal. Add a state by adding a file and listing it in `src/lib/rules.ts`. |
| `src/lib/rules.ts` | Map color logic (`status`), dates and deadlines. |
| `src/lib/tasks.tsx` | Every to-do as a guided flow: fill, review, e-sign, done. |
| `src/components/TaskRunner.tsx` | The step-by-step modal and signature pad. |
| `src/app/` | Screens: map (`/`), state page (`/state/FL`), to-do (`/todo`), agency HQ (`/hq`). |
| `supabase/migrations/` | Database schema with row-level security for the real backend. |

## Still to connect

- **Sign-in and database:** Supabase (schema is ready in `supabase/migrations`).
- **Billing:** Stripe monthly subscription per firm.
- **Real sending:** state filing, payments to the state, athletic director emails, and athlete contract signing (built-in e-sign or DocuSign).
- **Legal review:** state rule files have `attorney_reviewed: false` until a lawyer signs off.
