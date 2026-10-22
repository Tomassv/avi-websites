# report.avilabs.is

Internal Plan3 customer report. Next.js + Supabase (Postgres, Auth, row-level security).
Replaces the PHP pages in `sites/avilabs.is/report/`.

## Access model

- Users are invited in Supabase (sign-ups are off). Each invited user gets a `viewer` profile.
- Viewers can read everything; `editor`s can also change data and other users' roles.
- Enforced in the database (`supabase/migrations/0001_init.sql`): the app only ever uses the
  publishable key with the user's session. The secret key is for `npm run seed` on your machine.
- Every change to report data or roles is written to `audit_log`.

## Setup

1. `cp .env.example .env.local` and fill in the project URL and keys.
2. Supabase → SQL Editor: run `supabase/migrations/0001_init.sql`.
3. Supabase → Authentication → Sign In / Providers: turn off **Allow new users to sign up**.
4. Authentication → Users → **Invite user** for each person (or **Add user** with a password).
5. Make the first editor in the SQL Editor:
   `update public.profiles set role = 'editor' where email = 'you@avilabs.is';`
6. `npm install`, `npm run seed -- --dry-run` to review, then `npm run seed`.
7. `npm run dev`.

## Importing the old data

`scripts/seed-from-json.ts` reads `../avilabs.is/report/r3okk32@3/*.json`. Some monthly values
in those files were typed with thousands separators or a decimal comma ("10 000", "2,047.50",
"27.602,76"); the PHP pages read them with `parseInt`, so they showed e.g. 10 instead of 10,000.
The importer parses them properly and prints each one next to the old value. Values marked
AMBIGUOUS (a single separator followed by three digits, like "1,030") are read as thousands;
check them.

## Checks

`npm run typecheck` (after a first `npm run build`, which generates route types), `npm test`, `npm run build`.
