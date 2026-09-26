with open('app/public/index.html', 'r') as f:
    content = f.read()

agent_selector_old = """<option value="anomaly_learning_agent">Anomaly Learning Agent</option>"""
agent_selector_new = """<option value="anomaly_learning_agent">Anomaly Learning Agent</option>
          <option value="invariant_verification_harness">Invariant Verification Harness</option>"""
if agent_selector_old in content and "invariant_verification_harness" not in content:
    content = content.replace(agent_selector_old, agent_selector_new)
    with open('app/public/index.html', 'w') as f:
        f.write(content)

with open('app/public/app.js', 'r') as f:
    content = f.read()

ui_old = "} else if (agent === 'anomaly_learning_agent') {"
ui_new = """} else if (agent === 'invariant_verification_harness') {
      orchestratorLabel1.textContent = "Data Stream (e.g. Telemetry):";
      orchestratorInput1.placeholder = "e.g. Ptolemaic_Telemetry_0x1A";
      orchestratorInput1.style.display = "block";
      orchestratorLabel1.style.display = "block";

      orchestratorLabel2.textContent = "Limit / Model Type (e.g. v->c, kinematic):";
      orchestratorInput2.placeholder = "e.g. v->c, kinematic";
      orchestratorInput2.style.display = "block";
      orchestratorLabel2.style.display = "block";
    } else if (agent === 'anomaly_learning_agent') {"""

args_old = "args = { current_tool: input1, action_sequence: input2 };\n    }"
args_new = """args = { current_tool: input1, action_sequence: input2 };
    } else if (agent === 'invariant_verification_harness') {
      const parts = input2.split(',');
      args = {
        data_stream: input1,
        falsification_limit: parts[0]?.trim() || "v->c",
        model_type: parts[1]?.trim() || "kinematic"
      };
    }"""

render_old = "orchestratorGrid.appendChild(renderCard('ALA Output', data.ALA_OUTPUT));\n      }"
render_new = """orchestratorGrid.appendChild(renderCard('ALA Output', data.ALA_OUTPUT));
      } else if (agent === 'invariant_verification_harness') {
          orchestratorGrid.appendChild(renderCard('Diagnostic', data.DIAGNOSTIC));
          orchestratorGrid.appendChild(renderCard('IVH Metrics', data.IVH_METRICS));
      }"""

if "invariant_verification_harness" not in content:
    content = content.replace(ui_old, ui_new, 1)
    content = content.replace(args_old, args_new, 1)
    content = content.replace(render_old, render_new, 1)
    with open('app/public/app.js', 'w') as f:
        f.write(content)
