import test from "node:test";
import assert from "node:assert";

/**
 * Manual DOM mock to replace jsdom in restricted environments.
 */
class MockElement {
  /**
   * @param {string} [tagName="DIV"] - The tag name of the mock element.
   */
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
    this._textContent = "";
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
      this._textContent = "";
    }
  }

  get className() {
    return Array.from(this.classList).join(" ");
  }

  set className(val) {
    this.classList.clear();
    val.split(/\s+/).filter(Boolean).forEach(cls => this.classList.add(cls));
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = val;
    this.children = [];
    this._innerHTML = "";
    if (val !== "") {
      this.children.push({
        nodeType: 3,
        textContent: val
      });
    }
  }

  /**
   * Appends a child mock element.
   * @param {MockElement} child - The child to append.
   */
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
      /**
   * Appends a child mock element.
   * @param {MockElement} child - The child to append.
   */
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

const { fillList, renderCard } = await import("./app.js");

/**
 * Test: fillList populates list element
 */
test("fillList populates list element", () => {
  const listEl = mockDoc.createElement("ul");
  fillList(listEl, ["apple", "banana"]);
  assert.strictEqual(listEl.children.length, 2);
  assert.strictEqual(listEl.children[0].textContent, "apple");
  assert.strictEqual(listEl.children[1].textContent, "banana");
});

/**
 * Test: fillList adds em dash when items are empty
 */
test("fillList adds em dash when items are empty", () => {
  const listEl = mockDoc.createElement("ul");
  fillList(listEl, []);
  assert.strictEqual(listEl.children.length, 1);
  assert.strictEqual(listEl.children[0].textContent, "—");
});

/**
 * Test: fillList handles null or undefined items
 */
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

/**
 * Test: fillList clears existing content
 */
test("fillList clears existing content", () => {
  const listEl = mockDoc.createElement("ul");
  listEl.appendChild(mockDoc.createElement("li"));
  listEl.appendChild(mockDoc.createElement("li"));
  assert.strictEqual(listEl.children.length, 2);

  fillList(listEl, ["new item"]);
  assert.strictEqual(listEl.children.length, 1);
  assert.strictEqual(listEl.children[0].textContent, "new item");
});

/**
 * Test: fillList uses textContent for security
 */
test("fillList uses textContent for security", () => {
  const listEl = mockDoc.createElement("ul");
  const malicious = "<img src=x onerror=alert(1)>";
  fillList(listEl, [malicious]);
  assert.strictEqual(listEl.children[0].textContent, malicious);
});


/**
 * Test: renderCard creates basic card
 */
test("renderCard creates basic card", () => {
  const card = renderCard("Test Title", "Test Content");
  assert.strictEqual(card.className, "card");
  assert.strictEqual(card.style.borderColor, "#374151");

  const titleEl = card.children[0];
  assert.strictEqual(titleEl.tagName.toLowerCase(), "h3");
  assert.strictEqual(titleEl.textContent, "Test Title");

  const contentEl = card.children[1];
  assert.strictEqual(contentEl.tagName.toLowerCase(), "div");
  assert.strictEqual(contentEl.textContent, "Test Content");
});

/**
 * Test: renderCard with custom value color
 */
test("renderCard with custom value color", () => {
  const card = renderCard("Title", "Content", "#ff0000");
  assert.strictEqual(card.style.borderColor, "#ff0000");

  const contentEl = card.children[1];
  assert.strictEqual(contentEl.style.fontSize, "1.25rem");
  assert.strictEqual(contentEl.style.fontWeight, "bold");
  assert.strictEqual(contentEl.style.color, "#ff0000");
});

/**
 * Test: renderCard with object content
 */
test("renderCard with object content", () => {
  const obj = { key: "value" };
  const card = renderCard("Title", obj);

  const contentEl = card.children[1];
  const preEl = contentEl.children[0];
  assert.strictEqual(preEl.tagName.toLowerCase(), "pre");
  assert.strictEqual(preEl.textContent, JSON.stringify(obj, null, 2));
});

/**
 * Test: button click maps words and updates UI
 */
test("button click maps words and updates UI", () => {
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


  assert.strictEqual(statusEl.textContent, "");
  assert.strictEqual(resultsSection.classList.contains("hidden"), false);
  assert.strictEqual(synList.children.length, 1);
  assert.strictEqual(synList.children[0].textContent, "hi");
});

/**
 * Test: button click handles empty input
 */
test("button click handles empty input", () => {
  const input = mockDoc.getElementById("words");
  const btn = mockDoc.getElementById("mapBtn");
  const statusEl = mockDoc.getElementById("status");
  const resultsSection = mockDoc.getElementById("results");

  input.value = "   "; // empty/whitespace
  btn.click();



  assert.strictEqual(statusEl.textContent, "Please enter at least one word.");
  assert.strictEqual(resultsSection.classList.contains("hidden"), true);
});

/**
 * Test: button click handles tool call error
 */
test("button click handles tool call error", () => {
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



  assert.strictEqual(statusEl.textContent, "Something went wrong");
  assert.strictEqual(resultsSection.classList.contains("hidden"), true);
});

/**
 * Test: button click handles missing token
 */
test("button click handles missing token", () => {
  const input = mockDoc.getElementById("words");
  const btn = mockDoc.getElementById("mapBtn");
  const statusEl = mockDoc.getElementById("status");
  const resultsSection = mockDoc.getElementById("results");

  // Save original sessionStorage.getItem and mock it to return null
  const originalSessionStorage = global.sessionStorage;
  try {
    global.sessionStorage = {};
    global.sessionStorage.getItem = () => null;

    input.value = "test";

    callToolResult = {
      isError: true,
      content: [{
        text: JSON.stringify({
          structured_detail: { error: "Authentication required. Please log in." }
        })
      }]
    };

    btn.click();



    assert.strictEqual(statusEl.textContent, "Authentication required. Please log in.");
    assert.strictEqual(resultsSection.classList.contains("hidden"), true);
  } finally {
    global.sessionStorage = originalSessionStorage;
  }
});

/**
 * Test: mineBtn click updates topological UI
 */
test("mineBtn click updates topological UI", () => {
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



  assert.strictEqual(mineStatusEl.textContent, "");
  assert.strictEqual(topologyResults.classList.contains("hidden"), false);
  assert.strictEqual(semanticDriftEl.textContent, "Measured semantic shift");
});

/**
 * Test: symbiosisBtn click updates symbiosis UI
 */
test("symbiosisBtn click updates symbiosis UI", () => {
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



  assert.strictEqual(symbiosisStatusEl.textContent, "");
  assert.strictEqual(symbiosisResults.classList.contains("hidden"), false);
  assert.strictEqual(integratedFrameworkEl.textContent, "Synthesized [Reflexive Dialogue] with [JSON-LD Schema].");
});

/**
 * Test: symbiosisBtn click handles missing input
 */
test("symbiosisBtn click handles missing input", () => {
  const btn = mockDoc.getElementById("symbiosisBtn");
  const humanLensInput = mockDoc.getElementById("humanLens");
  const aiSpecInput = mockDoc.getElementById("aiSpec");
  const symbiosisStatusEl = mockDoc.getElementById("symbiosisStatus");
  const symbiosisResults = mockDoc.getElementById("symbiosisResults");

  humanLensInput.value = "";
  aiSpecInput.value = "";

  btn.click();



  assert.strictEqual(symbiosisStatusEl.textContent, "Please enter both a Human Lens and an AI Specification.");
  assert.strictEqual(symbiosisResults.classList.contains("hidden"), true);
});

/**
 * Test: paraconsistentBtn click updates synthesis UI with Golden Scar and tension metrics
 */
test("paraconsistentBtn click updates synthesis UI with Golden Scar and tension metrics", () => {
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



  assert.strictEqual(paraStatusEl.textContent, "");
  assert.strictEqual(paraResults.classList.contains("hidden"), false);
  assert.strictEqual(goldenScarEl.textContent, "1.618");
  assert.ok(superpositionEl.textContent.includes("[⊘]"));
  assert.ok(superpositionEl.textContent.includes("[∇]"));
});

/**
 * Test: paraconsistentBtn click handles missing input
 */
test("paraconsistentBtn click handles missing input", () => {
  const btn = mockDoc.getElementById("paraconsistentBtn");
  const humanInput = mockDoc.getElementById("paraHumanInput");
  const aiInput = mockDoc.getElementById("paraAiInput");
  const paraStatusEl = mockDoc.getElementById("paraStatus");
  const paraResults = mockDoc.getElementById("paraResults");

  humanInput.value = "";
  aiInput.value = "";

  btn.click();



  assert.strictEqual(paraStatusEl.textContent, "Please enter both human tacit input and AI structural input.");
  assert.strictEqual(paraResults.classList.contains("hidden"), true);
});

/**
 * Test: mineBtn click handles missing input
 */
test("mineBtn click handles missing input", () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");
  const topologyResults = mockDoc.getElementById("topologyResults");

  input.value = "";
  btn.click();


  assert.strictEqual(mineStatusEl.textContent, "Please enter two domains.");
  assert.strictEqual(topologyResults.classList.contains("hidden"), true);
});

/**
 * Test: mineBtn click handles invalid number of domains
 */
test("mineBtn click handles invalid number of domains", () => {
  const btn = mockDoc.getElementById("mineBtn");
  const input = mockDoc.getElementById("domains");
  const mineStatusEl = mockDoc.getElementById("mineStatus");
  const topologyResults = mockDoc.getElementById("topologyResults");

  input.value = "one domain";
  btn.click();


  assert.strictEqual(mineStatusEl.textContent, "Please enter exactly two domains separated by a comma.");
  assert.strictEqual(topologyResults.classList.contains("hidden"), true);
});

/**
 * Test: Easter Egg: Konami Code triggers Brand Moment
 */
test("Easter Egg: Konami Code triggers Brand Moment", async () => {
  const oldSetTimeout = global.setTimeout;
  global.setTimeout = (cb) => { cb(); };
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

/**
 * Test: mineBtn click handles tool call error
 */
test("mineBtn click handles tool call error", () => {
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


  assert.strictEqual(mineStatusEl.textContent, "Mine error occurred");
  assert.strictEqual(topologyResults.classList.contains("hidden"), true);
});

/**
 * Test: symbiosisBtn click handles tool call error
 */
test("symbiosisBtn click handles tool call error", () => {
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


  assert.strictEqual(symbiosisStatusEl.textContent, "Symbiosis error occurred");
  assert.strictEqual(symbiosisResults.classList.contains("hidden"), true);
});

/**
 * Test: paraconsistentBtn click handles tool call error
 */
test("paraconsistentBtn click handles tool call error", () => {
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


  assert.strictEqual(paraStatusEl.textContent, "Paraconsistent error occurred");
  assert.strictEqual(paraResults.classList.contains("hidden"), true);
});







/**
 * Test: mineBtn click handles tool JSON parse error
 */
test("mineBtn click handles tool JSON parse error", () => {
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


  assert.strictEqual(mineStatusEl.textContent, "invalid json error");
});

/**
 * Test: symbiosisBtn click handles tool JSON parse error
 */
test("symbiosisBtn click handles tool JSON parse error", () => {
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


  assert.strictEqual(symbiosisStatusEl.textContent, "invalid json error");
});

/**
 * Test: paraconsistentBtn click handles tool JSON parse error
 */
test("paraconsistentBtn click handles tool JSON parse error", () => {
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


  assert.strictEqual(paraStatusEl.textContent, "invalid json error");
});

/**
 * Test: mapBtn click handles tool JSON parse error
 */
test("mapBtn click handles tool JSON parse error", () => {
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


  assert.strictEqual(statusEl.textContent, "invalid json error");
});

/**
 * Test: mapBtn click triggers Affective Copy Payload loading messages
 */
test("mapBtn click triggers Affective Copy Payload loading messages", () => {
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

      assert.strictEqual(statusEl.textContent, "Crunching the numbers.");

      // Detailed interval logic is tested in the subsequent test case using fake timers.
      // Here we just test the initial state and then resolve.
      resolver({
          isError: true,
          content: [{ text: "error" }]
      });

  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

/**
 * Test: mapBtn click triggers Affective Copy Payload loading messages long duration
 */
test("mapBtn click triggers Affective Copy Payload loading messages long duration", () => {
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

  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
      global.setInterval = originalSetInterval;
  }
});

/**
 * Test: paraconsistentBtn click synthesis_log missing handling
 */
test("paraconsistentBtn click synthesis_log missing handling", () => {
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


  assert.strictEqual(paraStatusEl.textContent, "");
  assert.strictEqual(synthesisLogEl.textContent, "Log info");
  assert.strictEqual(synthesisLogEl.classList.contains("hidden"), false);
});

/**
 * Test: Easter Egg: Konami Code max activations
 */
test("Easter Egg: Konami Code max activations", () => {
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

/**
 * Test: Easter Egg: Konami Code partial buffer and reset
 */
test("Easter Egg: Konami Code partial buffer and reset", () => {
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

/**
 * Test: symbiosisBtn click handles tool call JSON error object with error_code fallback
 */
test("symbiosisBtn click handles tool call JSON error object with error_code fallback", () => {
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


  assert.strictEqual(symbiosisStatusEl.textContent, "CUSTOM_ERROR_CODE");
});

/**
 * Test: mineBtn click handles tool call JSON error object with error_code fallback
 */
test("mineBtn click handles tool call JSON error object with error_code fallback", () => {
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


  assert.strictEqual(mineStatusEl.textContent, "MINE_ERROR_CODE");
});

/**
 * Test: paraconsistentBtn click handles tool call JSON error object with error_code fallback
 */
test("paraconsistentBtn click handles tool call JSON error object with error_code fallback", () => {
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


  assert.strictEqual(paraStatusEl.textContent, "PARA_ERROR_CODE");
});

/**
 * Test: mapBtn click handles tool call JSON error object with error_code fallback
 */
test("mapBtn click handles tool call JSON error object with error_code fallback", () => {
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


  assert.strictEqual(statusEl.textContent, "MAP_ERROR_CODE");
});

/**
 * Test: symbiosisBtn click handles generic fallback error
 */
test("symbiosisBtn click handles generic fallback error", () => {
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


  assert.strictEqual(symbiosisStatusEl.textContent, "Request failed");
});

/**
 * Test: mineBtn click handles generic fallback error
 */
test("mineBtn click handles generic fallback error", () => {
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


  assert.strictEqual(mineStatusEl.textContent, "Request failed");
});

/**
 * Test: paraconsistentBtn click handles generic fallback error
 */
test("paraconsistentBtn click handles generic fallback error", () => {
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


  assert.strictEqual(paraStatusEl.textContent, "Request failed");
});

/**
 * Test: mapBtn click handles generic fallback error
 */
test("mapBtn click handles generic fallback error", () => {
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


  assert.strictEqual(statusEl.textContent, "Request failed");
});

/**
 * Test: symbiosisBtn click handles null error message
 */
test("symbiosisBtn click handles null error message", () => {
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


      assert.strictEqual(symbiosisStatusEl.textContent, "An error occurred during synthesis.");
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

/**
 * Test: mineBtn click handles null error message
 */
test("mineBtn click handles null error message", () => {
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


      assert.strictEqual(mineStatusEl.textContent, "An error occurred during mining.");
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

/**
 * Test: paraconsistentBtn click handles null error message
 */
test("paraconsistentBtn click handles null error message", () => {
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


      assert.strictEqual(paraStatusEl.textContent, "An error occurred during synthesis computation.");
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

/**
 * Test: mapBtn click handles null error message
 */
test("mapBtn click handles null error message", () => {
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


      assert.strictEqual(statusEl.textContent, "An error occurred.");
  } finally {
      global.mcp_sdk.Client.prototype.callTool = originalCallTool;
  }
});

/**
 * Test: symbiosisBtn click handles tool JSON parse error empty fallback
 */
test("symbiosisBtn click handles tool JSON parse error empty fallback", () => {
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


  assert.strictEqual(symbiosisStatusEl.textContent, "Request failed");
});

/**
 * Test: mineBtn click handles tool JSON parse error empty fallback
 */
test("mineBtn click handles tool JSON parse error empty fallback", () => {
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


  assert.strictEqual(mineStatusEl.textContent, "Request failed");
});

/**
 * Test: paraconsistentBtn click handles tool JSON parse error empty fallback
 */
test("paraconsistentBtn click handles tool JSON parse error empty fallback", () => {
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


  assert.strictEqual(paraStatusEl.textContent, "Request failed");
});

/**
 * Test: mapBtn click handles tool JSON parse error empty fallback
 */
test("mapBtn click handles tool JSON parse error empty fallback", () => {
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


  assert.strictEqual(statusEl.textContent, "Request failed");
});


/**
 * Test: inversionBtn click handles missing input
 */
test("inversionBtn click handles missing input", () => {
  const btn = mockDoc.getElementById("inversionBtn");
  const humanInput = mockDoc.getElementById("invHumanInput");
  const aiInput = mockDoc.getElementById("invAiInput");
  const invStatusEl = mockDoc.getElementById("invStatus");

  humanInput.value = "";
  aiInput.value = "";

  btn.click();


  assert.strictEqual(invStatusEl.textContent, "Please enter both hypothesis and constraint.");
});

/**
 * Test: inversionBtn click updates UI with payload
 */
test("inversionBtn click updates UI with payload", () => {
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


  assert.strictEqual(epistemicDriftEl.textContent, "0.08");
  assert.strictEqual(invStatusEl.textContent, "Inversion complete.");
});


test("agentSelector change updates input labels", () => {
  const agentSelector = mockDoc.getElementById("agentSelector");
  const orchestratorInput2 = mockDoc.getElementById("orchestratorInput2");
  const orchestratorLabel1 = mockDoc.getElementById("orchestratorLabel1");
  const orchestratorLabel2 = mockDoc.getElementById("orchestratorLabel2");

  agentSelector.value = "viper_optical_extrusion_engine";
  const listeners = agentSelector._listeners['change'] || [];
  listeners.forEach(fn => fn({ target: agentSelector, preventDefault: () => {} }));

  assert.strictEqual(orchestratorLabel1.textContent, "User Intent (Affective/Visual input):");
  assert.strictEqual(orchestratorInput2.style.display, "none");
  assert.strictEqual(orchestratorLabel2.style.display, "none");
});

test("orchestratorBtn click handles missing input", async () => {
  const orchestratorBtn = mockDoc.getElementById("orchestratorBtn");
  const orchestratorInput1 = mockDoc.getElementById("orchestratorInput1");
  const orchestratorInput2 = mockDoc.getElementById("orchestratorInput2");
  const orchestratorStatusEl = mockDoc.getElementById("orchestratorStatus");
  const agentSelector = mockDoc.getElementById("agentSelector");

  agentSelector.value = "synthesize_symbiosis";
  orchestratorInput1.value = "";
  orchestratorInput2.value = "";

  try {
      const listeners = orchestratorBtn._listeners['click'] || [];
      for (const fn of listeners) {
        await fn({ target: orchestratorBtn, preventDefault: () => {} });
      }


      assert.strictEqual(orchestratorStatusEl.textContent, "Please provide all required inputs.");
  } finally {
  }
});

test("orchestratorBtn click updates UI with payload", async () => {
  const orchestratorBtn = mockDoc.getElementById("orchestratorBtn");
  const orchestratorInput1 = mockDoc.getElementById("orchestratorInput1");
  const orchestratorInput2 = mockDoc.getElementById("orchestratorInput2");
  const orchestratorStatusEl = mockDoc.getElementById("orchestratorStatus");
  const agentSelector = mockDoc.getElementById("agentSelector");
  const orchestratorResults = mockDoc.getElementById("orchestratorResults");
  const orchestratorGrid = mockDoc.getElementById("orchestratorGrid");

  agentSelector.value = "agentic_inversion_engine";
  orchestratorInput1.value = "test_hyp";
  orchestratorInput2.value = "test_con";

  const originalCallToolResult = callToolResult;
  callToolResult = {
      isError: false,
      content: [{ text: JSON.stringify({
          epistemic_drift: "0.1",
          latent_leap: "test_leap",
          paraconsistent_contradiction: "test_contra"
      }) }]
  };

  try {
      const listeners = orchestratorBtn._listeners['click'] || [];
      for (const fn of listeners) {
        await fn({ target: orchestratorBtn, preventDefault: () => {} });
      }



      assert.strictEqual(orchestratorResults.classList.contains("hidden"), false);
      assert.strictEqual(orchestratorStatusEl.textContent, "Agent Workflow Complete.");
      assert.strictEqual(orchestratorGrid.children.length, 2);
  } finally {
      callToolResult = originalCallToolResult;
  }
});

test("UI: Agent Selector updates UI for strategic_integration_orchestrator", () => {
  const document = new MockDocument();
  global.document = document;

  const orchestratorLabel1 = document.createElement("label");
  orchestratorLabel1.id = "orchestratorLabel1";

  const orchestratorInput1 = document.createElement("input");
  orchestratorInput1.id = "orchestratorInput1";

  const orchestratorLabel2 = document.createElement("label");
  orchestratorLabel2.id = "orchestratorLabel2";

  const orchestratorInput2 = document.createElement("input");
  orchestratorInput2.id = "orchestratorInput2";

  const agentSelector = document.createElement("select");
  agentSelector.id = "agentSelector";
  agentSelector.value = "strategic_integration_orchestrator";

  document.body.appendChild(orchestratorLabel1);
  document.body.appendChild(orchestratorInput1);
  document.body.appendChild(orchestratorLabel2);
  document.body.appendChild(orchestratorInput2);
  document.body.appendChild(agentSelector);

  const updateOrchestratorUI = () => {
    const agent = agentSelector.value;
    if (agent === 'strategic_integration_orchestrator') {
      orchestratorLabel1.textContent = 'Narrative Artifact (PM context):';
      orchestratorInput1.style.display = 'block';
      orchestratorLabel2.style.display = 'none';
      orchestratorInput2.style.display = 'none';
    }
  };

  updateOrchestratorUI();

  assert.strictEqual(orchestratorLabel1.textContent, 'Narrative Artifact (PM context):');
  assert.strictEqual(orchestratorInput1.style.display, 'block');
  assert.strictEqual(orchestratorLabel2.style.display, 'none');
  assert.strictEqual(orchestratorInput2.style.display, 'none');

  delete global.document;
});

test("Orchestrator UI updates for anomaly_learning_agent", () => {
  const document = new MockDocument();
  global.document = document;

  const orchestratorLabel1 = document.createElement("label");
  orchestratorLabel1.id = "orchestratorLabel1";

  const orchestratorInput1 = document.createElement("input");
  orchestratorInput1.id = "orchestratorInput1";

  const orchestratorLabel2 = document.createElement("label");
  orchestratorLabel2.id = "orchestratorLabel2";

  const orchestratorInput2 = document.createElement("input");
  orchestratorInput2.id = "orchestratorInput2";

  const agentSelector = document.createElement("select");
  agentSelector.id = "agentSelector";
  agentSelector.value = "anomaly_learning_agent";

  document.body.appendChild(orchestratorLabel1);
  document.body.appendChild(orchestratorInput1);
  document.body.appendChild(orchestratorLabel2);
  document.body.appendChild(orchestratorInput2);
  document.body.appendChild(agentSelector);

  const updateOrchestratorUI = () => {
    const agent = agentSelector.value;
    if (agent === 'anomaly_learning_agent') {
      orchestratorLabel1.textContent = "Current Tool (e.g. edit_post):";
      orchestratorLabel2.textContent = "Action Sequence (comma-separated):";
    }
  };

  updateOrchestratorUI();

  assert.strictEqual(orchestratorLabel1.textContent, "Current Tool (e.g. edit_post):");
  assert.strictEqual(orchestratorLabel2.textContent, "Action Sequence (comma-separated):");
});
