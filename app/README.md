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

Provides deterministic API access.

**1. Install**
```bash
npm install
```

**2. Authenticate**
Set `FEISHU_ENCRYPT_KEY` environment variable.

**3. First Call**
```bash
curl -X POST http://localhost:3000/im:message:receive_v1 \
  -H "x-lark-signature: <signature>" \
  -H "x-lark-request-timestamp: <timestamp>" \
  -H "x-lark-request-nonce: <nonce>" \
  -d '{"type":"url_verification","challenge":"test"}'
```

**4. Expected Output**
```json
{"challenge": "test"}
```
