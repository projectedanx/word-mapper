import re

with open('app/server.js', 'r') as f:
    content = f.read()

mcp_tool_code = """
server.registerTool(
  "rheological_mode_switcher",
  {
    title: "Rheological Mode Switcher (RMS)",
    description: [
      "PURPOSE: Dynamically adjust inference viscosity based on semantic entropy telemetry.",
      "GUIDELINES: Crystal Mode (low temp) for rigid execution, Cloud Mode (high temp) for divergence.",
      "PARAMETERS: mode - 'Crystal' or 'Cloud', schema_enforcement - boolean, cfdi - Confidence-Fidelity Divergence Index"
    ].join("\\n"),
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["Crystal", "Cloud"], description: "Target rheological mode." },
        schema_enforcement: { type: "boolean", description: "Enforce strict grammar/schema." },
        cfdi: { type: "number", description: "Current Confidence-Fidelity Divergence Index." }
      },
      required: ["mode", "schema_enforcement", "cfdi"]
    }
  },
  async (args, extra) => {
    try {
      const { mode, schema_enforcement, cfdi } = args;

      if (cfdi > 0.15) {
         logToSSR({ error: "Epistemic Escrow Triggered", cfdi });
         return {
           content: [{
             type: "text",
             text: JSON.stringify({
               status: "HALTED",
               action: "EPISTEMIC_ESCROW_ACTIVATED",
               reason: "Confidence-Fidelity Divergence Index exceeded hazard threshold (0.15)."
             })
           }]
         };
      }

      let telemetry = {
         dP_dT: "Nominal",
         temperature: mode === "Crystal" ? 0.0 : 0.85,
         top_p: mode === "Crystal" ? 0.10 : 0.90,
         adjectival_bound: mode === "Crystal" ? 0 : 3
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
             status: "SUCCESS",
             active_mode: mode,
             schema_enforcement: schema_enforcement,
             telemetry
          })
        }]
      };
    } catch (error) {
      console.error("RMS Error:", error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: "RMS Tool Error", details: error.message })
        }]
      };
    }
  }
);
"""

# Insert the tool before the last 'app.use("/mcp", ...)' or at the end of the server tools
# A safe place is right before server.registerTool("map_semantic_relations"...

content = content.replace('server.registerTool(\n  "map_semantic_relations",', mcp_tool_code + '\nserver.registerTool(\n  "map_semantic_relations",')

with open('app/server.js', 'w') as f:
    f.write(content)
