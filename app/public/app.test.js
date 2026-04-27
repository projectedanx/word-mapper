import test from "node:test";
import assert from "node:assert";

/**
 * Manual DOM mock to replace jsdom in restricted environments.
 */
class MockElement {
  constructor(tagName = "DIV") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.classList = new Set();
    const self = this;
    this.classList.add = function(cls) { Set.prototype.add.call(self.classList, cls); };
    this.classList.remove = function(cls) { Set.prototype.delete.call(self.classList, cls); };
    this.classList.contains = function(cls) { return Set.prototype.has.call(self.classList, cls); };
    this.textContent = "";
    this._innerHTML = "";
    this.value = "";
    this._listeners = {};
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    if (val === "") {
      this.children = [];
    }
  }

  appendChild(child) {
    if (child.nodeType === 11) {
      this.children.push(...child.children);
    } else {
      this.children.push(child);
    }
    return child;
  }

  addEventListener(type, listener) {
    this._listeners[type] = this._listeners[type] || [];
    this._listeners[type].push(listener);
  }

  click() {
    if (this._listeners["click"]) {
      this._listeners["click"].forEach(l => l({}));
    }
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement("BODY");
    this._elements = {};
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  createDocumentFragment() {
    return {
      nodeType: 11,
      children: [],
      appendChild(child) {
        this.children.push(child);
        return child;
      }
    };
  }

  getElementById(id) {
    if (!this._elements[id]) {
      this._elements[id] = new MockElement();
    }
    return this._elements[id];
  }
}

const mockDoc = new MockDocument();
global.window = { location: { href: "http://localhost/" } };
global.document = mockDoc;
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
  const listEl = mockDoc.createElement("ul");
  fillList(listEl, ["apple", "banana"]);
  assert.strictEqual(listEl.children.length, 2);
  assert.strictEqual(listEl.children[0].textContent, "apple");
  assert.strictEqual(listEl.children[1].textContent, "banana");
});

test("fillList adds em dash when items are empty", () => {
  const listEl = mockDoc.createElement("ul");
  fillList(listEl, []);
  assert.strictEqual(listEl.children.length, 1);
  assert.strictEqual(listEl.children[0].textContent, "—");
});

test("fillList handles null or undefined items", () => {
  const listEl = mockDoc.createElement("ul");
  fillList(listEl, null);
  assert.strictEqual(listEl.children.length, 1);
  assert.strictEqual(listEl.children[0].textContent, "—");

  const listEl2 = mockDoc.createElement("ul");
  fillList(listEl2, undefined);
  assert.strictEqual(listEl2.children.length, 1);
  assert.strictEqual(listEl2.children[0].textContent, "—");
});

test("fillList clears existing content", () => {
  const listEl = mockDoc.createElement("ul");
  listEl.appendChild(mockDoc.createElement("li"));
  listEl.appendChild(mockDoc.createElement("li"));
  assert.strictEqual(listEl.children.length, 2);

  fillList(listEl, ["new item"]);
  assert.strictEqual(listEl.children.length, 1);
  assert.strictEqual(listEl.children[0].textContent, "new item");
});

test("fillList uses textContent for security", () => {
  const listEl = mockDoc.createElement("ul");
  const malicious = "<img src=x onerror=alert(1)>";
  fillList(listEl, [malicious]);
  assert.strictEqual(listEl.children[0].textContent, malicious);
});

test("button click maps words and updates UI", async () => {
  const input = mockDoc.getElementById("words");
  const btn = mockDoc.getElementById("mapBtn");
  const statusEl = mockDoc.getElementById("status");
  const resultsSection = mockDoc.getElementById("results");
  const synList = mockDoc.getElementById("synonyms");

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
  const input = mockDoc.getElementById("words");
  const btn = mockDoc.getElementById("mapBtn");
  const statusEl = mockDoc.getElementById("status");
  const resultsSection = mockDoc.getElementById("results");

  input.value = "   "; // empty/whitespace
  btn.click();

  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(statusEl.textContent, "Please enter at least one word.");
  assert.strictEqual(resultsSection.classList.contains("hidden"), true);
});

test("button click handles tool call error", async () => {
  const input = mockDoc.getElementById("words");
  const btn = mockDoc.getElementById("mapBtn");
  const statusEl = mockDoc.getElementById("status");
  const resultsSection = mockDoc.getElementById("results");

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

  assert.strictEqual(statusEl.textContent, "Something went wrong");
  assert.strictEqual(resultsSection.classList.contains("hidden"), true);
});

test("button click handles missing token", async () => {
  const input = mockDoc.getElementById("words");
  const btn = mockDoc.getElementById("mapBtn");
  const statusEl = mockDoc.getElementById("status");
  const resultsSection = mockDoc.getElementById("results");

  // Save original localStorage.getItem and mock it to return null
  const originalGetItem = global.localStorage.getItem;
  try {
    global.localStorage.getItem = () => null;

    input.value = "test";
    btn.click();

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(statusEl.textContent, "Authentication required. Please log in.");
    assert.strictEqual(resultsSection.classList.contains("hidden"), true);
  } finally {
    // Restore original localStorage.getItem
    global.localStorage.getItem = originalGetItem;
  }
});

test("mineBtn click updates topological UI", async () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const topologyResults = mockDoc.getElementById("topologyResults");
  const semanticDriftEl = mockDoc.getElementById("semanticDrift");
  const mineStatusEl = mockDoc.getElementById("mineStatus");

  input.value = "fluid dynamics, tokenomics";

  callToolResult = {
    isError: false,
    content: [{
      text: JSON.stringify({
        analysis_zones: {
          semantic_drift: "Measured semantic shift",
          connotation_vectors: "Vector space",
          semiotic_blind_spots: "Blind spots",
          ambiguity_zones: "Ambiguity"
        },
        pluriversal_knowledge_capsule: {
          emergent_synthesis: "Bridge formed",
          isomorphisms_of_friction: "Friction resolved"
        }
      })
    }]
  };

  btn.click();

  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(mineStatusEl.textContent, "");
  assert.strictEqual(topologyResults.classList.contains("hidden"), false);
  assert.strictEqual(semanticDriftEl.textContent, "Measured semantic shift");
});
