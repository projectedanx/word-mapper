import test from "node:test";
import assert from "node:assert";
import { fetchDatamuse } from "./server.js";

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
