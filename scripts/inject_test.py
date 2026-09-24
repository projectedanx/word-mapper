import re

with open('app/server.test.js', 'r') as f:
    content = f.read()

test_code = """
test("rheological_mode_switcher tool implements RMS logic correctly", async () => {
  const mcpServer = (await import("./server.js")).server;

  // Test Cloud mode
  let result = await mcpServer.callTool("rheological_mode_switcher", {
    mode: "Cloud",
    schema_enforcement: false,
    cfdi: 0.10
  });
  let parsed = parseMcpText(result);
  assert.strictEqual(parsed.status, "SUCCESS");
  assert.strictEqual(parsed.active_mode, "Cloud");
  assert.strictEqual(parsed.telemetry.temperature, 0.85);

  // Test Epistemic Escrow trigger
  result = await mcpServer.callTool("rheological_mode_switcher", {
    mode: "Crystal",
    schema_enforcement: true,
    cfdi: 0.20
  });
  parsed = parseMcpText(result);
  assert.strictEqual(parsed.status, "HALTED");
  assert.strictEqual(parsed.action, "EPISTEMIC_ESCROW_ACTIVATED");
});
"""

# append to end
with open('app/server.test.js', 'a') as f:
    f.write(test_code)
