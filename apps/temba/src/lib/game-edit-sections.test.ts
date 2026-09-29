import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { gameEditSectionsToReseed } from "./game-edit-sections";

describe("gameEditSectionsToReseed", () => {
  it("reseeds every section while the Edit game dialog is closed", () => {
    assert.deepEqual(
      gameEditSectionsToReseed({ dialogOpen: false, justSaved: new Set() }),
      ["window", "price", "level", "rounds"],
    );
    assert.deepEqual(
      gameEditSectionsToReseed({
        dialogOpen: false,
        justSaved: new Set(["price"]),
      }),
      ["window", "price", "level", "rounds"],
    );
  });

  it("reseeds only the sections just saved while the dialog is open", () => {
    assert.deepEqual(
      gameEditSectionsToReseed({
        dialogOpen: true,
        justSaved: new Set(["price"]),
      }),
      ["price"],
    );
    assert.deepEqual(
      gameEditSectionsToReseed({
        dialogOpen: true,
        justSaved: new Set(["rounds", "window"]),
      }),
      ["window", "rounds"],
    );
  });

  it("keeps every open section's edits when nothing was just saved", () => {
    assert.deepEqual(
      gameEditSectionsToReseed({ dialogOpen: true, justSaved: new Set() }),
      [],
    );
  });
});
