import test from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";

const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <body>
      <input id="words" value="" />
      <button id="mapBtn">Map</button>
      <div id="status"></div>
      <div id="results" class="hidden"></div>
      <div id="primaryWord"></div>
      <ul id="synonyms"></ul>
      <ul id="antonyms"></ul>
      <ul id="broader"></ul>
      <ul id="narrower"></ul>
      <div id="miniBlend" class="hidden"></div>
    </body>
  </html>
`, { url: "http://localhost/" });

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = { getItem: () => "token" };

let callToolResult = {
  isError: false,
  content: [{ text: JSON.stringify({ primary: "test", words: ["test"], relations: { synonyms: ["s1"], antonyms: [], broader: [], narrower: [] } }) }]
};

global.mcp_sdk = {
  StreamableHTTPClientTransport: class {
    constructor(url, options) {}
  },
  Client: class {
    constructor(info, caps) {}
    async connect(transport) {}
    async callTool(req) {
      return callToolResult;
    }
  }
};

const { fillList } = await import("./app.js");

test("fillList populates list element", () => {
  const listEl = document.createElement("ul");
  fillList(listEl, ["apple", "banana"]);
  assert.strictEqual(listEl.children.length, 2);
  assert.strictEqual(listEl.children[0].textContent, "apple");
  assert.strictEqual(listEl.children[1].textContent, "banana");
});

test("fillList adds em dash when items are empty", () => {
  const listEl = document.createElement("ul");
  fillList(listEl, []);
  assert.strictEqual(listEl.children.length, 1);
  assert.strictEqual(listEl.children[0].textContent, "—");
});

test("button click maps words and updates UI", async () => {
  const input = document.getElementById("words");
  const btn = document.getElementById("mapBtn");
  const statusEl = document.getElementById("status");
  const resultsSection = document.getElementById("results");
  const synList = document.getElementById("synonyms");

  // set input
  input.value = "hello";

  // mock the result for this test
  callToolResult = {
    isError: false,
    content: [{
      text: JSON.stringify({
        primary: "hello",
        words: ["hello"],
        relations: {
          synonyms: ["hi"],
          antonyms: ["goodbye"],
          broader: ["greeting"],
          narrower: ["howdy"]
        },
        miniBlend: {
          description: "A friendly greeting."
        }
      })
    }]
  };

  btn.click();

  // wait a bit for async operations
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(statusEl.textContent, "");
  assert.strictEqual(resultsSection.classList.contains("hidden"), false);
  assert.strictEqual(synList.children.length, 1);
  assert.strictEqual(synList.children[0].textContent, "hi");
});

test("button click handles empty input", async () => {
  const input = document.getElementById("words");
  const btn = document.getElementById("mapBtn");
  const statusEl = document.getElementById("status");
  const resultsSection = document.getElementById("results");

  input.value = "   "; // empty/whitespace
  btn.click();

  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(statusEl.textContent, "Please enter at least one word.");
  assert.strictEqual(resultsSection.classList.contains("hidden"), true);
});

test("button click handles tool call error", async () => {
  const input = document.getElementById("words");
  const btn = document.getElementById("mapBtn");
  const statusEl = document.getElementById("status");
  const resultsSection = document.getElementById("results");

  input.value = "error_test";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({
        structured_detail: { error: "Something went wrong" }
      })
    }]
  };

  btn.click();

  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(statusEl.textContent, "Error mapping words. Try again in a moment.");
  assert.strictEqual(resultsSection.classList.contains("hidden"), true);
});
