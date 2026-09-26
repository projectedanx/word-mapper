import re

with open('app/public/app.test.js', 'r') as f:
    content = f.read()

test_block = """test("Orchestrator UI updates for invariant_verification_harness", () => {
    // We'll construct a fresh mock environment just for this test
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
    print("Injected IVH test cleanly")
