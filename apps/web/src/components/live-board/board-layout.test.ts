import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  boardScale,
  courtGrid,
  isBoardStale,
  placeCode,
  tableLayout,
} from "./board-layout";

describe("boardScale", () => {
  it("fills a 1080p TV and letterboxes a taller screen", () => {
    assert.equal(boardScale({ width: 1920, height: 1080 }), 1.5);
    assert.equal(boardScale({ width: 1280, height: 1024 }), 1);
    assert.equal(boardScale({ width: 2560, height: 720 }), 1);
  });

  it("is zero before the screen is measured", () => {
    assert.equal(boardScale({ width: 0, height: 0 }), 0);
  });
});

describe("courtGrid", () => {
  it("keeps four Courts two by two and widens for more", () => {
    assert.deepEqual(courtGrid(4), { columns: 2, pageSize: 4, dense: false });
    assert.deepEqual(courtGrid(5), { columns: 3, pageSize: 6, dense: true });
    assert.equal(courtGrid(9).pageSize, 6);
  });
});

describe("tableLayout", () => {
  it("tightens past eight rows and pages past twelve", () => {
    assert.deepEqual(tableLayout(8), { dense: false, pageSize: 8 });
    assert.deepEqual(tableLayout(12), { dense: true, pageSize: 12 });
    assert.deepEqual(tableLayout(16), { dense: true, pageSize: 12 });
  });
});

describe("placeCode", () => {
  it("pads a place to two digits", () => {
    assert.equal(placeCode(3), "03");
    assert.equal(placeCode(12), "12");
  });
});

describe("isBoardStale", () => {
  it("says so once three asks in a row have brought nothing", () => {
    assert.equal(isBoardStale(1_000, 16_000), false);
    assert.equal(isBoardStale(1_000, 16_001), true);
  });
});
