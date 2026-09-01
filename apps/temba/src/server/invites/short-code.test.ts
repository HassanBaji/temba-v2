import { describe, expect, it } from "vitest";

import {
  createGameInviteShortCode,
  GAME_INVITE_SHORT_CODE_ALPHABET,
  parseGameInviteShortCode,
  preferredGameInviteUrl,
} from "~/server/invites/tokens";

describe("Game Invite short codes", () => {
  it("creates an 8-character uppercase code from the Crockford-style alphabet", () => {
    const code = createGameInviteShortCode();
    expect(code).toHaveLength(8);
    expect(code).toBe(code.toUpperCase());
    for (const character of code) {
      expect(GAME_INVITE_SHORT_CODE_ALPHABET.includes(character)).toBe(true);
    }
  });

  it("normalizes lookup case-insensitively and rejects characters outside the alphabet", () => {
    expect(parseGameInviteShortCode("a3f8k2pq")).toBe("A3F8K2PQ");
    expect(parseGameInviteShortCode(" A3F8K2PQ ")).toBe("A3F8K2PQ");
    expect(parseGameInviteShortCode("0O1ILUAB")).toBeNull();
    expect(parseGameInviteShortCode("ABC")).toBeNull();
    expect(parseGameInviteShortCode("A3F8K2PQU")).toBeNull();
  });

  it("prefers the short URL when a code exists and the long token URL otherwise", () => {
    expect(
      preferredGameInviteUrl("https://app.example", {
        token: "tok",
        shortCode: "A3F8K2PQ",
      }),
    ).toBe("https://app.example/g/A3F8K2PQ");
    expect(
      preferredGameInviteUrl("https://app.example", {
        token: "tok",
        shortCode: null,
      }),
    ).toBe("https://app.example/invites/game/link/tok");
  });
});
