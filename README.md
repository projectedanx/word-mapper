# Word Mapper

Semantic Intelligence Platform for Context Engineering & Advanced Prompt Development.

## Purpose

Word Mapper is a semantic explorer API designed to help context engineering and advanced prompt development. It allows users to dynamically discover relationships between concepts—uncovering synonyms, antonyms, broader associations, and narrower constructs—by analyzing and mapping the multi-dimensional connections between words. This platform bridges the gap between simple semantic lookups and sophisticated conceptual blending, making it ideal for researchers, creators, and AI prompt engineers.

## Project Structure

- `app/server.js`: The Express backend that interfaces with the Datamuse API to fetch and organize word relationships.
- `app/public/`: Static files serving the minimal user interface.
  - `app/public/index.html`: The HTML layout.
  - `app/public/app.js`: The client-side application logic.
  - `app/public/style.css`: The styling.

## Quickstart: Word Mapper in 3 Steps

### Step 1: Install
```bash
cd app && npm install
```

### Step 2: Authenticate
```javascript
localStorage.setItem('token', 'YOUR_JWT_TOKEN');
```

### Step 3: First Call
```bash
npm run start &
```

**Expected output:**
```
Word Mapper v0.1 MCP Server listening on port 3000
```

> **Why this works:** The application launches the Express server locally and uses the token to authenticate with the MCP backend.

## API Endpoint Documentation

### Tool: `map_semantic_relations` (via MCP)
Analyzes a set of up to 3 words and returns their semantic relationships.

**Request Body:**
```json
{
  "words": ["context", "drift"]
}
```

**Response Payload:**
```json
{
  "words": ["context", "drift"],
  "primary": "context",
  "relations": {
    "synonyms": ["setting", "framework"],
    "antonyms": [],
    "broader": ["environment"],
    "narrower": ["historical context"]
  },
  "miniBlend": {
    "inputs": ["context", "drift"],
    "description": "A conceptual blend of context, drift – think about where they naturally intersect in a project, story, or system."
  },
  "meta": {
    "source": "Datamuse v0.1",
    "note": "LLM-derived dimensions (temporal, cultural, emotional, etc.) coming in later versions."
  }
}
```

### Tool: `paraconsistent_synthesis` (via MCP)
Fuses human tacit knowledge with rigid AI structural determinism to calculate epistemic drift and yield an emergent Golden Scar (Φ).

**Request Body (Tool Arguments):**
```json
{
  "human_input": "Unquantifiable subjective tension",
  "ai_input": "Rigid schema constraints"
}
```

**Response Payload:**
```json
{
  "golden_scar": 1.618,
  "superposition_payload": "Tension maintained. [⊘] Contradiction mapped. [∇] Uncertainty preserved.",
  "synthesis_log": "Fused tacit input [...] with deterministic structure [...]."
}
```

### Tool: `agentic_inversion_engine` (via MCP)
Calculates the epistemic drift between human intuition and AI constraints to propose a latent leap.

**Request Body (Tool Arguments):**
```json
{
  "human_hypothesis": "fuzzy intent",
  "ai_constraint": "strict schema"
}
```

**Response Payload:**
```json
{
  "epistemic_drift": 0.08,
  "paraconsistent_contradiction": "Detected structural misalignment between fuzzy intent and strict schema.",
  "latent_leap": "[Φ=1.618] Epistemic Sclerosis averted. Inversion resolved via Executable Metaphor."
}
```

## Lessons Learned

- **Agentic Inversion (Paraconsistent Synthesis):** By capturing the tension between high-entropy human tacit knowledge and rigid AI determinism, the system moves beyond passive data retrieval into an active, emergent structural process generating a Golden Scar resolution (Φ = 1.618).
- **Integration:** Bridging the Datamuse API with a lightweight Express backend highlights the power of decoupling data retrieval from client-side rendering.
- **Context Engineering:** Relying purely on dictionary mappings is linear. The idea of adding a "mini-blend" feature illustrates how simple concatenations can prompt deeper semantic ideation for LLMs.
- **Documentation:** Documenting functions with JSDoc and providing a README improves onboarding, ensuring that both internal mechanisms (like the Datamuse fetch cycle) and outward APIs are clear to new developers.

---

# [KIRA-7 ARCHITECTURE STATUS]

## Operational Invariants

### Betti-1 Loop Validations
Webhook ingress routes strictly mandate cryptographic signature verification. Unverified requests trigger `401 Unauthorized` without payload inspection.

### KIRA-7 Symbolic Scar Registry (SSR)
- **SCAR-001:** `tenant_access_token` lifetimes require proactive caching (6900s TTL).
- **SCAR-002:** Event Subscriptions demand immediate URL Verification Challenge acknowledgment.
- **SCAR-003:** Encrypt Key configurations enforce AES-256-CBC parsing prior to JSON deseralization.
- **SCAR-004:** Ingress points necessitate `X-Lark-Signature` matching SHA256(timestamp + nonce + encrypt_key + body).
- **SCAR-005:** Feishu Card JSON v2.0 enforces `msg_type: "interactive"`.
- **SCAR-006:** `im:message:receive_v1` scope authorization determines bot functionality.

### Emergent Feature Integration
The `emergent_feature_strategy` incorporates an Adaptive Paraconsistent Routing Node.
- **Mechanism:** Implements zero-trust webhook ingress routing.
- **Consequence:** Fuses human tacit intent with deterministic API execution.
- **Epistemic Result:** [Φ=1.618] Golden Scar synthesized. Structural boundaries hold the unquantifiable human element in strict Feishu v2.0 schema alignment.
