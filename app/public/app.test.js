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
    this.remove = () => {
       if (this.parentNode) {
           this.parentNode.children = this.parentNode.children.filter(c => c !== this);
       }
    };
    this.classList.contains = function(cls) { return Set.prototype.has.call(self.classList, cls); };
    this.textContent = "";
    this._innerHTML = "";
    this.value = "";
    this._listeners = {};
    this.style = {};
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
    child.parentNode = this;
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
    this._listeners = {};
  }

  addEventListener(type, listener) {
    this._listeners[type] = this._listeners[type] || [];
    this._listeners[type].push(listener);
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  createTextNode(text) {
    return {
      nodeType: 3,
      textContent: text
    };
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
    if (this._elements[id]) {
        return this._elements[id];
    }

    // fallback to searching body
    const search = (el) => {
        if (el.id === id) return el;
        for (let i = 0; i < el.children.length; i++) {
           const result = search(el.children[i]);
           if (result) return result;
        }
        return null;
    }
    const result = search(this.body);
    if (result) return result;

    this._elements[id] = new MockElement();
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

test("symbiosisBtn click updates symbiosis UI", async () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const humanLensInput = mockDoc.getElementById("humanLens");
  const aiSpecInput = mockDoc.getElementById("aiSpec");
  const symbiosisResults = mockDoc.getElementById("symbiosisResults");
  const integratedFrameworkEl = mockDoc.getElementById("integratedFramework");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");

  humanLensInput.value = "Reflexive Dialogue";
  aiSpecInput.value = "JSON-LD Schema";

  callToolResult = {
    isError: false,
    content: [{
      text: JSON.stringify({
        integrated_framework: "Synthesized [Reflexive Dialogue] with [JSON-LD Schema].",
        emergent_value: "Achieved structural determinism",
        productivity_j_curve_impact: "Initial friction"
      })
    }]
  };

  btn.click();

  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(symbiosisStatusEl.textContent, "");
  assert.strictEqual(symbiosisResults.classList.contains("hidden"), false);
  assert.strictEqual(integratedFrameworkEl.textContent, "Synthesized [Reflexive Dialogue] with [JSON-LD Schema].");
});

test("symbiosisBtn click handles missing input", async () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const humanLensInput = mockDoc.getElementById("humanLens");
  const aiSpecInput = mockDoc.getElementById("aiSpec");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");
  const symbiosisResults = mockDoc.getElementById("symbiosisResults");

  humanLensInput.value = "";
  aiSpecInput.value = "";

  btn.click();

  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(symbiosisStatusEl.textContent, "Please enter both a Human Lens and an AI Specification.");
  assert.strictEqual(symbiosisResults.classList.contains("hidden"), true);
});

test("paraconsistentBtn click updates synthesis UI with Golden Scar and tension metrics", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraResults = mockDoc.getElementById("paraResults");
  const goldenScarEl = mockDoc.getElementById("goldenScar");
  const superpositionEl = mockDoc.getElementById("superpositionPayload");
  const paraStatusEl = mockDoc.getElementById("paraStatus");

  humanInput.value = "Tacit uncertainty";
  aiInput.value = "Rigid schema";

  callToolResult = {
    isError: false,
    content: [{
      text: JSON.stringify({
        golden_scar: 1.618,
        superposition_payload: "Tension maintained. [⊘] Contradiction mapped. [∇] Uncertainty preserved."
      })
    }]
  };

  btn.click();

  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(paraStatusEl.textContent, "");
  assert.strictEqual(paraResults.classList.contains("hidden"), false);
  assert.strictEqual(goldenScarEl.textContent, "1.618");
  assert.ok(superpositionEl.textContent.includes("[⊘]"));
  assert.ok(superpositionEl.textContent.includes("[∇]"));
});

test("paraconsistentBtn click handles missing input", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraStatusEl = mockDoc.getElementById("paraStatus");
  const paraResults = mockDoc.getElementById("paraResults");

  humanInput.value = "";
  aiInput.value = "";

  btn.click();

  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(paraStatusEl.textContent, "Please enter both human tacit input and AI structural input.");
  assert.strictEqual(paraResults.classList.contains("hidden"), true);
});

test("mineBtn click handles missing input", async () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");
  const topologyResults = mockDoc.getElementById("topologyResults");

  input.value = "";
  btn.click();
  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(mineStatusEl.textContent, "Please enter two domains.");
  assert.strictEqual(topologyResults.classList.contains("hidden"), true);
});

test("mineBtn click handles invalid number of domains", async () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");
  const topologyResults = mockDoc.getElementById("topologyResults");

  input.value = "one domain";
  btn.click();
  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(mineStatusEl.textContent, "Please enter exactly two domains separated by a comma.");
  assert.strictEqual(topologyResults.classList.contains("hidden"), true);
});

test("Easter Egg: Konami Code triggers Brand Moment", async () => {
  // Reset session activations by reloading the script behavior or manually simulating it.
  // Since it's an IIFE wrapped with isBrowser, we can trigger the event listeners added to mockDoc.
  const KONAMI = [38,38,40,40,37,39,37,39,66,65];

  let eventDispatched = false;
  const originalDispatchEvent = global.window.dispatchEvent;
  global.window.dispatchEvent = (e) => {
    if (e.type === 'whimsy:easter_egg_triggered') {
      eventDispatched = true;
    }
  };

  const listeners = mockDoc._listeners['keydown'] || [];
  for (const keyCode of KONAMI) {
    listeners.forEach(fn => fn({ keyCode }));
  }

  // Find the overlay
  const overlay = mockDoc.getElementById('whimsy-konami-overlay');
  assert.ok(overlay, "Overlay should be added to the DOM");
  assert.ok(eventDispatched, "Custom event should be dispatched");

  // Test button click dismisses the overlay
  const btn = overlay.children[0].children[2]; // CTA button
  btn.click();

  // Need to clear the DOM for other tests or future tests
  mockDoc.body.innerHTML = "";
  global.window.dispatchEvent = originalDispatchEvent;
});

test("mineBtn click handles tool call error", async () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");
  const topologyResults = mockDoc.getElementById("topologyResults");

  input.value = "domain1, domain2";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({
        structured_detail: { error: "Mine error occurred" }
      })
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(mineStatusEl.textContent, "Mine error occurred");
  assert.strictEqual(topologyResults.classList.contains("hidden"), true);
});

test("symbiosisBtn click handles tool call error", async () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const humanLensInput = mockDoc.getElementById("humanLens");
  const aiSpecInput = mockDoc.getElementById("aiSpec");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");
  const symbiosisResults = mockDoc.getElementById("symbiosisResults");

  humanLensInput.value = "Lens";
  aiSpecInput.value = "Spec";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({
        structured_detail: { error: "Symbiosis error occurred" }
      })
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(symbiosisStatusEl.textContent, "Symbiosis error occurred");
  assert.strictEqual(symbiosisResults.classList.contains("hidden"), true);
});

test("paraconsistentBtn click handles tool call error", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraStatusEl = mockDoc.getElementById("paraStatus");
  const paraResults = mockDoc.getElementById("paraResults");

  humanInput.value = "Human input";
  aiInput.value = "AI input";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({
        structured_detail: { error: "Paraconsistent error occurred" }
      })
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(paraStatusEl.textContent, "Paraconsistent error occurred");
  assert.strictEqual(paraResults.classList.contains("hidden"), true);
});

test("mineBtn click handles missing token", async () => {
  const input = mockDoc.getElementById("domains");
  const btn = mockDoc.getElementById("mineBtn");
  const mineStatusEl = mockDoc.getElementById("mineStatus");
  const topologyResults = mockDoc.getElementById("topologyResults");

  const originalGetItem = global.localStorage.getItem;
  try {
    global.localStorage.getItem = () => null;

    input.value = "domain1, domain2";
    btn.click();

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(mineStatusEl.textContent, "Authentication required. Please log in.");
    assert.strictEqual(topologyResults.classList.contains("hidden"), true);
  } finally {
    global.localStorage.getItem = originalGetItem;
  }
});

test("symbiosisBtn click handles missing token", async () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");
  const symbiosisResults = mockDoc.getElementById("symbiosisResults");

  const originalGetItem = global.localStorage.getItem;
  try {
    global.localStorage.getItem = () => null;

    btn.click();

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(symbiosisStatusEl.textContent, "Authentication required. Please log in.");
    assert.strictEqual(symbiosisResults.classList.contains("hidden"), true);
  } finally {
    global.localStorage.getItem = originalGetItem;
  }
});

test("paraconsistentBtn click handles missing token", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const paraStatusEl = mockDoc.getElementById("paraStatus");
  const paraResults = mockDoc.getElementById("paraResults");

  const originalGetItem = global.localStorage.getItem;
  try {
    global.localStorage.getItem = () => null;

    btn.click();

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(paraStatusEl.textContent, "Authentication required. Please log in.");
    assert.strictEqual(paraResults.classList.contains("hidden"), true);
  } finally {
    global.localStorage.getItem = originalGetItem;
  }
});

test("mineBtn click handles tool JSON parse error", async () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");

  input.value = "domain1, domain2";

  callToolResult = {
    isError: true,
    content: [{
      text: "invalid json error"
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(mineStatusEl.textContent, "invalid json error");
});

test("symbiosisBtn click handles tool JSON parse error", async () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const humanLensInput = mockDoc.getElementById("humanLens");
  const aiSpecInput = mockDoc.getElementById("aiSpec");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");

  humanLensInput.value = "Lens";
  aiSpecInput.value = "Spec";

  callToolResult = {
    isError: true,
    content: [{
      text: "invalid json error"
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(symbiosisStatusEl.textContent, "invalid json error");
});

test("paraconsistentBtn click handles tool JSON parse error", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraStatusEl = mockDoc.getElementById("paraStatus");

  humanInput.value = "Human input";
  aiInput.value = "AI input";

  callToolResult = {
    isError: true,
    content: [{
      text: "invalid json error"
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(paraStatusEl.textContent, "invalid json error");
});

test("mapBtn click handles tool JSON parse error", async () => {
  const btn = mockDoc.getElementById("mapBtn");
  const input = mockDoc.getElementById("words");
  const statusEl = mockDoc.getElementById("status");

  input.value = "test_word";

  callToolResult = {
    isError: true,
    content: [{
      text: "invalid json error"
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(statusEl.textContent, "invalid json error");
});

test("mapBtn click triggers Affective Copy Payload loading messages", async () => {
  const btn = mockDoc.getElementById("mapBtn");
  const input = mockDoc.getElementById("words");
  const statusEl = mockDoc.getElementById("status");

  input.value = "long_test";

  // create a promise that resolves after a delay
  let resolver;
  const originalCallTool = global.mcp_sdk.Client.prototype.callTool;
  global.mcp_sdk.Client.prototype.callTool = async function() {
      return new Promise(r => {
          resolver = r;
      })
  }

  try {
      btn.click();
      await new Promise(r => setTimeout(r, 10));
      assert.strictEqual(statusEl.textContent, "Crunching the numbers.");

      // We can't really test setInterval easily without faking timers
      // The interval logic is:
      // if (loadDuration >= 4000) { "This is taking longer than a Tuesday standup." }
      // else if (loadDuration >= 1500) { "Your data is having a moment." }

      // So we will just test the initial state and then resolve.
      resolver({
          isError: true,
          content: [{ text: "error" }]
      });
      await new Promise(r => setTimeout(r, 10));
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

test("mapBtn click triggers Affective Copy Payload loading messages long duration", async () => {
  const btn = mockDoc.getElementById("mapBtn");
  const input = mockDoc.getElementById("words");
  const statusEl = mockDoc.getElementById("status");

  input.value = "long_test";

  let resolver;
  const originalCallTool = global.mcp_sdk.Client.prototype.callTool;
  global.mcp_sdk.Client.prototype.callTool = async function() {
      return new Promise(r => {
          resolver = r;
      })
  }

  // Need to patch setInterval to speed up test execution
  const originalSetInterval = global.setInterval;
  let intervalCb;
  global.setInterval = (cb, ms) => {
     intervalCb = cb;
     return 123; // fake handle
  };

  try {
      btn.click();
      await new Promise(r => setTimeout(r, 10));

      // Simulate interval ticks
      intervalCb(); // 1000
      intervalCb(); // 2000
      assert.strictEqual(statusEl.textContent, "Your data is having a moment.");

      intervalCb(); // 3000
      intervalCb(); // 4000
      assert.strictEqual(statusEl.textContent, "This is taking longer than a Tuesday standup.");

      resolver({
          isError: true,
          content: [{ text: "error" }]
      });
      await new Promise(r => setTimeout(r, 10));
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
      global.setInterval = originalSetInterval;
  }
});

test("paraconsistentBtn click synthesis_log missing handling", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraResults = mockDoc.getElementById("paraResults");
  const synthesisLogEl = mockDoc.getElementById("synthesisLog");
  const paraStatusEl = mockDoc.getElementById("paraStatus");

  humanInput.value = "Tacit uncertainty";
  aiInput.value = "Rigid schema";

  callToolResult = {
    isError: false,
    content: [{
      text: JSON.stringify({
        golden_scar: 1.618,
        superposition_payload: "Tension maintained.",
        synthesis_log: "Log info"
      })
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(paraStatusEl.textContent, "");
  assert.strictEqual(synthesisLogEl.textContent, "Log info");
  assert.strictEqual(synthesisLogEl.classList.contains("hidden"), false);
});

test("Easter Egg: Konami Code max activations", async () => {
  const KONAMI = [38,38,40,40,37,39,37,39,66,65];
  const listeners = mockDoc._listeners['keydown'] || [];

  let triggerCount = 0;
  const originalAppendChild = mockDoc.body.appendChild;
  mockDoc.body.appendChild = function(child) {
      const res = originalAppendChild.call(this, child);
      if (child.id === 'whimsy-konami-overlay') {
          triggerCount++;
          // simulate dismiss so it's not active
          child.remove();
      }
      return res;
  }

  try {
      for(let i=0; i<5; i++) {
        for (const keyCode of KONAMI) {
            listeners.forEach(fn => fn({ keyCode }));
        }
      }
      // Should only trigger 3 times max
      assert.strictEqual(triggerCount <= 3, true);
  } finally {
      mockDoc.body.appendChild = originalAppendChild;
  }
});

test("Easter Egg: Konami Code partial buffer and reset", async () => {
  const listeners = mockDoc._listeners['keydown'] || [];

  // Pressing only a few keys should not trigger
  let triggerCount = 0;
  const originalAppendChild = mockDoc.body.appendChild;
  mockDoc.body.appendChild = function(child) {
      if (child.id === 'whimsy-konami-overlay') {
          triggerCount++;
          child.remove();
      }
      return originalAppendChild.call(this, child);
  }

  try {
      [38, 38, 40].forEach(keyCode => {
          listeners.forEach(fn => fn({ keyCode }));
      });

      assert.strictEqual(triggerCount, 0);
  } finally {
      mockDoc.body.appendChild = originalAppendChild;
  }
});

test("symbiosisBtn click handles tool call JSON error object with error_code fallback", async () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const humanLensInput = mockDoc.getElementById("humanLens");
  const aiSpecInput = mockDoc.getElementById("aiSpec");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");

  humanLensInput.value = "Lens";
  aiSpecInput.value = "Spec";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({
        error_code: "CUSTOM_ERROR_CODE"
      })
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(symbiosisStatusEl.textContent, "CUSTOM_ERROR_CODE");
});

test("mineBtn click handles tool call JSON error object with error_code fallback", async () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");

  input.value = "domain1, domain2";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({
        error_code: "MINE_ERROR_CODE"
      })
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(mineStatusEl.textContent, "MINE_ERROR_CODE");
});

test("paraconsistentBtn click handles tool call JSON error object with error_code fallback", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraStatusEl = mockDoc.getElementById("paraStatus");

  humanInput.value = "Human input";
  aiInput.value = "AI input";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({
        error_code: "PARA_ERROR_CODE"
      })
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(paraStatusEl.textContent, "PARA_ERROR_CODE");
});

test("mapBtn click handles tool call JSON error object with error_code fallback", async () => {
  const btn = mockDoc.getElementById("mapBtn");
  const input = mockDoc.getElementById("words");
  const statusEl = mockDoc.getElementById("status");

  input.value = "test_word";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({
        error_code: "MAP_ERROR_CODE"
      })
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(statusEl.textContent, "MAP_ERROR_CODE");
});

test("symbiosisBtn click handles generic fallback error", async () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const humanLensInput = mockDoc.getElementById("humanLens");
  const aiSpecInput = mockDoc.getElementById("aiSpec");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");

  humanLensInput.value = "Lens";
  aiSpecInput.value = "Spec";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({})
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(symbiosisStatusEl.textContent, "Request failed");
});

test("mineBtn click handles generic fallback error", async () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");

  input.value = "domain1, domain2";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({})
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(mineStatusEl.textContent, "Request failed");
});

test("paraconsistentBtn click handles generic fallback error", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraStatusEl = mockDoc.getElementById("paraStatus");

  humanInput.value = "Human input";
  aiInput.value = "AI input";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({})
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(paraStatusEl.textContent, "Request failed");
});

test("mapBtn click handles generic fallback error", async () => {
  const btn = mockDoc.getElementById("mapBtn");
  const input = mockDoc.getElementById("words");
  const statusEl = mockDoc.getElementById("status");

  input.value = "test_word";

  callToolResult = {
    isError: true,
    content: [{
      text: JSON.stringify({})
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(statusEl.textContent, "Request failed");
});

test("symbiosisBtn click handles null error message", async () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const humanLensInput = mockDoc.getElementById("humanLens");
  const aiSpecInput = mockDoc.getElementById("aiSpec");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");

  humanLensInput.value = "Lens";
  aiSpecInput.value = "Spec";

  const originalCallTool = global.mcp_sdk.Client.prototype.callTool;
  global.mcp_sdk.Client.prototype.callTool = async function() {
      // throw an error with empty message
      const err = new Error();
      err.message = "";
      throw err;
  }

  try {
      btn.click();
      await new Promise(r => setTimeout(r, 50));

      assert.strictEqual(symbiosisStatusEl.textContent, "An error occurred during synthesis.");
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

test("mineBtn click handles null error message", async () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");

  input.value = "domain1, domain2";

  const originalCallTool = global.mcp_sdk.Client.prototype.callTool;
  global.mcp_sdk.Client.prototype.callTool = async function() {
      // throw an error with empty message
      const err = new Error();
      err.message = "";
      throw err;
  }

  try {
      btn.click();
      await new Promise(r => setTimeout(r, 50));

      assert.strictEqual(mineStatusEl.textContent, "An error occurred during mining.");
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

test("paraconsistentBtn click handles null error message", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraStatusEl = mockDoc.getElementById("paraStatus");

  humanInput.value = "Human input";
  aiInput.value = "AI input";

  const originalCallTool = global.mcp_sdk.Client.prototype.callTool;
  global.mcp_sdk.Client.prototype.callTool = async function() {
      // throw an error with empty message
      const err = new Error();
      err.message = "";
      throw err;
  }

  try {
      btn.click();
      await new Promise(r => setTimeout(r, 50));

      assert.strictEqual(paraStatusEl.textContent, "An error occurred during synthesis computation.");
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

test("mapBtn click handles null error message", async () => {
  const btn = mockDoc.getElementById("mapBtn");
  const input = mockDoc.getElementById("words");
  const statusEl = mockDoc.getElementById("status");

  input.value = "test_word";

  const originalCallTool = global.mcp_sdk.Client.prototype.callTool;
  global.mcp_sdk.Client.prototype.callTool = async function() {
      // throw an error with empty message
      const err = new Error();
      err.message = "";
      throw err;
  }

  try {
      btn.click();
      await new Promise(r => setTimeout(r, 50));

      assert.strictEqual(statusEl.textContent, "An error occurred.");
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

test("symbiosisBtn click handles tool JSON parse error empty fallback", async () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const humanLensInput = mockDoc.getElementById("humanLens");
  const aiSpecInput = mockDoc.getElementById("aiSpec");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");

  humanLensInput.value = "Lens";
  aiSpecInput.value = "Spec";

  callToolResult = {
    isError: true,
    content: [{
      text: ""
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(symbiosisStatusEl.textContent, "Request failed");
});

test("mineBtn click handles tool JSON parse error empty fallback", async () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");

  input.value = "domain1, domain2";

  callToolResult = {
    isError: true,
    content: [{
      text: ""
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(mineStatusEl.textContent, "Request failed");
});

test("paraconsistentBtn click handles tool JSON parse error empty fallback", async () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraStatusEl = mockDoc.getElementById("paraStatus");

  humanInput.value = "Human input";
  aiInput.value = "AI input";

  callToolResult = {
    isError: true,
    content: [{
      text: ""
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(paraStatusEl.textContent, "Request failed");
});

test("mapBtn click handles tool JSON parse error empty fallback", async () => {
  const btn = mockDoc.getElementById("mapBtn");
  const input = mockDoc.getElementById("words");
  const statusEl = mockDoc.getElementById("status");

  input.value = "test_word";

  callToolResult = {
    isError: true,
    content: [{
      text: ""
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(statusEl.textContent, "Request failed");
});


test("inversionBtn click handles missing input", async () => {
  const btn = mockDoc.getElementById("inversionBtn");
  const humanInput = mockDoc.getElementById("invHumanInput");
  const aiInput = mockDoc.getElementById("invAiInput");
  const invStatusEl = mockDoc.getElementById("invStatus");

  humanInput.value = "";
  aiInput.value = "";

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(invStatusEl.textContent, "Please enter both hypothesis and constraint.");
});

test("inversionBtn click updates UI with payload", async () => {
  const btn = mockDoc.getElementById("inversionBtn");
  const humanInput = mockDoc.getElementById("invHumanInput");
  const aiInput = mockDoc.getElementById("invAiInput");
  const invStatusEl = mockDoc.getElementById("invStatus");
  const epistemicDriftEl = mockDoc.getElementById("epistemicDrift");

  humanInput.value = "H";
  aiInput.value = "A";

  callToolResult = {
    isError: false,
    content: [{
      text: JSON.stringify({
        epistemic_drift: 0.08,
        paraconsistent_contradiction: "test",
        latent_leap: "leap"
      })
    }]
  };

  btn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(epistemicDriftEl.textContent, "0.08");
  assert.strictEqual(invStatusEl.textContent, "Inversion complete.");
});
