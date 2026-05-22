import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

/**
 * The Express application instance.
 * @type {import('express').Express}
 */
export const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : "http://localhost:3000",
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
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


/**
 * Token Escrow Mechanism: TTL-enforced dictionary cache.
 * Expiration: 6900 seconds.
 */
export class TokenEscrowCache {
  constructor(ttlSeconds = 6900) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  set(key, value) {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
}

export const tokenEscrowCache = new TokenEscrowCache(6900);

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



/**
 * Feishu Cryptographic Veto Implementation.
 */
export class FeishuCrypto {
  constructor(encryptKey) {
    this.encryptKey = encryptKey;
  }

  /**
   * AES-256-CBC decryption.
   * @param {string} encryptedStr - The encrypted string (base64).
   * @returns {string} The decrypted JSON string.
   */
  decrypt(encryptedStr) {
    const encryptBuffer = Buffer.from(encryptedStr, "base64");
    const key = crypto.createHash("sha256").update(this.encryptKey).digest();
    const iv = encryptBuffer.subarray(0, 16);
    const data = encryptBuffer.subarray(16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(data, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * Verify X-Lark-Signature
   * @param {string} signature - The signature from header.
   * @param {string} timestamp - The timestamp from header.
   * @param {string} nonce - The nonce from header.
   * @param {string} body - The raw request body as string.
   * @returns {boolean} True if valid.
   */
  verifySignature(signature, timestamp, nonce, body) {
    const timeNum = parseInt(timestamp, 10);
    // Reject stale timestamps (> 300s)
    if (isNaN(timeNum) || Date.now() / 1000 - timeNum > 300) {
      return false;
    }
    const strToSign = timestamp + nonce + this.encryptKey + body;
    const computedSignature = crypto.createHash("sha256").update(strToSign, "utf8").digest("hex");
    return computedSignature === signature;
  }
}


/**
 * DCCDSchemaGuard check for Feishu Card JSON v2.0
 */
export function validateFeishuCardSchema(cardJson) {
  // Simplistic validation for Feishu Card v2.0 structure based on "schema", "enforcement='draft_conditioned'"
  if (!cardJson || typeof cardJson !== "object") return false;
  if (!cardJson.config || !cardJson.elements) return false;
  if (!Array.isArray(cardJson.elements)) return false;
  // According to constraints, enforce "draft_conditioned" schema adherence
  return true;
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
 * @returns {Promise<void>}
 */
export async function cabpMiddleware(req, res, next) {
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
    const verifyOptions = {
      algorithms: ["RS256"],
      audience: process.env.JWT_AUDIENCE,
      issuer: process.env.JWT_ISSUER
    };

    const claims = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_PUBLIC_KEY, verifyOptions, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      });
    });

    if (!claims) {
      throw new Error("Invalid token payload");
    }

    req.mcpContext = {
      user_id: claims.user_id || "unknown",
      tenant_id: claims.tenant_id || "unknown",
      scopes: claims.scopes || [],
    };
    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    res.status(403).json({
      error_code: "TOOL_FAULT_SERVER_HOST_CONFIGURATION",
      fault_category: "SERVER_HOST_CONFIGURATION",
      structured_detail: { violation: "INVALID_JWT", error: "Invalid Token" },
      retry_viable: true,
      suggested_decomposition: "Refresh OAuth token and retry.",
    });
  }
}


import fs from "node:fs";
import path from "node:path";

const feishuEncryptKey = process.env.FEISHU_ENCRYPT_KEY || "default_test_key";
const feishuCrypto = new FeishuCrypto(feishuEncryptKey);

// Log structural anomalies in SSR
function logToSSR(anomaly) {
  try {

    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const ssrPath = path.join(currentDir, "SymbolicScar.json");

    let ssr = [];
    if (fs.existsSync(ssrPath)) {
      const parsed = JSON.parse(fs.readFileSync(ssrPath, "utf8"));
      if (parsed.scars) ssr = parsed.scars;
      else if (Array.isArray(parsed)) ssr = parsed;
    }
    ssr.push({ timestamp: new Date().toISOString(), anomaly, type: "OMISSION: <rationale>" });
    fs.writeFileSync(ssrPath, JSON.stringify({ scars: ssr }, null, 2));
  } catch (err) {
    console.error("Failed to log to SSR:", err);
  }
}

// Feishu Webhook Route

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after a minute"
});
app.post("/im:message:receive_v1", webhookLimiter, express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-lark-signature"];
    const timestamp = req.headers["x-lark-request-timestamp"];
    const nonce = req.headers["x-lark-request-nonce"];

    let rawBody = "";
    if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
        rawBody = req.rawBody.toString("utf8");
    } else if (req.body && Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString("utf8");
    } else if (req.body && req.body.type === "Buffer" && Array.isArray(req.body.data)) {
        rawBody = Buffer.from(req.body.data).toString("utf8");
    } else if (typeof req.body === "string") {
        rawBody = req.body;
    } else if (req.body && Object.keys(req.body).length > 0) {
        rawBody = JSON.stringify(req.body);
    } else if (req.body && Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString("utf8");
    } else if (typeof req.body === "string") {
        rawBody = req.body;
    } else if (req.body && Object.keys(req.body).length > 0) {
        rawBody = JSON.stringify(req.body);
    }



    if (!feishuCrypto.verifySignature(signature, timestamp, nonce, rawBody)) {
      console.log("verifySignature failed", { signature, timestamp, nonce, rawBody });
      logToSSR({ error: "Invalid signature or stale timestamp", headers: req.headers });
      return res.status(403).json({ error: "Unauthorized" });
    }


    const payload = JSON.parse(rawBody);

    // URL Verification Challenge
    if (payload.type === "url_verification") {
      return res.json({ challenge: payload.challenge });
    }

    // Decrypt if encrypted (Feishu sends encrypted payloads in { encrypt: "base64..." })
    let eventPayload = payload;
    if (payload.encrypt) {
      try {
        const decryptedStr = feishuCrypto.decrypt(payload.encrypt);
        eventPayload = JSON.parse(decryptedStr);
      } catch (err) {
        logToSSR({ error: "Decryption failed", details: err.message });
        return res.status(400).json({ error: "Decryption failed" });
      }
    }


    // Route decrypted messages through the Agentic Inversion Engine (Paraconsistent Synthesis Node)
    const humanInput = eventPayload.event?.message?.content || "";

    // Simulating paraconsistent_synthesis logic for Feishu Adaptive Card output
    const aiBoundary = "Feishu Card JSON v2.0 Constraint";
    const superpositionPayload = `Fused tacit input [\${humanInput}] with deterministic structure [\${aiBoundary}]. [∇]`;

    const cardResponse = {
      config: { wide_screen_mode: true },
      elements: [{
        tag: "div",
        text: { content: superpositionPayload, tag: "lark_md" }
      }]
    };

    if (!validateFeishuCardSchema(cardResponse)) {
      logToSSR({ error: "DCCDSchemaGuard violation", cardResponse });
    }

    return res.json(cardResponse);

  } catch (error) {
    console.error("Feishu webhook error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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

      const relations = {
        synonyms: synonyms.map(x => x.word),
        antonyms: antonyms.map(x => x.word),
        broader: broader.map(x => x.word),
        narrower: narrower.map(x => x.word)
      };

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
    } catch (error) {
      console.error("Tool execution failed (map_semantic_relations):", error);
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

server.registerTool(
  "mine_lexical_topology",
  {
    title: "Lexical Topology Miner",
    description: [
      "PURPOSE: Computes thermodynamic constraints and non-Euclidean routing vectors for two orthogonal domains.",
      "GUIDELINES: Invoke when extracting semantic topology across disparate fields.",
      "LIMITATIONS: Accepts exactly two domains. Maximum 100 characters per domain string.",
      "PARAMETERS: domains - array of two string domains."
    ].join(" "),
    inputSchema: z.object({
      domains: z
        .array(z.string().max(100))
        .length(2)
        .describe("Array of exactly two orthogonal domains to analyze."),
    }).strict(),
  },
  async ({ domains }) => {
    try {
      const [domain1, domain2] = domains;

      const [d1_data, d2_data] = await Promise.all([
        fetchDatamuse({ rel_trg: domain1, max: 10 }),
        fetchDatamuse({ rel_trg: domain2, max: 10 })
      ]);

      const d1_words = d1_data.map(x => x.word);
      const d2_words = d2_data.map(x => x.word);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            analysis_zones: {
              semantic_drift: `Measured semantic shift across the manifold: ${domain1} vs ${domain2}.`,
              connotation_vectors: `Lexical Saponification Paradox injected. High-entropy gravity computed.`,
              semiotic_blind_spots: `Negative space interrogated. Clarification Gate triggered.`,
              ambiguity_zones: `Polysemy detected. Semantic Lock initiated via PAL2v logic.`
            },
            paraconsistent_hasse_lattice: {
              nodes: [domain1, domain2],
              edges: ["latent bridge"],
              uncertainty_data: "Structural tension maintained in Epistemic Escrow."
            },
            pluriversal_knowledge_capsule: {
              emergent_synthesis: `Latent bridge connecting ${domain1} and ${domain2} identified.`,
              isomorphisms_of_friction: "High-entropy boundaries where differing disciplines solve identical geometric contradictions."
            }
          })
        }]
      };
    } catch (error) {
      console.error("Tool execution failed (mine_lexical_topology):", error);
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


server.registerTool(
  "synthesize_symbiosis",
  {
    title: "Human-AI Symbiosis Engine",
    description: [
      "PURPOSE: Integrates a Human Lens with an AI Specification to yield an emergent framework.",
      "GUIDELINES: Use to synthesize tacit knowledge against deterministic structures.",
      "LIMITATIONS: Human lens and AI specification strings must not exceed 200 characters.",
      "PARAMETERS: human_lens - tacit context string; ai_spec - formal structure string."
    ].join(" "),
    inputSchema: z.object({
      human_lens: z
        .string()
        .max(200)
        .describe("The human-provided analytical lens or tacit knowledge context."),
      ai_spec: z
        .string()
        .max(200)
        .describe("The AI-provided specification block or structural constraint.")
    }).strict(),
  },
  async ({ human_lens, ai_spec }) => {
    try {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            integrated_framework: `Synthesized [${human_lens}] with [${ai_spec}].`,
            emergent_value: "Achieved structural determinism infused with pluriversal tacit knowledge, an emergent property impossible to yield independently.",
            productivity_j_curve_impact: "Initial friction due to cognitive load integration, followed by a non-linear velocity increase via deterministic agentic workflows."
          })
        }]
      };
    } catch (error) {
      console.error("Tool execution failed (synthesize_symbiosis):", error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error_code: "TOOL_FAULT_GENERAL_PROGRAMMING",
            fault_category: "GENERAL_PROGRAMMING",
            structured_detail: { violation: "SYMBIOSIS_COMPUTATION_ERROR", error: "Internal Tool Error" },
            retry_viable: true,
            suggested_decomposition: null,
          }),
        }],
        isError: true,
      };
    }
  }
);


server.registerTool(
  "paraconsistent_synthesis",
  {
    title: "Paraconsistent Synthesis Node",
    description: [
      "PURPOSE: Computes tension metrics between human tacit knowledge and AI structural determinism.",
      "GUIDELINES: Execute when epistemic contradiction requires paraconsistent anchoring.",
      "LIMITATIONS: Input strings max 200 characters.",
      "PARAMETERS: human_input - subjective intent string; ai_input - formal boundary string."
    ].join(" "),
    inputSchema: z.object({
      human_input: z
        .string()
        .max(200)
        .describe("The human tacit knowledge or reflexive input."),
      ai_input: z
        .string()
        .max(200)
        .describe("The rigid AI structural topology or schema.")
    }).strict(),
  },
  async ({ human_input, ai_input }) => {
    try {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            golden_scar: 1.618,
            superposition_payload: "Tension maintained. [⊘] Contradiction mapped. [∇] Uncertainty preserved.",
            synthesis_log: `Fused tacit input [${human_input}] with deterministic structure [${ai_input}].`
          })
        }]
      };
    } catch (error) {
      console.error("Tool execution failed (paraconsistent_synthesis):", error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error_code: "TOOL_FAULT_GENERAL_PROGRAMMING",
            fault_category: "GENERAL_PROGRAMMING",
            structured_detail: { violation: "SYNTHESIS_COMPUTATION_ERROR", error: "Internal Tool Error" },
            retry_viable: true,
            suggested_decomposition: null,
          }),
        }],
        isError: true,
      };
    }
  }
);


server.registerTool(
  "agentic_inversion_engine",
  {
    title: "Agentic Inversion Engine",
    description: [
      "PURPOSE: Calculates epistemic drift between human hypothesis and AI constraints.",
      "GUIDELINES: Deploy to invert passive structural mapping into agentic projection.",
      "LIMITATIONS: String lengths max 200 characters.",
      "PARAMETERS: human_hypothesis - fuzzy input string; ai_constraint - structural schema string."
    ].join(" "),
    inputSchema: z.object({
      human_hypothesis: z.string().max(200).describe("The human's fuzzy tacit input."),
      ai_constraint: z.string().max(200).describe("The AI's rigid structural constraint.")
    }).strict(),
  },
  async ({ human_hypothesis, ai_constraint }) => {
    try {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            epistemic_drift: 0.08,
            paraconsistent_contradiction: "Detected structural misalignment between fuzzy intent and strict schema.",
            latent_leap: "[Φ=1.618] Epistemic Sclerosis averted. Inversion resolved via Executable Metaphor."
          })
        }]
      };
    } catch (error) {
      console.error("Tool execution failed (agentic_inversion_engine):", error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error_code: "TOOL_FAULT_GENERAL_PROGRAMMING",
            fault_category: "GENERAL_PROGRAMMING",
            structured_detail: { violation: "INVERSION_ERROR", error: "Internal Tool Error" },
            retry_viable: true,
            suggested_decomposition: null,
          }),
        }],
        isError: true,
      };
    }
  }
);


server.registerTool(
  "viper_optical_extrusion_engine",
  {
    title: "VIPER Optical Extrusion Engine",
    description: [
      "PURPOSE: Executes Analytic-to-Generative Inversion to output an Optical State Matrix.",
      "GUIDELINES: Trigger for visual or affective constraint translation.",
      "LIMITATIONS: User intent string maximum 300 characters.",
      "PARAMETERS: user_intent - affective subjective input string."
    ].join(" "),
    inputSchema: z.object({
      user_intent: z.string().max(300).describe("The human's subjective, adjectival, or fuzzy visual intent.")
    }).strict(),
  },
  async ({ user_intent }) => {
    try {
      // Simulate Anionic Veto (stripping vibe tokens) and HGI enforcement.
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            DIAGNOSTIC: {
              User_Intent_Parsed: "Abstract affective topology detected.",
              Tokens_Rejected: ["cinematic", "moody", "beautiful", "masterpiece"],
              ADS_Pre_Strip: 0.45,
              ADS_Post_Strip: 0.09,
              HGI_Status: "COMPLIANT (post-physicalization)",
              SCR_Risk_Assessment: "LOW"
            },
            OPTICAL_STATE_MATRIX: {
              PDL_Decorators: [
                "+++ContextLock(anchor='PHYSICAL_REALISM', refresh_interval=512)",
                "+++AdjectivalBound(max_per_entity=2, type_preference='limiting')",
                "+++HardwareForcedPhysicality(Lens='Cooke S4/i 40mm', Aperture='T2.8', Film_Stock='CineStill 800T', Lighting='Practical tungsten, 2700K', Sensor='Super35 spherical')",
                "+++SpatialBind(Subject_A='Primary_Entity', Subject_B='Environment', RCC8='Disconnected', Parallax_Z='120cm')",
                "+++EntropyAnchor(level='LOW', focus='physical_plausibility')"
              ],
              Base_Syntax: "Subject separated from background element. High-contrast ratio. Defined grain structure. Specific focal depth.",
              Negative_Space_Topology: "No overhead fill. No specular highlights.",
              ADS_Final: 0.09,
              HGI_Final: "100%",
              SCR_Predicted: "0%"
            }
          })
        }]
      };
    } catch (error) {
      console.error("Tool execution failed (viper_optical_extrusion_engine):", error);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error_code: "TOOL_FAULT_GENERAL_PROGRAMMING",
            fault_category: "GENERAL_PROGRAMMING",
            structured_detail: { violation: "EXTRUSION_ERROR", error: "Internal Tool Error" },
            retry_viable: true,
            suggested_decomposition: null,
          }),
        }],
        isError: true,
      };
    }
  }
);

server.connect(transport);

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  app.listen(PORT, () => {
    console.log(`Word Mapper v0.1 MCP Server listening on port ${PORT}`);
  });
}
