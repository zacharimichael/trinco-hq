# Trin Co Agency

NIL agent licensing, compliance and agency management. Agents see a US map of their licenses (green, yellow, red), do every step on the site with e-signatures, and track athletes. The agency owner runs the business from **HQ**: onboarding agents, compliance across the team, athletes, deals and the commission split.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build and type check
```

The site is private: everything needs sign-in, and only emails listed in Supabase's `allowed_owners` table can create an agency (`supabase/migrations/0003_private.sql`). Agents the owner invites from HQ can join that agency.

## Where things live

| Path | What it is |
|---|---|
| `src/data/states/*.json` | One file per state: licensing steps, per-athlete steps, ongoing rules, renewal. `npm run sync-states` copies new files from the project's `state-rules` folder and rebuilds the index. Each step gets a guided flow from its `type`; custom flows live in `src/lib/tasks.tsx`. |
| `src/lib/rules.ts` | Map color logic (`status`), dates and deadlines. |
| `src/lib/tasks.tsx` | Every to-do as a guided flow: fill, review, e-sign, done. |
| `src/components/TaskRunner.tsx` | The step-by-step modal and signature pad. |
| `src/app/` | Home (`/`) is the Trin Co Agency dashboard every area reports up to. Licensing and compliance lives under `/licensing`: the map with the state's steps beside it (`/licensing?s=FL`), its to-do list (`/licensing/todo`) and every state side by side (`/licensing/states`). Agents and deals is `/hq`. |
| `scripts/check-states.mjs` | Runs before every build. Fails the build if any state file is missing a source, an amount, a section or reuses a step id. `npm run check-states` runs it alone. |
| `src/data/schools.ts` | Every FBS and FCS school for 2026 with conference and state. Edit here when schools move; schools can also be added in the app. |
| `src/lib/players.ts` | Player profiles (LS, K, P, K+P), school coaching contacts, NIL years. Saved in the firm's data (owner edits). |
| `src/app/players`, `src/app/compare`, `src/app/depth` | Player list and profiles, side-by-side comparison, and depth charts with top earners, All-Americans, All-Conference, starters and backups. |
| `supabase/migrations/` | Database schema with row-level security for the real backend. |

## Still to connect

- **Film uploads:** run `supabase/migrations/0002_film.sql` once so phone videos save to private storage. In demo mode they last until refresh.

- **Sign-in and database:** Supabase (schema is ready in `supabase/migrations`).
- **Billing:** Stripe monthly subscription per firm.
- **Real sending:** state filing, payments to the state, athletic director emails, and athlete contract signing (built-in e-sign or DocuSign).
- **Legal review:** state rule files have `attorney_reviewed: false` until a lawyer signs off.
