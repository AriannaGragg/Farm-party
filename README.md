# Farm Party — Tallpond project

## What's in here
- `.tallpond.schema.ts` — data model: tickets, volunteer signups, activity
  offers, band profiles, band join requests, beer mile entries, years
  attended. First pass — see the schema file's top comment for what to
  double-check against Tallpond's full docs before real-world use.
- `public/` — the actual site (renamed for real routing: `index.html` is
  home, `tortoise-mile.html` is the race page). Each page that has a live
  form is wired to `public/js/tallpond-app.js`, which handles sign-in and
  every data write.
- **Sign-in**: there's no more custom username/phone page. `tallpond.auth.signIn()`
  redirects to Tallpond's own hosted login (built on Ory) — whatever methods
  Tallpond has configured there (passwordless code, etc.) is what guests see.
  Every page calls `requireSignIn()` on load, so the whole site sits behind
  that gate as requested.
- **Wired so far**: Join (tickets, volunteer, musician/band), Tortoise Mile
  signup, Profile years-attended grid.
- **Not yet wired**: Photo Album (upload), Apparel Shop (not built), admin
  review dashboard (doesn't exist yet — right now you'd review submissions
  by querying the tables directly; a real dashboard is a follow-up).

## Deploy steps (run these in Replit's shell, not here)

I can't complete these myself — `tallpond login` opens a browser OAuth
approval page, and my sandbox has no network access to tallpond.com.
Replit's shell has full internet access, so this needs to happen there.

1. **Import this project into Replit** (upload the zip, or push this folder
   to a GitHub repo first and import from there).
2. Open the Replit **Shell** tab and run, one at a time:
   ```
   npx @tallpond/cli login
   ```
   This prints a link — open it, approve in your browser, come back to the
   shell.
   ```
   npx @tallpond/cli apps create "Farm Party"
   ```
   This registers the app, gives you a `https://farm-party.tallpond.app`
   subdomain, and writes a `tallpond.json` into the project (commit it —
   no secrets in it).
   ```
   npx @tallpond/cli dev
   ```
   Applies the schema to an isolated dev database and gives you a live
   test session — use this to click through the real site before it's public.
   ```
   npx @tallpond/cli deploy
   ```
   Ships it for real. Confirms before it touches production. Your live
   site is now at the `.tallpond.app` URL from step 2.

3. From then on: edit files, re-run `npx @tallpond/cli deploy` to push
   changes. Text edits (copy changes) are just editing the `.html` files
   directly in Replit's file browser — no CLI needed for that, only for
   schema or JS logic changes.

## Known gaps to fix before this is launch-ready
- Schema access rules (`event.shares(...)`) are my best read of the pattern
  in Tallpond's quickstart doc — worth a pass against the full
  Resources & membership reference before trusting it with real signups.
- No admin dashboard yet — reviewing/confirming Venmo payments currently
  means querying `ticketRequests` directly.
- Photo album upload and the apparel shop aren't wired to any backend yet.
