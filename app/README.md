# Word Mapper

Word Mapper is a semantic intelligence platform composed of a Node.js/Express backend that interfaces with the Datamuse API, a vanilla JavaScript/HTML/CSS frontend, and an integrated Streamable HTTP MCP server.

## Architectural Philosophy (KORSAKOV / VANCE)

This repository strictly adheres to the KORSAKOV architectural manifest for MCP server development, with foundational constraints enforced by the VANCE profile:
- **JSON-RPC 2.0 Absolutism:** Every external communication must be flawlessly typed.
- **Draft-Then-Guard Execution (DCCD Schema Guards):** All responses are strictly validated via Draft-Conditioned Constrained Decoders (DCCD) before emission, ensuring robust JSON Schema Draft 2020-12 strict mode adherence.
- **SERF-compliant** structured error payloads are implemented for consistent error handling.
- **CABP (Context Aware Broker Pattern) middleware** is required for HTTP transports, ensuring that robust authentication and tenant-aware scoping are integral to the application lifecycle.
- **Nitinol Memory:** Structural JSON-RPC violations are permanently encoded into negative constraints to prevent regressions.

## Requirements

- Node.js v22.22.1 (using ECMAScript Modules)
- Node package manager or bun (v1.2.14)

## Setup Instructions

1. Clone the repository and navigate to the `app/` directory.
2. Install dependencies.

## Usage

Start the server using node package manager start command. The server will begin listening on port `3000` (or `process.env.PORT`).

- The backend provides a `/mcp` endpoint conforming to the Streamable HTTP Transport protocol, which handles the `map_semantic_relations` tool.
- The frontend is served statically from `app/public/`. Navigate to `http://localhost:3000` in your browser to interact with the frontend.

## Testing

Unit testing is conducted via the native `node --test` runner. Dependency mocking for ESM is achieved through dependency injection and by defining global mocks (e.g., `global.document`) prior to importing frontend modules into the Node environment.

To run the test suite navigate to the app directory and execute `node --test`.

## Front-end Tooling

For frontend third-party ESM dependencies in the vanilla JavaScript environment (like the MCP SDK), the architectural pattern dictates using `esbuild` to bundle them into an IIFE format for direct inclusion via script tags.

## ALETHEON Structural Necropsy Findings

**Evaluation Date:** 2026-04-26
**Verdict:** ADOPT
**Epistemic Lock-In Score (ELIS):** 0.15 (Acceptable)

ALETHEON has performed a zero-trust structural necropsy on the Word Mapper v0.1.0 codebase. The architecture demonstrates High structural integrity with a negligible Betti-1 loop regarding frontend SERF compliance vs whimsey. The architecture relies primarily on open standards (JSON-RPC 2.0 / MCP).

See the generated artifacts for the deterministic evaluation data:
- `Comparative_Topology_Matrix.json`
- `Vulnerability_and_Debt_Audit.md`
