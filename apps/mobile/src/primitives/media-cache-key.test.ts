import { describe, expect, it } from "vitest";

import { mediaCacheKey } from "./media-cache-key";

const BASE = "https://temba-media.t3.storageapi.dev/group-images/g1/image";

function signed(date: string, version = "3") {
  return (
    `${BASE}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=key%2F${date}%2Fauto%2Fs3%2Faws4_request` +
    `&X-Amz-Date=${date}T000000Z&X-Amz-Expires=604800&X-Amz-Signature=abc&X-Amz-SignedHeaders=host` +
    `&response-cache-control=public&v=${version}&x-amz-checksum-mode=ENABLED&x-id=GetObject`
  );
}

describe("mediaCacheKey", () => {
  it("keeps one key when the API re-signs the same image", () => {
    expect(mediaCacheKey(signed("20261016"))).toBe(
      mediaCacheKey(signed("20261022")),
    );
    expect(mediaCacheKey(signed("20261016"))).toBe(
      `${BASE}?response-cache-control=public&v=3&x-id=GetObject`,
    );
  });

  it("gives a replaced image a new key", () => {
    expect(mediaCacheKey(signed("20261016", "4"))).not.toBe(
      mediaCacheKey(signed("20261016", "3")),
    );
  });

  it("leaves a URL without signing parameters alone", () => {
    expect(mediaCacheKey("https://img.clerk.com/a.png")).toBe(
      "https://img.clerk.com/a.png",
    );
    expect(mediaCacheKey("https://img.clerk.com/a.png?width=80")).toBe(
      "https://img.clerk.com/a.png?width=80",
    );
  });

  it("drops the query when only signing parameters were on it", () => {
    expect(mediaCacheKey(`${BASE}?X-Amz-Signature=abc`)).toBe(BASE);
  });
});
