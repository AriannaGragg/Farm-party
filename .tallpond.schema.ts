import { defineSchema } from "@tallpond/schema";

/**
 * Farm Party data model.
 *
 * Pattern follows the Tallpond quickstart exactly: every table is
 * top-level (creator-owned — the submitter can always read/edit their
 * own row), and each is ALSO shared into the "event" resource so
 * organizers (admin role) can see everything in one place for review.
 *
 * NOTE: column helpers beyond `.text()` / `.timestamps()` / `.index()`
 * are assumed from the DSL pattern shown in the Tallpond quickstart
 * (e.g. `.integer()`, `.boolean()`). Verify against the full Schema &
 * deploy reference (https://tallpond.com/docs/schema-and-deploy/)
 * before the real deploy — this is a first pass, not a final schema.
 */
export default defineSchema({
  tables: {
    // One row per ticket / role request (Partier, Volunteer, or Musician).
    ticketRequests: (table) => {
      table.text("role").notNull();        // "partier" | "volunteer" | "musician"
      table.text("ticketType").notNull();   // "event" | "event+dinner"
      table.text("venmoHandle");
      table.text("phone");
      table.text("status").notNull();       // "pending" | "confirmed"
      table.timestamps();
      table.index(["status"]);
    },

    // Fixed-role or write-in volunteer sign-ups (games, keg, cleanup, etc).
    volunteerSignups: (table) => {
      table.text("roleChoice").notNull();   // "games" | "golf_cart" | "keg" | "cleanup" | "trash" | "other"
      table.text("writeIn");
      table.timestamps();
    },

    // Skill/activity pitches (yoga, acroyoga, craft class...) — reviewed, not auto-confirmed.
    activityOffers: (table) => {
      table.text("skill").notNull();
      table.text("writeIn");
      table.text("reviewStatus").notNull(); // "pending" | "approved" | "declined"
      table.timestamps();
    },

    // Band / artist profiles for the September lineup.
    bandProfiles: (table) => {
      table.text("name").notNull();
      table.text("genre");
      table.text("bio");
      table.text("musicLink");
      table.text("preferredTime");          // "afternoon" | "sunset" | "headline" | "no_preference"
      table.text("setLength");
      table.integer("memberCount");
      table.text("coverPhotoUrl");
      table.text("slotStatus").notNull();   // "pending" | "confirmed" | "declined"
      table.timestamps();
    },

    // Requests to join an existing band as a member.
    bandJoinRequests: (table) => {
      table.text("bandId").notNull();       // references bandProfiles row id
      table.text("instrument");
      table.text("status").notNull();       // "pending" | "approved"
      table.timestamps();
    },

    // Tortoise Mile race entries.
    beerMileEntries: (table) => {
      table.text("category").notNull();     // "male" | "female"
      table.text("estTime");
      table.integer("finishRank");
      table.text("finishTime");
      table.timestamps();
      table.index(["category"]);
    },

    // Self-reported year attendance, one row per year checked.
    yearsAttended: (table) => {
      table.integer("year").notNull();
      table.timestamps();
      table.index(["year"]);
    },

    // Crowdsourced photo/video album — link-paste based (Google Photos,
    // Drive, any share link) rather than native file upload, since blob
    // storage support in Tallpond is unconfirmed and link-paste is easy
    // on mobile regardless. Covers both "photo album" and "vlog" asks —
    // mediaType distinguishes the two, same table either way.
    media: (table) => {
      table.text("url").notNull();
      table.text("mediaType").notNull(); // "photo" | "video"
      table.text("caption");
      table.timestamps();
    },

    // ---- Multi-event structure (v1: bare minimum) ----

    // One row per crew event: Farm Party, Harvest Party, Mimosa Party, etc.
    // Farm Party is the flagship (isFlagship=true).
    events: (table) => {
      table.text("name").notNull();
      table.text("slug").notNull();       // url-friendly id, e.g. "farm-party"
      table.text("eventDate");
      table.text("location");
      table.text("coverImage");
      table.boolean("isFlagship");
      table.timestamps();
      table.index(["slug"]);
    },

    // The roster: names YOU add after confirming payment on Partiful/Venmo.
    // Guests search-and-claim their own row to link it to their account.
    // NOTE (v1 trade-off): claiming needs any signed-in member to update a
    // row they didn't create, which doesn't fit the normal creator/admin
    // update rule cleanly. Access below sets update="member" for this
    // table as a pragmatic v1 choice — fine for a small trusted crew, but
    // means anyone could technically claim/unclaim any row. Tighten later
    // with a serverless function that checks identity before allowing the
    // claim, rather than a wide-open client-side update.
    roster: (table) => {
      table.text("eventId").notNull();
      table.text("name").notNull();
      table.text("claimedByUserId");      // null until claimed
      table.text("plusOneOf");            // null unless this is someone's named plus-one
      table.timestamps();
      table.index(["eventId"]);
      table.index(["claimedByUserId"]);
    },

    // Guest-submitted schedule additions — lightweight, no review needed,
    // e.g. "sunrise yoga, 8am, by the barn." Anyone can add, anyone reads.
    scheduleItems: (table) => {
      table.text("eventId").notNull();
      table.text("time");
      table.text("title").notNull();
      table.text("addedByName");
      table.timestamps();
      table.index(["eventId"]);
    },
  },

  resources: {
    // "The Crew" — the whole hub, not one event. Every event's signups,
    // roster, and media get shared in here so organizers see everything
    // in one place, and any member can browse events + claim their spot.
    crew: (crew) => {
      crew.visibility("discoverable");
      crew.defaultRole("member");

      const organizerReview = (table: any) => {
        table.onMemberRemove("remove");
        table.onOwnerDelete("tombstone");
        table.access({
          read: "admin",      // only organizers see the full list
          create: "member",   // any signed-in guest can submit
          update: "creator",  // submitter can edit their own entry
          delete: "creator",
          unlink: "admin",
        });
      };

      crew.shares("ticketRequests", organizerReview);
      crew.shares("volunteerSignups", organizerReview);
      crew.shares("activityOffers", organizerReview);
      crew.shares("bandProfiles", organizerReview);
      crew.shares("bandJoinRequests", organizerReview);
      crew.shares("beerMileEntries", organizerReview);

      // Photo album: everyone can read + add, only the poster (or admin)
      // can remove.
      crew.shares("media", (table: any) => {
        table.onMemberRemove("remove");
        table.onOwnerDelete("tombstone");
        table.access({
          read: "member",
          create: "member",
          update: "creator",
          delete: "creator",
          unlink: "admin",
        });
      });

      // Events: only admin creates/edits events, everyone can browse them.
      crew.shares("events", (table: any) => {
        table.onMemberRemove("remove");
        table.onOwnerDelete("tombstone");
        table.access({
          read: "member",
          create: "admin",
          update: "admin",
          delete: "admin",
          unlink: "admin",
        });
      });

      // Roster: only admin adds names (after confirming Venmo). Everyone
      // can read (needed to search-and-claim). update="member" is the v1
      // trade-off noted above — any member can claim any unclaimed row.
      crew.shares("roster", (table: any) => {
        table.onMemberRemove("remove");
        table.onOwnerDelete("tombstone");
        table.access({
          read: "member",
          create: "admin",
          update: "member",
          delete: "admin",
          unlink: "admin",
        });
      });

      // Schedule additions: fully open, low-friction by design — this is
      // for spontaneous day-of stuff, not something worth gatekeeping.
      crew.shares("scheduleItems", (table: any) => {
        table.onMemberRemove("remove");
        table.onOwnerDelete("tombstone");
        table.access({
          read: "member",
          create: "member",
          update: "creator",
          delete: "creator",
          unlink: "admin",
        });
      });
    },
  },
});
