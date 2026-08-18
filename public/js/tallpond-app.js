// Farm Party — shared Tallpond client
// Loaded on every page via: <script type="module" src="/js/tallpond-app.js"></script>
//
// Handles: sign-in state, the "event" resource lookup/join, and the
// insert calls each page's forms use. Keep DOM logic per-page inline
// (see the <script> block at the bottom of each html file) — this
// file only exports the data functions so nothing here is page-specific.

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

let _eventResourceId = null;

export async function getEventResource() {
  if (_eventResourceId) return _eventResourceId;
  const existing = await tallpond
    .resources({ type: "event" })
    .limit(1)
    .get()
    .catch(() => []);
  if (existing?.[0]) {
    _eventResourceId = existing[0].id;
  } else {
    const created = await tallpond.resource.create("event", { name: "Farm Party 2026" });
    _eventResourceId = created.id;
  }
  return _eventResourceId;
}

async function insertIntoEvent(table, row) {
  const eventId = await getEventResource();
  return tallpond.resource(eventId).table(table).insert(row);
}

// ---- Form submit handlers, one per page --------------------------

export async function submitTicketRequest({ role, ticketType, venmoHandle, phone }) {
  await requireSignIn();
  return insertIntoEvent("ticketRequests", {
    role, ticketType, venmoHandle, phone, status: "pending",
  });
}

export async function submitVolunteerSignup({ roleChoice, writeIn }) {
  await requireSignIn();
  return insertIntoEvent("volunteerSignups", { roleChoice, writeIn: writeIn || null });
}

export async function submitActivityOffer({ skill, writeIn }) {
  await requireSignIn();
  return insertIntoEvent("activityOffers", {
    skill, writeIn: writeIn || null, reviewStatus: "pending",
  });
}

export async function submitBandProfile({ name, genre, bio, musicLink, preferredTime, setLength, memberCount, coverPhotoUrl }) {
  await requireSignIn();
  return insertIntoEvent("bandProfiles", {
    name, genre, bio, musicLink, preferredTime, setLength,
    memberCount: memberCount ? parseInt(memberCount, 10) : null,
    coverPhotoUrl: coverPhotoUrl || null,
    slotStatus: "pending",
  });
}

export async function submitBandJoinRequest({ bandId, instrument }) {
  await requireSignIn();
  return insertIntoEvent("bandJoinRequests", { bandId, instrument, status: "pending" });
}

export async function listBands() {
  const eventId = await getEventResource();
  return tallpond.resource(eventId).table("bandProfiles").orderBy("createdAt", "desc").get();
}

export async function submitBeerMileEntry({ category, estTime }) {
  await requireSignIn();
  return insertIntoEvent("beerMileEntries", { category, estTime: estTime || null });
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
