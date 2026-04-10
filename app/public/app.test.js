import test from "node:test";
import assert from "node:assert";

// Mock the global document object required for testing the DOM operations
global.document = {
  createElement(tag) {
    return { tag, textContent: "" };
  }
};

import { fillList } from "./app.js";

test("fillList populates list elements", () => {
  const mockList = {
    innerHTML: "should be cleared",
    children: [],
    appendChild(child) {
      this.children.push(child);
    }
  };

  fillList(mockList, ["alpha", "beta"]);

  assert.strictEqual(mockList.innerHTML, "");
  assert.strictEqual(mockList.children.length, 2);
  assert.strictEqual(mockList.children[0].textContent, "alpha");
  assert.strictEqual(mockList.children[1].textContent, "beta");
  assert.strictEqual(mockList.children[0].tag, "li");
});

test("fillList handles empty array", () => {
  const mockList = {
    innerHTML: "should be cleared",
    children: [],
    appendChild(child) {
      this.children.push(child);
    }
  };

  fillList(mockList, []);

  assert.strictEqual(mockList.innerHTML, "");
  assert.strictEqual(mockList.children.length, 1);
  assert.strictEqual(mockList.children[0].textContent, "—");
});

test("fillList handles undefined items", () => {
  const mockList = {
    innerHTML: "should be cleared",
    children: [],
    appendChild(child) {
      this.children.push(child);
    }
  };

  fillList(mockList, undefined);

  assert.strictEqual(mockList.innerHTML, "");
  assert.strictEqual(mockList.children.length, 1);
  assert.strictEqual(mockList.children[0].textContent, "—");
});
