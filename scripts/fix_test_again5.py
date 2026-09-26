import re

with open('app/public/app.test.js', 'r') as f:
    content = f.read()

mock_mcp_old = """global.mcp_sdk = {
  Client: class {
    constructor() {}
    async connect() {
      if (!global.currentToken) {
        throw new Error("Unauthorized");
      }
      return Promise.resolve();
    }
    async callTool(req) {
      if (typeof callToolResult === "function") {
        return Promise.resolve(callToolResult());
      }
      return Promise.resolve(callToolResult);
    }
  },
  StreamableHTTPClientTransport: class {
    constructor() {}
  }
};"""

mock_mcp_new = """class MockClient {
  constructor() {}
  async connect() {
    if (!global.currentToken) {
      throw new Error("Unauthorized");
    }
    return Promise.resolve();
  }
  async callTool(req) {
    if (typeof callToolResult === "function") {
      return Promise.resolve(callToolResult());
    }
    return Promise.resolve(callToolResult);
  }
}

class MockTransport {
  constructor() {}
}

global.mcp_sdk = {
  Client: MockClient,
  StreamableHTTPClientTransport: MockTransport
};"""

content = content.replace(mock_mcp_old, mock_mcp_new)

with open('app/public/app.test.js', 'w') as f:
    f.write(content)
print("Updated mock")
