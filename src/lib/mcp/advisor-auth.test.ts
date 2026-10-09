import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OAuthError, verifyBearerToken } from "@modelcontextprotocol/server";

import { NotAdvisorError, createAdvisorVerifier, type AdvisorDirectory } from "./advisor-auth";

const STATIC = "s".repeat(40);
const NOW = 1_800_000_000;

const directory: AdvisorDirectory = {
  async verifyToken(token) {
    if (token === "advisor-jwt") return { userId: "u-advisor", email: "nutritionist@example.com", clientId: "claude", expiresAt: NOW + 600 };
    if (token === "farmer-jwt") return { userId: "u-farmer", email: "farmer@example.com", expiresAt: NOW + 600 };
    return null;
  },
  async isAdvisor(userId) {
    return userId === "u-advisor";
  },
};

const verifier = createAdvisorVerifier({ directory, staticToken: STATIC, now: () => NOW });

describe("advisor endpoint authentication", () => {
  it("accepts an OAuth token for an advisor account", async () => {
    const auth = await verifier.verifyAccessToken("advisor-jwt");
    assert.equal(auth.clientId, "claude");
    assert.equal(auth.expiresAt, NOW + 600);
    assert.equal(auth.extra?.userId, "u-advisor");
  });

  it("refuses a valid sign-in that is not an advisor", async () => {
    await assert.rejects(verifier.verifyAccessToken("farmer-jwt"), NotAdvisorError);
  });

  it("refuses unknown tokens as invalid_token", async () => {
    await assert.rejects(verifier.verifyAccessToken("forged"), (error) => error instanceof OAuthError && error.code === "invalid_token");
  });

  it("accepts the static token only when it is long enough and exact", async () => {
    assert.equal((await verifier.verifyAccessToken(STATIC)).clientId, "feedsport-advisor-token");
    await assert.rejects(verifier.verifyAccessToken(STATIC + "x"), OAuthError);
    const short = createAdvisorVerifier({ directory, staticToken: "short", now: () => NOW });
    await assert.rejects(short.verifyAccessToken("short"), OAuthError);
  });

  it("challenges a request without a bearer token", async () => {
    await assert.rejects(verifyBearerToken(null, { verifier }), (error) => error instanceof OAuthError && error.code === "invalid_token");
  });
});
