with open('app/server.test.js', 'r') as f:
    content = f.read()

test_block = """
  it("invariant_verification_harness triggers falsification at boundary limits", async () => {
    const result = await handleMcpRequest({
      method: "tools/call",
      params: {
        name: "invariant_verification_harness",
        arguments: {
          data_stream: "Ptolemaic_Telemetry_0x1A",
          model_type: "kinematic",
          falsification_limit: "v->c"
        }
      }
    });
    const parsed = parseMcpText(result);
    assert.strictEqual(parsed.IVH_METRICS.Status, "FALSIFIED");
    assert.ok(parsed.IVH_METRICS.Anomaly_Delta_Sigma > 3.0);
  });
"""
if "invariant_verification_harness triggers falsification" not in content:
    content = content.replace('describe("MCP Tool Implementations", () => {', 'describe("MCP Tool Implementations", () => {\n' + test_block)
    with open('app/server.test.js', 'w') as f:
        f.write(content)

with open('app/public/app.test.js', 'r') as f:
    content = f.read()

test_block = """test("Orchestrator UI updates for invariant_verification_harness", () => {
    const oldDoc = global.document;
    const doc = new MockDocument();
    global.document = doc;
    const select = new MockElement("select");
    select.id = "agentSelector";
    select.value = "invariant_verification_harness";
    const l1 = new MockElement("label");
    l1.id = "orchestratorLabel1";
    const l2 = new MockElement("label");
    l2.id = "orchestratorLabel2";
    const updateOrchestratorUI = () => {
        const agent = select.value;
        if (agent === 'invariant_verification_harness') {
          l1.textContent = "Data Stream (e.g. Telemetry):";
          l2.textContent = "Limit / Model Type (e.g. v->c, kinematic):";
        }
    };
    updateOrchestratorUI();
    assert.strictEqual(l1.textContent, "Data Stream (e.g. Telemetry):");
    assert.strictEqual(l2.textContent, "Limit / Model Type (e.g. v->c, kinematic):");
    global.document = oldDoc;
});
"""

if "Orchestrator UI updates for invariant_verification_harness" not in content:
    content = content.replace('test("Orchestrator UI updates for anomaly_learning_agent", () => {', test_block + '\ntest("Orchestrator UI updates for anomaly_learning_agent", () => {')
    with open('app/public/app.test.js', 'w') as f:
        f.write(content)
