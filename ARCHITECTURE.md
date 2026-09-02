# Architecture — Farm Party Crew Hub

**This file is the source of truth.** No build happens without this file being updated first. See the rule below.

Last updated against: `event.html` with countdown/share/schedule/carpool, `index.html` calendar, `profile.html`, cleaned 4-file structure.

---

## The rule

1. Every proposed change gets written into this file **before** any code changes.
2. Review the diff to this file. Once it's approved, code follows the spec — no re-litigating decisions mid-build.
3. If something built diverges from this file, **this file is wrong and gets fixed** — it must always reflect real, current state, not aspiration.
4. To see "what's the site right now" — open this file. Don't ask for a fresh walkthrough.

## Build order

1. **Static HTML first.** Full pages, real sample content, no Tallpond wiring. This is what gets iterated on — content, layout, copy, sections.
2. **Wire to Tallpond only after the static version is approved.** Swap sample data for real data calls, add the schema.
3. **Deploy last.** Tallpond hosting is the final step, not something running in parallel with design iteration.

Current status: **Phase 1, live on GitHub Pages for independent content editing — no CLI, no Tallpond, no me required for wording changes.**

---

## Pages (2 total)

### `index.html` — Home
Calendar-style grid of events, pulled from the `events` table. Farm Party displays larger, pinned as flagship (`isFlagship: true`). Tap a card → `event.html?e={slug}`.

### `event.html` — Event Page (one reusable template)
Sections, in order, current status:

| Section | Status | Notes |
|---|---|---|
| Hero (name/date/location) | ✅ Built | Pulled from `events` table |
| Countdown | ✅ Built | Needs `eventDate` in parseable format (`2026-10-24`), silently hides if not |
| Share button | ✅ Built | Native share sheet, falls back to copy-link |
| Roster claim | ✅ Built | Search unclaimed names, tap to claim. **Known trade-off**: `update: "member"` means anyone can claim/unclaim any row — fine for small trusted crew, not hardened |
| Past-years toggle (2024/2025) | ✅ Built | Shows after claiming. Year list is hardcoded in JS, not a DB field |
| The Basics (weather/dress/packing/tip/credits) | ✅ Built | Static content in `<!-- EDIT -->` blocks, not DB-backed |
| Farm Party Run (was Tortoise Mile) | 🟡 Placeholder | No signup form on-site — see note below |
| Schedule (guest additions) | ✅ Built | Fully open, no review — wired to `scheduleItems` |
| Carpool | ✅ Built | Just a link-out to an external Google Sheet, no schema |
| Photo Album | 🟡 Placeholder | No logic — decided not worth architecting yet |
| Music | ❌ Not built | Biggest real gap — kudos voting, jam sesh info, band profiles |

### `profile.html`
Bio, avatar, years-attended grid. **Known issue**: still single-event shaped, needs multi-event rework (not yet done).

---

## Schema — tables that exist

| Table | Shared how | Notes |
|---|---|---|
| `events` | `crew` resource, read=member, write=admin | |
| `roster` | `crew` resource, read=member, create=admin, **update=member** (trade-off above) | |
| `scheduleItems` | `crew` resource, fully open | |
| `media` | `crew` resource, read/create=member | Photo album backend — built but unused (page is a placeholder) |
| `yearsAttended` | Top-level, creator-owned | Reused from old single-event Profile build |
| `ticketRequests`, `volunteerSignups`, `activityOffers`, `bandProfiles`, `bandJoinRequests`, `beerMileEntries` | `crew` resource, admin-review pattern | Legacy from pre-Partiful-pivot. `beerMileEntries` also now dead — Farm Party Run signup moved to an external Partiful poll |

**Cleanup flag**: `ticketRequests`, `volunteerSignups`, `activityOffers`, `bandProfiles`, `bandJoinRequests` are unused dead weight in the schema — nothing currently writes to them. Worth pruning or repurposing when Music gets built (bandProfiles will matter again then).

---

## Data flow: Partiful → Site (manual, no API — this is a hard requirement, not a nice-to-have)

Partiful has no API or webhook. This flow is **entirely manual**, every time:

1. Guest RSVPs + pays via Venmo on Partiful.
2. Farm Party Run poll (mile/5k, speedy/chill) is asked as Partiful **Guest Questionnaire** dropdown questions — no site involvement.
3. Host taps **Export CSV** on Partiful's Guest List (includes RSVP status, check-in status if used, questionnaire answers). Note: Partiful names are often first-name-only — expect manual cleanup when matching against Venmo.
4. Host cross-references the CSV against actual Venmo payment activity — Partiful's RSVP status is not proof of payment, Venmo is the only source of truth for that.
5. Host manually adds/updates rows in the Tallpond `roster` table (via Tallpond's dashboard) for each confirmed+paid guest. **This is the only path data enters the site.**

**Required schema changes** — `roster` needs eight new fields, none live yet:
- `paymentStatus` — `"verified"` | `"unverified"`, **admin-only** — not guest-editable, not guest-visible. Distinct from `dietaryPreference`/`notes` below.
- `dietaryPreference` — free text or short enum (veggie/meat/other), **guest-editable after claiming**
- `notes` — free text, **guest-editable after claiming**
- `priorYearsAttended` — free text reference field (e.g. `"2022, 2024, 2025"`), set at bulk-import time from the Partiful questionnaire answer. Not the live source of truth — shown to the guest at claim time so they can confirm/correct via the existing `yearsAttended` toggle, which stays the real interactive record.
- `role` — `"partier"` | `"volunteer"` | `"musician"` | `"service"`, admin-set at import/validation time. Drives ticket pricing (below) and can show as a badge on the claimed-roster state.
- `volunteerCategory` — free text (e.g. "food help," "sports help," "facilities help," "cleanup") — captured from Partiful, **assignment happens later by admin**, not chosen definitively at signup.
- `serviceDescription` — free text — for "other services" (lights, videography, cocktails, yoga, acroyoga, etc.), guest describes what they'd do in their own words on Partiful.
- `bandName` — free text — musicians write their band name on Partiful; ties into the not-yet-built Music section later.

**Required new tool — Admin Bulk Import** (not built): a page or script where the validated spreadsheet (CSV) gets pasted/uploaded and parsed into one batch of `roster` inserts, instead of adding guests one at a time through Tallpond's raw dashboard. This is the actual fix for "sheet → website" not being 150 manual clicks.

## Ticket structure & pricing (external, Partiful/Venmo — site never processes payment, just reflects the structure informationally)

- **Event ticket** and **Dinner ticket** are separate, priced separately.
- **Musician** (`role: "musician"`) — both tickets free.
- **Volunteer or Other Service** (`role: "volunteer"` or `"service"`) — full price on the event ticket, **dinner ticket free**.
- **Partier** (`role: "partier"`, the default) — pays full price for both.

**Plus-one rule**: a plus-one must be the **same role** as the person bringing them (a Volunteer's +1 is also a Volunteer, a Partier's +1 is also a Partier — no mixing). Every plus-one needs their **full name** (first + last), not just a first name — Partiful defaults to first-name-only, so this has to be collected explicitly, and it's the only way roster claiming can reliably match them later. Enforce this at the validation/bulk-import step, not just as a suggestion.

## Volunteer & Services signup flow (entirely via Partiful — no site build)

This is **not** a site feature. It happens the same way as the Farm Party Run poll — as Partiful Guest Questionnaire fields, at RSVP time:
- Guest picks **Volunteer** (broad category only: food/sports/facilities/cleanup — actual task assignment happens later, by admin) **or Other Service** (free-text description of what they'd do — lights, videography, cocktails, yoga, acroyoga, etc.) **or** neither.
- Musicians write their band name in a dedicated field.
- Host validates everything in the same spreadsheet pass as payment verification — one review step covers Venmo confirmation, volunteer/service assignment, and band validation together.
- A **linked doc** (not yet created) explains the volunteer/service categories and what's expected — linked from the Partiful questionnaire so guests know what they're signing up for before they answer.

**Full pipeline once this is built:**
1. Guest fills Partiful RSVP + Guest Questionnaire (Venmo handle, run preference, dietary, notes, prior years attended, volunteer/service/musician choice)
2. Export CSV from Partiful
3. Host validates Venmo payments **and** assigns/confirms volunteer & service roles in a master spreadsheet
4. Host runs the Bulk Import tool against that spreadsheet → roster populated in one action, including `role`/pricing implications
5. Guest signs in, claims their row, sees `priorYearsAttended` pre-filled as reference, confirms/adjusts via the toggle, can edit their own dietary/notes going forward

## Explicitly decided, not to be re-litigated

- Ticketing/payment: external, Partiful + Venmo. Site is never a payment processor.
- Notifications: Partiful's Text Blast. No custom SMS build.
- Auth: Tallpond hosted sign-in, whole site gated, no custom sign-in page.
- Chat/threads: axed. Not building this.
- Carpool: external Google Sheet link, not a built feature.
- Kudos voting mechanic: top 5 by kudos = the lineup (mechanic locked, UI not built).
- **Farm Party Run (was Tortoise Mile)**: format decided via a **Partiful poll**, external to the site — mile vs. 5k, speedy vs. chill. The poll fully replaces any on-site signup form; the site's Run section is informational only, same shape as the Photo Album placeholder. `beerMileEntries` table and its old male/female-category signup are now dead/legacy, same status as the other pre-pivot leftover tables.

## Open, unresolved

- **Farm Party Run prize** (fastest male/female wins beer + free admission next year): status not decided — depends on whether the poll lands on something competitive enough to still make sense. Revisit once poll results are in.
- Music section — needs to be actually built
- Admin dashboard — no UI exists to create events/roster rows; currently requires Tallpond's own dashboard
- Photo album — placeholder only, real build deferred
- Roster claim race condition (two people claiming the same row) — not handled
- Profile page's multi-event rework
- Top-5-kudos vs. 1.5hr slot-scheduling math — never resolved
- Tarp situation — never resolved, purpose still unclear
