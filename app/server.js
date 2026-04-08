import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/**
 * Fetches word relationships from the Datamuse API based on provided parameters.
 */
export async function fetchDatamuse(params, fetchImpl = fetch) {
  const query = new URLSearchParams(params).toString();
  const url = `https://api.datamuse.com/words?${query}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Datamuse error: ${res.statusText}`);
  return res.json();
}

const transport = new StreamableHTTPServerTransport({ path: "/mcp" });
const server = new McpServer({
  name: "word-mapper-mcp",
  version: "2026.4.1",
});

// CABP Broker Middleware
function cabpMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error_code: "TOOL_FAULT_SERVER_HOST_CONFIGURATION",
      fault_category: "SERVER_HOST_CONFIGURATION",
      structured_detail: { violation: "MISSING_JWT" },
      retry_viable: false,
      suggested_decomposition: "Attach OAuth 2.1 Bearer token to request.",
    });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const claims = jwt.verify(token, process.env.JWT_PUBLIC_KEY, { algorithms: ["RS256"] });

    if (!claims) {
      throw new Error("Invalid token payload");
    }

    req.mcpContext = {
      user_id: claims.user_id || "unknown",
      tenant_id: claims.tenant_id || "unknown",
      scopes: claims.scopes || [],
    };
    next();
  } catch (err) {
    res.status(403).json({
      error_code: "TOOL_FAULT_SERVER_HOST_CONFIGURATION",
      fault_category: "SERVER_HOST_CONFIGURATION",
      structured_detail: { violation: "INVALID_JWT", error: String(err) },
      retry_viable: true,
      suggested_decomposition: "Refresh OAuth token and retry.",
    });
  }
}

app.use("/mcp", cabpMiddleware, (req, res) => {
  transport.handle(req, res);
});

// PHASE_3_EXECUTION.
server.registerTool(
  "map_semantic_relations",
  {
    title: "Map Semantic Relations",
    description: [
      "PURPOSE: Retrieves semantic relationships (synonyms, antonyms, broader, narrower) for given words.",
      "GUIDELINES: Invoke when the agent needs linguistic associations for words.",
      "LIMITATIONS: Maximum 3 words allowed. Words must be strings.",
      "PARAMETERS: words - an array of up to 3 strings representing the words to map.",
    ].join(" "),
    inputSchema: z.object({
      words: z
        .array(z.string().max(100))
        .min(1)
        .max(3)
        .describe("Array of words to process. Max 3 items."),
    }).strict(),
  },
  async ({ words }) => {
    try {
      const primary = words[0];

      const [synonyms, antonyms, broader, narrower] = await Promise.all([
        fetchDatamuse({ rel_syn: primary, max: 20 }),
        fetchDatamuse({ rel_ant: primary, max: 20 }),
        fetchDatamuse({ rel_spc: primary, max: 20 }),
        fetchDatamuse({ rel_gen: primary, max: 20 })
      ]);

      let miniBlend = null;
      if (words.length > 1) {
        miniBlend = {
          inputs: words,
          description:
            `A conceptual blend of ${words.join(", ")} – ` +
            `think about where they naturally intersect in a project, story, or system.`
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            words,
            primary,
            relations: {
              synonyms: synonyms.map(x => x.word),
              antonyms: antonyms.map(x => x.word),
              broader: broader.map(x => x.word),
              narrower: narrower.map(x => x.word)
            },
            miniBlend,
            meta: {
              source: "Datamuse v0.1",
              note: "LLM-derived dimensions coming in later versions."
            }
          })
        }]
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error_code: "TOOL_FAULT_GENERAL_PROGRAMMING",
            fault_category: "GENERAL_PROGRAMMING",
            structured_detail: { violation: "DATAMUSE_API_ERROR", error: String(err) },
            retry_viable: true,
            suggested_decomposition: null,
          }),
        }],
        isError: true,
      };
    }
  }
);

app.post("/api/map", async (req, res) => {
  res.status(410).json({ error: "Deprecated. Use /mcp endpoint with MCP protocol." });
});

server.connect(transport);

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  app.listen(PORT, () => {
    console.log(`Word Mapper v0.1 MCP Server listening on port ${PORT}`);
  });
}
