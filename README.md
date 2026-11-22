# Trin Co Agency

Trin Co: athlete recruiting and NIL. The menu runs Athletes (players, depth charts, classes), Match Maker (players moving and schools looking), Coaching (coaches we work with, school map), Agents (agents, deals and onboarding), Calendar (calendar and call list) and Licensing (the US map of licenses, green, yellow, red, with every step done on the site).

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
| `src/app/` | Home (`/`) is the dashboard every area reports up to. Athletes: `/players`, `/depth`, `/classes`. Match Maker: `/transfers`. Coaching: `/coaches`, `/schools`. Agents: `/hq`. Calendar: `/calendar`, `/calls`. Licensing and compliance lives under `/licensing`: the map with the state's steps beside it (`/licensing?s=FL`), its to-do list (`/licensing/todo`) and every state side by side (`/licensing/states`). |
| `scripts/check-states.mjs` | Runs before every build. Fails the build if any state file is missing a source, an amount, a section or reuses a step id. `npm run check-states` runs it alone. |
| `src/data/schools.ts` | Every FBS and FCS school for 2026 with conference and state. Edit here when schools move; schools can also be added in the app. |
| `src/lib/players.ts` | Player profiles (LS, K, P, K+P), school coaching contacts, NIL years. Saved in the firm's data (owner edits). |
| `src/app/players`, `src/app/compare`, `src/app/depth` | Player list and profiles, side-by-side comparison, and depth charts with top earners, All-Americans, All-Conference, starters and backups. |
| `src/app/calendar`, `src/app/calls` | Calendar (events, dated calls and to-dos) and the call list. Saved with your own data, like to-dos. |
| `src/components/LogCall.tsx`, `src/lib/intake.ts`, `src/app/api/notes/route.ts` | "Log a call" on each player: the note goes to Claude, which suggests where each fact belongs (profiles, NIL, depth chart, coaches, call list, calendar, notes). You tick what's right and it saves. Needs `ANTHROPIC_API_KEY` in Vercel. |
| `supabase/migrations/` | Database schema with row-level security for the real backend. |

## Still to connect

- **AI call notes:** add `ANTHROPIC_API_KEY` in Vercel → Settings → Environment Variables, then redeploy. Without it, notes still save to the call log.

- **Film uploads:** run `supabase/migrations/0002_film.sql` once so phone videos save to private storage. In demo mode they last until refresh.

- **Sign-in and database:** Supabase (schema is ready in `supabase/migrations`).
- **Athlete payments (Stripe):** a signed athlete's profile has a Payments card. Pick what it's for and the amount, then either tap "Make pay link" (copy it and text it) or pick "Email an invoice", type the athlete's email and tap "Email invoice" (Stripe emails the bill with a pay button and PDF, due in 14 days). When the profile opens, it asks Stripe which bills were paid. Sales tax is added on top automatically only when Stripe Tax has an active registration (see step 5); then the invoice form also asks for the athlete's address. The card shows "Test mode" while a test key is in use. Code: `src/components/Payments.tsx`, `src/app/api/pay/route.ts`. Setup:
  1. In Stripe (dashboard.stripe.com), finish account activation (business details and bank account) so payouts can reach you.
  2. Developers → API keys → Create restricted key. Give it **Write** on Payment Links, Products, Prices, Customers, Invoices and Invoice Items; **Read** on Checkout Sessions, Tax Settings and Tax Registrations. Everything else: None.
  3. In Vercel → trinco-hq → Settings → Environment Variables, add `STRIPE_SECRET_KEY` with that key as a **Sensitive** variable (Production and Preview), then redeploy. Never put the key in code or chat.
  4. Test first with a test-mode key (`rk_test_...`) and card 4242 4242 4242 4242, then swap in the live key. In test mode Stripe only emails invoices to your own Stripe team addresses, so invoice yourself to try it.
  5. Sales tax (optional): Stripe → Tax → Settings, add the head office address and a preset tax code, then Tax → Locations → add each state where you are already registered to collect. Ask a tax advisor whether agency fees are taxable where your athletes live; adding a location in Stripe does not register you with the state.
  6. Invoice reminders: Stripe → Settings → Billing → Invoices / Subscriptions and emails, turn on reminder emails for overdue invoices.
- **Billing:** Stripe monthly subscription per firm.
- **Real sending:** state filing, payments to the state, athletic director emails, and athlete contract signing (built-in e-sign or DocuSign).
- **Legal review:** state rule files have `attorney_reviewed: false` until a lawyer signs off.
