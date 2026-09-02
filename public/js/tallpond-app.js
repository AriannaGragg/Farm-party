// Farm Party — shared Tallpond client
// Loaded on every page via: <script type="module" src="/js/tallpond-app.js"></script>
//
// Handles: sign-in state, the "crew" resource lookup (the whole
// multi-event hub, not one party), and the data calls each page's forms
// use. Keep DOM logic per-page inline (see the <script> block at the
// bottom of each html file) — this file only exports data functions.

import { createClient } from "https://esm.sh/@tallpond/sdk";

// Zero-config on the deployed Tallpond domain; for local `tallpond dev`
// testing, gatewayUrl/clientId are injected automatically too — this
// only needs explicit values if you're running the gateway yourself.
export const tallpond = createClient();

// ---- Auth --------------------------------------------------------

export async function requireSignIn() {
  const user = await tallpond.auth.getUser().catch(() => null);
  if (!user) {
    await tallpond.auth.signIn(); // redirects to Tallpond's hosted login
    return null;
  }
  return user;
}

export async function signOut() {
  await tallpond.auth.signOut();
  window.location.href = "/";
}

// Call on every page load to swap nav "Sign In" -> username / avatar.
export async function paintAuthState() {
  const user = await tallpond.auth.getUser().catch(() => null);
  const slot = document.querySelector("[data-auth-slot]");
  if (!slot) return user;

  if (user) {
    slot.innerHTML = `<span class="nav-user">${user.displayName || user.email || "Signed in"}</span>`;
    slot.onclick = signOut;
  } else {
    slot.textContent = "Sign In";
    slot.onclick = (e) => {
      e.preventDefault();
      tallpond.auth.signIn();
    };
  }
  return user;
}

// ---- The shared "event" resource ---------------------------------
// Every signup gets published into this resource so organizers (admin
// role) can review everything in one place. First call on a page wins;
// subsequent calls just re-fetch the same discoverable resource.

let _crewResourceId = null;

export async function getCrewResource() {
  if (_crewResourceId) return _crewResourceId;
  const existing = await tallpond
    .resources({ type: "crew" })
    .limit(1)
    .get()
    .catch(() => []);
  if (existing?.[0]) {
    _crewResourceId = existing[0].id;
  } else {
    const created = await tallpond.resource.create("crew", { name: "The Crew" });
    _crewResourceId = created.id;
  }
  return _crewResourceId;
}

async function insertIntoCrew(table, row) {
  const crewId = await getCrewResource();
  return tallpond.resource(crewId).table(table).insert(row);
}

// ---- Form submit handlers, one per page --------------------------

export async function submitTicketRequest({ role, ticketType, venmoHandle, phone }) {
  await requireSignIn();
  return insertIntoCrew("ticketRequests", {
    role, ticketType, venmoHandle, phone, status: "pending",
  });
}

export async function submitVolunteerSignup({ roleChoice, writeIn }) {
  await requireSignIn();
  return insertIntoCrew("volunteerSignups", { roleChoice, writeIn: writeIn || null });
}

export async function submitActivityOffer({ skill, writeIn }) {
  await requireSignIn();
  return insertIntoCrew("activityOffers", {
    skill, writeIn: writeIn || null, reviewStatus: "pending",
  });
}

export async function submitBandProfile({ name, genre, bio, musicLink, preferredTime, setLength, memberCount, coverPhotoUrl }) {
  await requireSignIn();
  return insertIntoCrew("bandProfiles", {
    name, genre, bio, musicLink, preferredTime, setLength,
    memberCount: memberCount ? parseInt(memberCount, 10) : null,
    coverPhotoUrl: coverPhotoUrl || null,
    slotStatus: "pending",
  });
}

export async function submitBandJoinRequest({ bandId, instrument }) {
  await requireSignIn();
  return insertIntoCrew("bandJoinRequests", { bandId, instrument, status: "pending" });
}

export async function listBands() {
  const crewId = await getCrewResource();
  return tallpond.resource(crewId).table("bandProfiles").orderBy("createdAt", "desc").get();
}

export async function submitBeerMileEntry({ category, estTime }) {
  await requireSignIn();
  return insertIntoCrew("beerMileEntries", { category, estTime: estTime || null });
}

// ---- Photo Album / Vlog ---------------------------------------
// Open to everyone (read + create) — different rule from every other
// table, which is admin-only. See schema.ts for the access rationale.

export async function submitMedia({ url, mediaType, caption }) {
  await requireSignIn();
  return insertIntoCrew("media", { url, mediaType, caption: caption || null });
}

export async function listMedia() {
  const crewId = await getCrewResource();
  return tallpond.resource(crewId).table("media").orderBy("createdAt", "desc").get();
}

export async function deleteMedia(mediaId) {
  const crewId = await getCrewResource();
  return tallpond.resource(crewId).table("media").delete(mediaId);
}

export async function toggleYearAttended(year, isNowChecked) {
  await requireSignIn();
  if (isNowChecked) {
    return tallpond.table("yearsAttended").insert({ year });
  }
  const rows = await tallpond.table("yearsAttended").filter({ year }).get();
  for (const r of rows) {
    await tallpond.table("yearsAttended").delete(r.id);
  }
}

export async function getMyYearsAttended() {
  const rows = await tallpond.table("yearsAttended").orderBy("year", "asc").get();
  return rows.map((r) => r.year);
}

// ---- Events (multi-event hub) ------------------------------------

export async function listEvents() {
  const crewId = await getCrewResource();
  return tallpond.resource(crewId).table("events").orderBy("eventDate", "asc").get();
}

export async function getEventBySlug(slug) {
  const crewId = await getCrewResource();
  const rows = await tallpond.resource(crewId).table("events").filter({ slug }).get();
  return rows?.[0] || null;
}

// ---- Roster / claim your spot -------------------------------------
// Admin adds rows after confirming Venmo on Partiful. Guests search for
// their name and claim it, linking the row to their account.

export async function listRosterForEvent(eventId) {
  const crewId = await getCrewResource();
  return tallpond.resource(crewId).table("roster").filter({ eventId }).get();
}

export async function getMyRosterEntry(eventId) {
  const user = await requireSignIn();
  if (!user) return null;
  const all = await listRosterForEvent(eventId);
  return all.find((r) => r.claimedByUserId === user.id) || null;
}

export async function claimRosterEntry(rosterId) {
  const user = await requireSignIn();
  if (!user) return null;
  const crewId = await getCrewResource();
  return tallpond.resource(crewId).table("roster").update(rosterId, {
    claimedByUserId: user.id,
  });
}

// ---- Guest-submitted schedule additions ---------------------------
// Deliberately low-friction — no review step, unlike volunteer activity
// offers. This is for spontaneous day-of stuff.

export async function listScheduleItems(eventId) {
  const crewId = await getCrewResource();
  return tallpond.resource(crewId).table("scheduleItems")
    .filter({ eventId }).orderBy("time", "asc").get();
}

export async function submitScheduleItem({ eventId, time, title }) {
  const user = await requireSignIn();
  const crewId = await getCrewResource();
  return tallpond.resource(crewId).table("scheduleItems").insert({
    eventId, time, title,
    addedByName: user?.displayName || user?.email || "Someone",
  });
}
