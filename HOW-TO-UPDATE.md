# How to Manually Update the Site (Phase 1 — no CLI needed)

Right now the site is static HTML — no backend, no Tallpond involved yet. That means you can edit and preview it **entirely inside github.com, in a browser, with no coding tool installed.**

## One-time setup: turn on GitHub Pages

1. On your repo on github.com, go to **Settings → Pages**
2. Under "Build and deployment," set **Source** to "Deploy from a branch"
3. Set **Branch** to `main`, folder to `/public` (or `/root` if your files aren't in a `public` folder — check first)
4. Save. GitHub gives you a live URL, something like `https://yourusername.github.io/farm-party/`
5. That URL is now live and public — anyone with the link can view it (fine for this stage; nothing sensitive lives here yet since there's no login or real data)

## The actual edit loop, no CLI, no me

1. Go to your repo on github.com, click into `public/event.html` (or `index.html`)
2. Click the **pencil icon** (top right of the file view) to edit directly in the browser
3. Find the section by its `<!-- EDIT: ... -->` comment — only change text between that and the matching `<!-- /EDIT -->`
4. Scroll down, write a commit message, click **Commit changes**
5. Wait ~30 seconds, refresh your live GitHub Pages URL — your change is live

That's the whole loop. No terminal, no `npx` commands, no Codespaces required for this phase.

---

## Type 1: Database content (event name, date, location, roster names)

**Not relevant yet.** There's no database in Phase 1 — everything, including event name/date/location, is static text in the HTML files, editable the same way as everything else below. This section will matter once Phase 2 (Tallpond wiring) happens — kept here so it's ready when that day comes.

This lives in Tallpond, not in any file. To change it:
1. Open your Tallpond dashboard (wherever `tallpond login` sent you)
2. Find the `events` or `roster` table
3. Edit the row directly

**Important for the countdown timer**: the `eventDate` field needs to be in a format JavaScript can parse as a real date, or the countdown silently won't show. Safe formats:
- `2026-10-24` ✅
- `October 24, 2026` ✅
- `Oct 24–25` ❌ — looks fine as text but won't parse, countdown just won't appear (this fails silently on purpose, so a bad date never shows an error to guests — but it does mean you should double check the countdown actually shows up after you set this)

---

## Type 2: Static page content (weather protocol, dress code, packing list, credits)

This lives directly in `public/event.html`, inside clearly marked comment blocks. Look for:

```html
<!-- EDIT: Weather Protocol -->
<div class="info-block">
  <div class="label">Weather Protocol</div>
  <p>Your text here...</p>
</div>
<!-- /EDIT -->
```

**To change it:**
1. Open `public/event.html` in Codespaces' file editor
2. Find the section by its comment label (`<!-- EDIT: Dress Code -->`, etc.)
3. Edit only the text between the opening `<!-- EDIT: ... -->` and closing `<!-- /EDIT -->` comments
4. Don't touch anything outside those markers — that's structure/logic, not content
5. Save, then redeploy (see below)

**Current editable blocks in `event.html`:**
- Weather Protocol
- Dress Code
- What to Bring
- Tip Note (Jorge's taco crew)
- Credits
- Carpool Sheet link

---

## Setting up the Carpool sheet

The Carpool card just links out to a Google Sheet — no database, no build. To set it up:

1. Create a new Google Sheet, share it as "anyone with the link can edit"
2. Suggested columns: **Driver · Car · Total Seats · Who's Riding · Departure Time · Return Time · Starting Location**
3. Copy the share link
4. In `event.html`, find `<!-- EDIT: Carpool Sheet Link -->` and replace `REPLACE_WITH_YOUR_SHEET_LINK` with your real link
5. Redeploy

Since it's just a link, this needs to be updated per-event if the sheet changes — no per-event database field for it (matches the "keep it simple" call on this one).

---

## Adding or changing images

Nothing currently displays an image inline — the site is text/color-first by design. To add one:

1. Get a hosted image URL (upload to your Tallpond `media` table via the photo album flow, or use any image host)
2. Inside an EDIT block, add:
   ```html
   <img src="PASTE_URL_HERE" alt="describe the image" style="width:100%;border-radius:10px;margin-top:10px;">
   ```
3. Keep it inside the `<!-- EDIT -->...<!-- /EDIT -->` markers so it's clearly flagged as content, not structure

For the event's cover image specifically, that's a database field (`events.coverImage`) — set it in the Tallpond dashboard, same as event name/date.

---

## After any change: redeploy

Editing files alone doesn't update the live site. In the Codespaces terminal:

```
npx @tallpond/cli deploy
```

Database edits (Type 1) go live immediately — no deploy needed for those.

---

## What NOT to touch (unless you mean to)

Anything **outside** an `<!-- EDIT -->` block is structure or logic — CSS classes, `<script>` tags, function calls like `submitBeerMileEntry(...)`. Changing those can break the page. If you're not sure whether something is safe to edit, look for the comment markers — if it's not inside one, ask before changing it.
