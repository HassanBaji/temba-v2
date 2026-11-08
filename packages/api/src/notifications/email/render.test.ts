import { describe, expect, it } from "vitest";

import {
  notificationEmailDestination,
  renderNotificationEmail,
  type NotificationEmailInput,
} from "./render";

const ORIGIN = "https://temba.example";
const GROUP = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Night Crew",
};
const GAME = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Thursday Padel",
  format: "friendly_game",
  windowStart: new Date("2026-10-08T17:00:00.000Z"),
};
const OMAR = { id: "u-omar", name: "Omar Aziz", image: null };
const SARA = { id: "u-sara", name: "Sara Khalil", image: null };

function item(
  overrides: Partial<NotificationEmailInput> &
    Pick<NotificationEmailInput, "type">,
): NotificationEmailInput {
  return {
    audience: "admin",
    viaWaitlist: false,
    gameCount: null,
    actor: OMAR,
    partner: null,
    team: null,
    group: null,
    game: null,
    levelSet: null,
    ...overrides,
  };
}

function render(input: NotificationEmailInput, locale: "en" | "ar" = "en") {
  const email = renderNotificationEmail(input, locale, ORIGIN);
  if (!email) {
    throw new Error("Expected an email");
  }
  return email;
}

describe("renderNotificationEmail", () => {
  it("emails a Group join with the names in bold and a button to the Group", () => {
    const email = render(item({ type: "group_member_joined", group: GROUP }));

    expect(email.subject).toBe("Omar Aziz joined Night Crew");
    expect(email.html).toContain(
      "<strong>Omar Aziz</strong> joined <strong>Night Crew</strong>",
    );
    expect(email.html).toContain(
      `href="${ORIGIN}/dashboard/groups/${GROUP.id}"`,
    );
    expect(email.html).toContain(">Open the Group<");
    expect(email.html).toContain(`href="${ORIGIN}/dashboard/you/settings"`);
    expect(email.html).toContain("Manage Email notifications in Settings");
    expect(email.html).toContain('lang="en" dir="ltr"');
    expect(email.text).toContain("Omar Aziz joined Night Crew");
    expect(email.text).toContain(
      `Open the Group: ${ORIGIN}/dashboard/groups/${GROUP.id}`,
    );
    expect(email.text).toContain(`${ORIGIN}/dashboard/you/settings`);
  });

  it("names the Group on a Group Game and links the Game", () => {
    const email = render(
      item({ type: "game_player_joined", game: GAME, group: GROUP }),
    );

    expect(email.subject).toBe("Omar Aziz joined Thursday Padel");
    expect(email.html).toContain("In Night Crew");
    expect(email.html).toContain(`href="${ORIGIN}/dashboard/games/${GAME.id}"`);
    expect(email.html).toContain(">Open the Game<");
    expect(email.text).toContain("In Night Crew");
  });

  it("leaves the Group line off a Game without a Group", () => {
    const email = render(item({ type: "game_player_joined", game: GAME }));
    expect(email.html).not.toContain("In ");
    expect(email.text).not.toContain("In ");
  });

  it("reads the Waitlist join and the leave with a partner as the app does", () => {
    const waitlisted = render(
      item({ type: "game_player_joined", game: GAME, viaWaitlist: true }),
    );
    expect(waitlisted.subject).toBe(
      "Omar Aziz came off the Waitlist into Thursday Padel",
    );

    const left = render(
      item({ type: "game_player_left", game: GAME, partner: SARA }),
    );
    expect(left.subject).toBe(
      "Omar Aziz left Thursday Padel. Sara Khalil was removed with them",
    );
    expect(left.html).toContain("<strong>Sara Khalil</strong> was removed");
  });

  it("carries the subline where the type has one", () => {
    const admin = render(item({ type: "game_finished", game: GAME }));
    expect(admin.subject).toBe("Thursday Padel has finished");
    expect(admin.html).toContain("Every Match is in.");
    expect(admin.text).toContain("Every Match is in.");

    const player = render(
      item({ type: "game_finished", audience: "player", game: GAME }),
    );
    expect(player.html).toContain("See your results.");

    const seated = render(
      item({
        type: "game_seated_by_organizer",
        audience: "player",
        game: GAME,
      }),
    );
    expect(seated.subject).toBe("Omar Aziz added you to Thursday Padel");
    expect(seated.html).not.toContain('<p style="margin:0 0 8px;"></p>');
  });

  it("sends a changed side to the Game page", () => {
    const email = render(
      item({ type: "game_side_changed", audience: "player", game: GAME }),
    );
    expect(email.html).toContain(`href="${ORIGIN}/dashboard/games/${GAME.id}"`);
  });

  it("emails a set Level with its reason and a button to the Group", () => {
    const email = render(
      item({
        type: "level_set",
        audience: "player",
        group: GROUP,
        levelSet: { level: "3.5", levelBand: "B2", reason: "new_to_group" },
      }),
    );
    expect(email.subject).toMatch(/^Omar Aziz set your Level to .*3\.5$/);
    expect(email.html).toContain(
      `href="${ORIGIN}/dashboard/groups/${GROUP.id}"`,
    );
    expect(email.text.split("\n")[1]).not.toBe("");
  });

  it("sends the linked history to the Games hub History tab", () => {
    const email = render(
      item({
        type: "history_linked",
        audience: "player",
        actor: null,
        gameCount: 3,
      }),
    );
    expect(email.subject).toBe("We linked 3 Games played under your number");
    expect(email.html).toContain(
      `href="${ORIGIN}/dashboard/games?tab=history"`,
    );
    expect(email.html).toContain(">See your Games<");
  });

  it("sends a Team invite to Challenges, Teams", () => {
    const email = render(
      item({
        type: "team_invite_received",
        audience: "player",
        team: { id: "t-gooz", name: "Gooz FC" },
      }),
    );
    expect(email.subject).toBe("Omar Aziz invited you to Gooz FC");
    expect(email.html).toContain(
      `href="${ORIGIN}/dashboard/challenges?tab=teams"`,
    );
    expect(email.html).toContain(">Open your Teams<");
  });

  it("sends an expired Challenge to Challenges, Mine", () => {
    const email = render(
      item({
        type: "challenge_expired",
        audience: "player",
        actor: null,
        team: { id: "t-gooz", name: "Gooz FC" },
      }),
    );
    expect(email.subject).toBe("The challenge from Gooz FC expired");
    expect(email.html).toContain(
      `href="${ORIGIN}/dashboard/challenges?tab=mine"`,
    );
    expect(email.html).toContain(">Open Challenges<");
  });

  it("renders Arabic right-to-left from the Arabic catalog", () => {
    const email = render(
      item({ type: "group_member_joined", group: GROUP }),
      "ar",
    );
    expect(email.html).toContain('lang="ar" dir="rtl"');
    expect(email.html).toContain("افتح المجموعة");
    expect(email.html).toContain("text-align:right");
    expect(email.subject).toContain("انضم");
  });

  it("escapes names in the HTML and leaves the subject plain", () => {
    const email = render(
      item({
        type: "group_member_joined",
        actor: { ...OMAR, name: "<b>Omar</b> & co" },
        group: GROUP,
      }),
    );
    expect(email.subject).toBe("<b>Omar</b> & co joined Night Crew");
    expect(email.html).toContain("&lt;b&gt;Omar&lt;/b&gt; &amp; co");
    expect(email.html).not.toContain("<b>Omar</b>");
  });

  it("renders nothing the Web App would not show", () => {
    expect(
      renderNotificationEmail(
        item({ type: "group_member_joined" }),
        "en",
        ORIGIN,
      ),
    ).toBeNull();
    expect(
      renderNotificationEmail(
        item({ type: "game_finished", audience: "player" }),
        "en",
        ORIGIN,
      ),
    ).toBeNull();
    expect(
      renderNotificationEmail(
        {
          ...item({ type: "group_member_joined", group: GROUP }),
          type: "unknown" as never,
        },
        "en",
        ORIGIN,
      ),
    ).toBeNull();
    expect(
      notificationEmailDestination({
        type: "game_player_left",
        group: GROUP,
        game: null,
      }),
    ).toBeNull();
  });
});
