import re

with open('app/server.js', 'r') as f:
    content = f.read()

# Replace the inputSchema json shape with z object shape
old_schema = """inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["Crystal", "Cloud"], description: "Target rheological mode." },
        schema_enforcement: { type: "boolean", description: "Enforce strict grammar/schema." },
        cfdi: { type: "number", description: "Current Confidence-Fidelity Divergence Index." }
      },
      required: ["mode", "schema_enforcement", "cfdi"]
    }"""

new_schema = """inputSchema: {
      mode: z.enum(["Crystal", "Cloud"]).describe("Target rheological mode."),
      schema_enforcement: z.boolean().describe("Enforce strict grammar/schema."),
      cfdi: z.number().describe("Current Confidence-Fidelity Divergence Index.")
    }"""

content = content.replace(old_schema, new_schema)

with open('app/server.js', 'w') as f:
    f.write(content)
