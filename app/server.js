import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/**
 * A Map-based cache with a fixed maximum capacity.
 * When the capacity is reached, the oldest entry is removed (FIFO).
 *
 * @template K, V
 * @extends {Map<K, V>}
 */
export class BoundedMap extends Map {
  /**
   * @param {number} capacity - The maximum number of entries allowed in the map.
   */
  constructor(capacity) {
    super();
    this.capacity = capacity;
  }

  /**
   * Adds or updates an entry in the map, enforcing capacity limits.
   *
   * @param {K} key - The entry key.
   * @param {V} value - The entry value.
   * @returns {this}
   */
  set(key, value) {
    if (this.size >= this.capacity && !this.has(key)) {
      const firstKey = this.keys().next().value;
      this.delete(firstKey);
    }
    return super.set(key, value);
  }
}

const MAX_CACHE_SIZE = 1000;
const cache = new BoundedMap(MAX_CACHE_SIZE);

/**
 * Fetches word relationships from the Datamuse API based on provided parameters.
 * Utilizes an in-memory cache to reduce redundant network requests.
 *
 * @param {Object} params - The URLSearchParams-compatible object containing the Datamuse query parameters (e.g., { rel_syn: 'word', max: 20 }).
 * @param {Function} [fetchImpl=fetch] - An optional fetch implementation, defaulting to the native fetch or node-fetch. Useful for testing (dependency injection).
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of objects representing the semantic relations returned by Datamuse.
 */
export async function fetchDatamuse(params, fetchImpl = fetch) {
  const query = new URLSearchParams(params).toString();
  const url = `https://api.datamuse.com/words?${query}`;

  if (cache.has(url)) {
    return cache.get(url);
  }

  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Datamuse error: ${res.statusText}`);

  const data = await res.json();
  cache.set(url, data);
  return data;
}

const transport = new StreamableHTTPServerTransport({ path: "/mcp" });
const server = new McpServer({
  name: "word-mapper-mcp",
  version: "2026.4.1",
});

/**
 * CABP Broker Middleware for intercepting and validating incoming MCP requests.
 * Enforces the presence and validity of an OAuth 2.1 Bearer JWT token in the Authorization header.
 * Attaches decoded token claims to the request object for downstream consumption.
 *
 * @param {import('express').Request} req - The Express HTTP request object.
 * @param {import('express').Response} res - The Express HTTP response object.
 * @param {import('express').NextFunction} next - The Express next middleware function callback.
 * @returns {void}
 */
export function cabpMiddleware(req, res, next) {
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
  } catch {
    res.status(403).json({
      error_code: "TOOL_FAULT_SERVER_HOST_CONFIGURATION",
      fault_category: "SERVER_HOST_CONFIGURATION",
      structured_detail: { violation: "INVALID_JWT", error: "Invalid Token" },
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
      const relMap = {
        synonyms: "rel_syn",
        antonyms: "rel_ant",
        broader: "rel_spc",
        narrower: "rel_gen"
      };

      const relations = Object.fromEntries(
        await Promise.all(
          Object.entries(relMap).map(async ([key, param]) => {
            const results = await fetchDatamuse({ [param]: primary, max: 20 });
            return [key, results.map(x => x.word)];
          })
        )
      );

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
            relations,
            miniBlend,
            meta: {
              source: "Datamuse v0.1",
              note: "LLM-derived dimensions coming in later versions."
            }
          })
        }]
      };
    } catch {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error_code: "TOOL_FAULT_GENERAL_PROGRAMMING",
            fault_category: "GENERAL_PROGRAMMING",
            structured_detail: { violation: "DATAMUSE_API_ERROR", error: "Internal Tool Error" },
            retry_viable: true,
            suggested_decomposition: null,
          }),
        }],
        isError: true,
      };
    }
  }
);

/**
 * Handler for the deprecated /api/map endpoint.
 * Returns a 410 Gone status with a deprecation message.
 *
 * @param {import('express').Request} req - The Express HTTP request object.
 * @param {import('express').Response} res - The Express HTTP response object.
 * @returns {void}
 */
export const deprecatedMapHandler = async (req, res) => {
  res.status(410).json({ error: "Deprecated. Use /mcp endpoint with MCP protocol." });
};

app.post("/api/map", deprecatedMapHandler);

server.connect(transport);

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  app.listen(PORT, () => {
    console.log(`Word Mapper v0.1 MCP Server listening on port ${PORT}`);
  });
}
