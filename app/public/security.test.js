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
    this._textContent = "";
    this._innerHTML = "";
    this.value = "";
    this._listeners = {};
    this.style = {};
    this.nodeType = 1;
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
      this.appendChild({
        nodeType: 3,
        textContent: val
      });
    }
  }

  appendChild(child) {
    if (child.nodeType === 11) {
      this.children.push(...child.children);
    } else {
      this.children.push(child);
      child.parentNode = this;
    }
    return child;
  }

  addEventListener(type, listener) {
    this._listeners[type] = this._listeners[type] || [];
    this._listeners[type].push(listener);
  }

  dispatchEvent(event) {
    const type = event.type;
    if (this._listeners[type]) {
      this._listeners[type].forEach(l => l(event));
    }
  }

  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx > -1) {
        this.parentNode.children.splice(idx, 1);
      }
    }
  }

  closest(selector) {
    // Very limited mock for the specific use case
    if (selector.startsWith('#') && this.id === selector.slice(1)) return this;
    if (this.parentNode) return this.parentNode.closest(selector);
    return null;
  }

  querySelector(selector) {
    if (selector[0] === '#') {
      const id = selector.slice(1);
      const search = (el) => {
        if (el.id === id) return el;
        const children = el.children;
        for (let i = 0, len = children.length; i < len; i++) {
          const res = search(children[i]);
          if (res) return res;
        }
        return null;
      };
      return search(this);
    }
    return null;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement("BODY");
    this._elements = {};
    this._listeners = {};
  }

  createElement(tag) {
    const el = new MockElement(tag);
    return el;
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
    if (!this._elements[id]) {
      this._elements[id] = new MockElement();
      this._elements[id].id = id;
    }
    return this._elements[id];
  }

  addEventListener(type, listener) {
    this._listeners[type] = this._listeners[type] || [];
    this._listeners[type].push(listener);
  }

  dispatchEvent(event) {
    const type = event.type;
    if (this._listeners[type]) {
      this._listeners[type].forEach(l => l(event));
    }
  }
}

const mockDoc = new MockDocument();
global.window = {
    location: { href: "http://localhost/" },
    dispatchEvent: (ev) => {}
};
global.document = mockDoc;
global.localStorage = { getItem: () => "token" };

global.mcp_sdk = {
  StreamableHTTPClientTransport: class {
    constructor(url, options) {}
  },
  Client: class {
    constructor(info, caps) {}
    async connect(transport) {}
    async callTool(req) {
      return {
        isError: false,
        content: [{ text: JSON.stringify(global.mockToolResponse || {}) }]
      };
    }
  }
};

// Import app.js to trigger the IIFE and listeners
await import("./app.js");

/**
 * Test: Easter Egg Overlay prevents XSS
 */
test("Easter Egg Overlay prevents XSS", async () => {
  // Trigger Konami code: 38,38,40,40,37,39,37,39,66,65
  const konami = [38,38,40,40,37,39,37,39,66,65];
  konami.forEach(keyCode => {
    mockDoc.dispatchEvent({ type: 'keydown', keyCode });
  });

  const overlay = mockDoc.body.querySelector('#whimsy-konami-overlay');
  assert.ok(overlay, "Overlay should be created");

  // Verify safe construction: No innerHTML should be used.
  assert.strictEqual(overlay.innerHTML, "", "Overlay should not use innerHTML");

  const card = overlay.children[0];
  assert.ok(card.classList.contains("whimsy-egg-card"), "Card should have the correct class");

  const pPrimary = card.children[0];
  assert.strictEqual(pPrimary.textContent, "You found the secret.");
  assert.strictEqual(pPrimary.innerHTML, "", "Primary text should be set via textContent");

  const pSecondary = card.children[1];
  assert.strictEqual(pSecondary.textContent, "We put this here for exactly the kind of person who would look for it.");
  assert.strictEqual(pSecondary.innerHTML, "", "Secondary text should be set via textContent");
});

/**
 * Test: Knowledge Capsule prevents XSS
 */
test("Knowledge Capsule prevents XSS", async () => {
  const mineBtn = mockDoc.getElementById("mineBtn");
  const domainsInput = mockDoc.getElementById("domains");
  const knowledgeCapsuleEl = mockDoc.getElementById("knowledgeCapsule");

  domainsInput.value = "test, test";

  const maliciousPayload = "<img src=x onerror=alert(1)>";
  global.mockToolResponse = {
    analysis_zones: {
      semantic_drift: "drift",
      connotation_vectors: "vectors",
      semiotic_blind_spots: "spots",
      ambiguity_zones: "zones"
    },
    pluriversal_knowledge_capsule: {
      emergent_synthesis: maliciousPayload,
      isomorphisms_of_friction: "friction"
    }
  };

  mineBtn.dispatchEvent({ type: 'click' });

  // Wait for async
  await new Promise(r => setTimeout(r, 50));

  // After the fix, we should be using createTextNode/textContent
  // Our refactor used createTextNode for emergent_synthesis and isomorphisms_of_friction.

  const synthesisNode = knowledgeCapsuleEl.children.find(c => c.nodeType === 3 && c.textContent === maliciousPayload);
  assert.ok(synthesisNode, "emergent_synthesis should be added as a text node, not HTML");

  const frictionNode = knowledgeCapsuleEl.children.find(c => c.nodeType === 3 && c.textContent === "friction");
  assert.ok(frictionNode, "isomorphisms_of_friction should be added as a text node");

  assert.strictEqual(knowledgeCapsuleEl.innerHTML, "", "innerHTML should not be used in Knowledge Capsule");
});
