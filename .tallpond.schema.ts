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
  },

  resources: {
    // "This year's Farm Party" — every signup gets shared in here so
    // organizers can review everything from one dashboard.
    event: (event) => {
      event.visibility("discoverable");
      event.defaultRole("member");

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

      event.shares("ticketRequests", organizerReview);
      event.shares("volunteerSignups", organizerReview);
      event.shares("activityOffers", organizerReview);
      event.shares("bandProfiles", organizerReview);
      event.shares("bandJoinRequests", organizerReview);
      event.shares("beerMileEntries", organizerReview);
    },
  },
});
