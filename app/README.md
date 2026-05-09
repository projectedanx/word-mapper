# Word Mapper

Word Mapper is a semantic intelligence platform composed of a Node.js/Express backend that interfaces with the Datamuse API, a vanilla JavaScript/HTML/CSS frontend, and an integrated Streamable HTTP MCP server.

## Architectural Philosophy (KORSAKOV / VANCE)

This repository strictly adheres to the KORSAKOV architectural manifest for MCP server development, with foundational constraints enforced by the VANCE profile:
- **JSON-RPC 2.0 Absolutism:** Every external communication must be flawlessly typed.
- **Draft-Then-Guard Execution (DCCD Schema Guards):** All responses are strictly validated via Draft-Conditioned Constrained Decoders (DCCD) before emission, ensuring JSON Schema Draft 2020-12 strict mode adherence.
- **SERF-compliant** structured error payloads are implemented for consistent error handling.
- **CABP (Context Aware Broker Pattern) middleware** is required for HTTP transports, ensuring that authentication and tenant-aware scoping are integral to the application lifecycle.
- **Nitinol Memory:** Structural JSON-RPC violations are permanently encoded into negative constraints to prevent regressions.

## Requirements

- Node.js v22.22.1 (using ECMAScript Modules)
- Node package manager or bun (v1.2.14)

## Zero-Friction Quickstart

### 1. Install
Install the system dependencies.
```bash
cd app && npm install
```

### 2. Authenticate
Provide the required token to the environment.
```javascript
localStorage.setItem('token', 'YOUR_JWT_TOKEN');
```

### 3. First Call
Initialize the server process.
```bash
npm run start &
```

### 4. Expected Output
The server establishes the listener.
```
Word Mapper v0.1 MCP Server listening on port 3000
```

## Testing

Unit testing is conducted via the native `node --test` runner. Dependency mocking for ESM is achieved through dependency injection and by defining global mocks (e.g., `global.document`) prior to importing frontend modules into the Node environment.

To run the test suite navigate to the app directory and execute `node --test`.

## Front-end Tooling

For frontend third-party ESM dependencies in the vanilla JavaScript environment (like the MCP SDK), the architectural pattern dictates using `esbuild` to bundle them into an IIFE format for direct inclusion via script tags.

## ALETHEON Structural Necropsy Findings

**Evaluation Date:** 2026-04-26
**Verdict:** ADOPT
**Epistemic Lock-In Score (ELIS):** 0.10 (Acceptable)

ALETHEON has performed a zero-trust structural necropsy on the Word Mapper v0.1.0 codebase. The architecture demonstrates High structural integrity. The architecture relies primarily on open standards (JSON-RPC 2.0 / MCP).

See the generated artifacts for the deterministic evaluation data and core pattern definitions:
- `Comparative_Topology_Matrix.json`
- `Vulnerability_and_Debt_Audit.md`
- `LEXICON.md`
## Human-AI Symbiosis & Paraconsistent Synthesis Node
Word Mapper now includes `synthesize_symbiosis` and `paraconsistent_synthesis` tools. These are designed to model the integration of human tacit knowledge (Reflexive Dialogue) with rigid AI structures (Draft-Conditioned Decoding). Instead of auto-collapsing differences, the paraconsistent node explicitly holds contradictions in superposition, outputting a Golden Scar (Φ = 1.618) to preserve structural tension and epistemic friction.

## Lessons Learned: Symbiosis & Agentic Inversion

Recent evaluations (2026-04-26) have integrated the **Paraconsistent Synthesis Node** and the **Agentic Inversion Engine**.
The conceptual value established here proves that neither human nor AI can achieve pluriversal synthesis alone.

**The Human Value (Tacit Lens):** Provides non-obvious analytical framing, reflexive dialogue, and epistemic friction.
**The AI Value (Structural Engine):** Provides structural determinism, schema extrusion, and high-dimensional pattern mapping.

The **Agentic Inversion Strategy** fundamentally alters the agent's posture: instead of collapsing human ambiguity into semantic saponification, it holds contradictions in superposition (outputting the Golden Scar $\Phi = 1.618$). This preserves tension and forces an explicitly calculated latent leap, ensuring that tacit context is deterministically bridged rather than hallucinated or erased.

## VIPER Integration & Optical Determinism (2026-04-26)

Word Mapper has integrated the **VIPER Optical Extrusion Engine**. This eliminates Semantic Saponification when translating human visual desire into mechanical outputs.

**The Human Value (Visual Intent):** Provides affective, perceptual desire ("moody", "cinematic").
**The AI Value (Physical Determinism):** Provides the exact physical parameters (Lens, Aperture, Lighting) required to construct that reality.

By applying **Analytic-to-Generative Inversion**, the agent enforces an Adjectival Dilution Score (ADS) < 0.15 and a Hardware Grounding Index (HGI) of 100%, rejecting abstract vibe tokens and extruding deterministic Optical State Matrices.
