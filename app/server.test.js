import test from "node:test";
import assert from "node:assert";
import { fetchDatamuse, deprecatedMapHandler } from "./server.js";

test("deprecatedMapHandler returns 410 and error message", async () => {
  let statusCode;
  let jsonPayload;

  const req = {};
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (payload) => {
      jsonPayload = payload;
      return res;
    }
  };

  await deprecatedMapHandler(req, res);

  assert.strictEqual(statusCode, 410);
  assert.deepStrictEqual(jsonPayload, { error: "Deprecated. Use /mcp endpoint with MCP protocol." });
});

test("fetchDatamuse successfully retrieves and parses data", async () => {
  const mockData = [{ word: "test", score: 100 }];
  const mockFetch = async (url) => {
    assert.ok(url.includes("rel_syn=word"));
    return {
      ok: true,
      json: async () => mockData
    };
  };

  const result = await fetchDatamuse({ rel_syn: "word" }, mockFetch);
  assert.deepStrictEqual(result, mockData);
});

test("fetchDatamuse throws an error on non-OK response", async () => {
  const mockFetch = async (url) => {
    return {
      ok: false,
      statusText: "Not Found"
    };
  };

  await assert.rejects(
    fetchDatamuse({ rel_syn: "error_word" }, mockFetch),
    {
      name: "Error",
      message: "Datamuse error: Not Found"
    }
  );
});

import { cabpMiddleware } from "./server.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

test("cabpMiddleware handles missing Authorization header", () => {
  const req = { headers: {} };
  let statusCode, jsonResponse;
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { jsonResponse = data; }
  };
  const next = () => { throw new Error("next should not be called"); };

  cabpMiddleware(req, res, next);

  assert.strictEqual(statusCode, 401);
  assert.strictEqual(jsonResponse.structured_detail.violation, "MISSING_JWT");
});

test("cabpMiddleware handles invalid JWT signature / throw error", () => {
  process.env.JWT_PUBLIC_KEY = "dummy_key";
  const req = { headers: { authorization: "Bearer invalid.token.payload" } };
  let statusCode, jsonResponse;
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { jsonResponse = data; }
  };
  const next = () => { throw new Error("next should not be called"); };

  cabpMiddleware(req, res, next);

  assert.strictEqual(statusCode, 403);
  assert.strictEqual(jsonResponse.structured_detail.violation, "INVALID_JWT");
});

test("cabpMiddleware successfully processes valid JWT", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  process.env.JWT_PUBLIC_KEY = publicKey;

  const payload = {
    user_id: "user123",
    tenant_id: "tenant456",
    scopes: ["read", "write"]
  };
  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });

  const req = { headers: { authorization: `Bearer ${token}` } };
  let statusCode, jsonResponse;
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { jsonResponse = data; }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  cabpMiddleware(req, res, next);

  assert.ok(nextCalled);
  assert.deepStrictEqual(req.mcpContext, {
    user_id: "user123",
    tenant_id: "tenant456",
    scopes: ["read", "write"]
  });
});
