import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { safeAuthRedirect } from "./auth-redirect";

const ORIGIN = "https://feedsport.example";

describe("safeAuthRedirect", () => {
  test("accepts and canonicalizes approved studio routes", () => {
    assert.equal(safeAuthRedirect("/studio", ORIGIN), "/studio");
    assert.equal(safeAuthRedirect("/studio/catalogue?q=maize%20meal#results", ORIGIN), "/studio/catalogue?q=maize%20meal#results");
    assert.equal(safeAuthRedirect("/studio/formulations/formulation-1", ORIGIN), "/studio/formulations/formulation-1");
    assert.equal(safeAuthRedirect("/studio/programmes/grow-finish/phases/grower", ORIGIN), "/studio/programmes/grow-finish/phases/grower");
    assert.equal(safeAuthRedirect("/oauth/consent?authorization_id=abc", ORIGIN), "/oauth/consent?authorization_id=abc");
  });

  test("rejects external, backslash, control-character, and encoded variants", () => {
    const unsafe = [
      null,
      "https://evil.example/studio",
      "//evil.example/studio",
      "/\\evil.example",
      "/studio\\@evil.example",
      "/studio/\nevil",
      "/studio/%5cevil",
      "/studio/%255cevil",
      "/studio/%0aevil",
      "/studio/%250aevil",
    ];
    for (const value of unsafe) assert.equal(safeAuthRedirect(value, ORIGIN), null, String(value));
  });

  test("rejects same-origin paths outside the approved application routes", () => {
    const unapproved = [
      "/dashboard",
      "/studio/not-a-route",
      "/studio/programmes/a/extra",
      "/studio/%2e%2e/%2e%2e//evil.example",
      "/oauth/consent/extra",
    ];
    for (const value of unapproved) assert.equal(safeAuthRedirect(value, ORIGIN), null, value);
  });
});
