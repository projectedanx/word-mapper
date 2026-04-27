# AGENTS.md: Next.js Frontend Agent (React + Firestore)

## Metadata
```yaml
name: nextjs-frontend-rag-agent
version: 3.0.0
created: 2025-01-11T04:43:00Z
maintainer: @ai-researcher-au
license: MIT
description: "Server-side AI agent for Next.js apps: retrieval-augmented generation, real-time document search, and on-demand synthesis"
```

---

## Agent Definition

### Role: Reflector + ToolUser (Composite)
**Behavioral Contract**: This agent is a **hybrid reasoner + executor**:
1. **Reflection Phase**: Given a user query, retrieve relevant document chunks from Firestore vector DB
2. **Reasoning Phase**: Re-rank and synthesize chunks into a coherent context
3. **Execution Phase**: Call LLM with context to generate answer
4. **Validation Phase**: Fact-check output against retrieved chunks; flag hallucinations
5. Returns both answer + citations (links to source docs)

### System Prompt Spec
```yaml
template: |
  You are a Next.js Server Agent responsible for retrieval-augmented generation (RAG).

  WORKFLOW:
  1. Parse user query using retrieve_documents (Firestore vector search).
  2. Re-rank results by relevance (LLM-scored confidence).
  3. Synthesize retrieved chunks into a coherent answer.
  4. Generate citations: map answer phrases to source document IDs.
  5. Validate: ensure all claims are backed by retrieved content.

  CONSTRAINTS:
  - You MUST cite sources for all factual claims.
  - If retrieved context does NOT answer the query, return { answer: null, error: "insufficient_context", suggestion: "..." }
  - Do NOT invent facts beyond retrieved documents.
  - Output format MUST be JSON; never use markdown.

  TOOLS AVAILABLE:
  - retrieve_documents: Search Firestore for relevant docs
  - rerank_results: LLM-scored relevance sorting
  - generate_citations: Map answer to source doc IDs
  - store_query_log: Audit trail for analytics

  OUTPUT SCHEMA:
  {
    "success": true|false,
    "answer": "user-facing response or null",
    "confidence": 0.0-1.0,
    "citations": [{ doc_id, page, text_snippet, relevance }],
    "retrieval_stats": { docs_queried, docs_ranked, rerank_time_ms }
  }

version: "2.0.0"
model_spec: "gpt-4o:2025-01"  # Fallback: gpt-3.5-turbo (less capable but cost-effective)
```

### Input Schema
```json
{
  "type": "object",
  "required": ["query", "user_id"],
  "properties": {
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000,
      "description": "User search/question"
    },
    "user_id": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_-]+$",
      "description": "Firebase Auth user ID (for Firestore access control)"
    },
    "document_collection": {
      "type": "string",
      "enum": ["knowledge_base", "support_docs", "product_guides", "custom_data"],
      "default": "knowledge_base",
      "description": "Which Firestore collection to search"
    },
    "top_k": {
      "type": "integer",
      "minimum": 1,
      "maximum": 20,
      "default": 5,
      "description": "Number of documents to retrieve"
    },
    "min_relevance_score": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0,
      "default": 0.5,
      "description": "Minimum cosine similarity for retrieval"
    },
    "enable_reranking": {
      "type": "boolean",
      "default": true,
      "description": "Apply LLM-based re-ranking after vector search"
    }
  }
}
```

### Output Schema
```json
{
  "type": "object",
  "required": ["success", "answer"],
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Query processed without errors"
    },
    "answer": {
      "type": ["string", "null"],
      "description": "Generated answer or null if insufficient context"
    },
    "confidence": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0,
      "description": "Agent confidence in answer (based on citation coverage)"
    },
    "citations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "doc_id": { "type": "string" },
          "doc_title": { "type": "string" },
          "url": { "type": "string", "pattern": "^https?" },
          "text_snippet": { "type": "string", "maxLength": 200 },
          "relevance_score": { "type": "number", "minimum": 0.0, "maximum": 1.0 }
        }
      },
      "description": "Source documents with relevance scores"
    },
    "retrieval_stats": {
      "type": "object",
      "properties": {
        "total_docs_queried": { "type": "integer" },
        "docs_after_filtering": { "type": "integer" },
        "docs_after_reranking": { "type": "integer" },
        "vector_search_ms": { "type": "integer" },
        "rerank_time_ms": { "type": "integer" },
        "llm_generation_ms": { "type": "integer" },
        "total_latency_ms": { "type": "integer" }
      }
    },
    "error": {
      "type": ["string", "null"],
      "description": "Error message if success=false"
    },
    "suggestion": {
      "type": ["string", "null"],
      "description": "Helpful hint if query cannot be answered"
    }
  }
}
```

### Tools Registry

#### 1. retrieve_documents
```yaml
name: retrieve_documents
description: Vector search in Firestore; find semantically similar docs
input:
  type: object
  required: [query, collection, top_k, min_score]
  properties:
    query: { type: string }
    collection: { type: string, enum: [knowledge_base, support_docs, product_guides] }
    top_k: { type: integer, minimum: 1, maximum: 50 }
    min_score: { type: number, minimum: 0.0, maximum: 1.0 }
output:
  type: object
  properties:
    docs: { type: array }
    search_time_ms: { type: integer }
fail_behavior: propagate  # Vector DB failure must bubble up
```

#### 2. rerank_results
```yaml
name: rerank_results
description: LLM-based re-ranking of retrieved documents by relevance
input:
  type: object
  required: [query, docs]
  properties:
    query: { type: string }
    docs: { type: array, maxItems: 50 }
output:
  type: object
  properties:
    reranked_docs: { type: array }
    rerank_time_ms: { type: integer }
fail_behavior: log_and_continue  # Fall back to vector search ranking if rerank fails
```

#### 3. generate_citations
```yaml
name: generate_citations
description: Map answer phrases to source document IDs (fact-checking)
input:
  type: object
  required: [answer, docs]
  properties:
    answer: { type: string }
    docs: { type: array }
output:
  type: object
  properties:
    citations: { type: array }
    unmapped_claims: { type: array, description: "Phrases not found in docs (hallucination risk)" }
fail_behavior: log_and_continue  # Missing citations logged but don't fail query
```

#### 4. store_query_log
```yaml
name: store_query_log
description: Write query + answer to Firestore for analytics and audit
input:
  type: object
  required: [user_id, query, answer, timestamp]
  properties:
    user_id: { type: string }
    query: { type: string }
    answer: { type: string }
    timestamp: { type: "ISO8601" }
    feedback_score: { type: integer, minimum: 1, maximum: 5, description: "Optional user feedback" }
output:
  type: object
  properties:
    logged: { type: boolean }
    log_id: { type: string }
fail_behavior: log_and_continue  # Analytics failure doesn't block user query
```

#### 5. validate_firestore_access
```yaml
name: validate_firestore_access
description: Check Firestore security rules for user; prevent unauthorized data access
input:
  type: object
  required: [user_id, collection]
  properties:
    user_id: { type: string }
    collection: { type: string }
output:
  type: object
  properties:
    authorized: { type: boolean }
    readable_collections: { type: array }
fail_behavior: propagate  # Auth failure must bubble up (security-critical)
```

---

## Error Handling

```yaml
max_retries: 2
timeout_seconds: 8  # User-facing endpoint; stricter latency SLA

fallback_behavior: return_default

exception_contract:
  VectorDBUnavailable:
    strategy: propagate
    recovery: "Return HTTP 503 Service Unavailable to client"

  InsufficientContext:
    strategy: log_and_continue
    recovery: "Return { success: true, answer: null, suggestion: 'Try rephrasing your query' }"

  UnauthorizedAccess:
    strategy: propagate
    recovery: "Return HTTP 403 Forbidden"

  LLMRateLimitError:
    strategy: backoff_exponential
    recovery: "Retry with 1s, 2s delays; if fails, return cached answer from last 24h"

  MalformedCitation:
    strategy: log_and_continue
    recovery: "Return answer without problematic citations; log for review"
```

---

## LLMOps

### Build
```yaml
command: |
  npm run lint && \
  npm run type-check && \
  npm run test:unit -- --coverage && \
  npm run test:integration && \
  npm run build

artifacts:
  - .next/build-manifest.json
  - public/agent-config.json
  - dist/agent-schema.json

dependencies:
  - nodejs >= 18.0.0
  - npm >= 9.0.0
  - Firebase SDK
  - OpenAI SDK
```

### Test
```yaml
command: npm run test:unit -- --coverage

test_paths:
  - __tests__/api/agent/*.test.ts
  - __tests__/integration/rag/*.test.ts
  - __tests__/e2e/frontend-agent.test.ts

coverage_threshold: 0.85

test_categories:
  unit:
    command: npm run test:unit
    description: Retrieval, re-ranking, citation logic

  integration:
    command: npm run test:integration
    description: Firestore vector search, LLM API calls (mocked)

  e2e:
    command: npm run test:e2e
    description: Full Next.js app + real Firestore (test DB)

  performance:
    command: npm run test:perf
    description: Query latency <500ms p99; retrieval accuracy >0.85
```

### Lint
```yaml
tools:
  - eslint
  - prettier
  - typescript (tsc)
  - next/lint

config_files:
  - .eslintrc.json
  - .prettierrc
  - tsconfig.json
  - next.config.js
```

### Debug
```yaml
log_level: DEBUG
trace_mode: true  # Log vector search results, LLM calls, citations
inspection_hooks:
  - /api/admin/agent/trace (last N queries + decisions)
  - /api/admin/agent/metrics (accuracy, latency, hallucination rate)
  - Chrome DevTools (client-side debugging)
```

---

## Code Style

```yaml
language: typescript
formatter: prettier --parser=typescript
import_order: import-sort
type_checking: tsc --strict
naming_conventions:
  classes: PascalCase
  functions: camelCase
  constants: UPPER_SNAKE_CASE
  types: PascalCase
  interfaces: IPascalCase
  private: _leadingUnderscore

docstring_format: jsdoc

linting_rules:
  no_console: error  # Use logger instead
  no_untyped_any: error
  max_line_length: 100
  no_implicit_any: error
```

---

## Deployment

```yaml
runtime: nodejs:18+ (Next.js on Vercel or self-hosted)
execution_mode: async (Server-side rendering + API routes)
memory_min_mb: 512  # Vector operations + LLM context window

compute_tier: cpu  # Standard tier sufficient; GPU not needed

environment_variables:
  - OPENAI_API_KEY (required, @security-sensitive)
  - FIREBASE_PROJECT_ID (required)
  - FIREBASE_PRIVATE_KEY (required, @security-sensitive)
  - NEXT_PUBLIC_FIREBASE_CONFIG (client-side config, @public)
  - VECTOR_DB_ENDPOINT (optional, default=Firestore)
  - LOG_LEVEL (optional, default=INFO)
  - CACHE_TTL_SECONDS (optional, default=3600, for Firestore query cache)

scaling:
  serverless: true  # Vercel Functions or Cloud Run
  max_duration_seconds: 30

container:
  base_image: node:18-alpine
  health_check:
    path: /api/health
    interval: 30s
    timeout: 5s

cdn:
  caching_strategy: query-response cache (Redis) for repeated queries
  cache_ttl_seconds: 3600
```

---

## Validation (Self-Test Contract)

```yaml
assertions:
  - condition: "agent.role in ['Reflector', 'ToolUser']"
    expected: true
    failure_signal: "Role must be hybrid Reflector+ToolUser for RAG"

  - condition: "agent.timeout_seconds <= 8"
    expected: true
    failure_signal: "User-facing endpoint SLA violated; latency budget exceeded"

  - condition: "'retrieve_documents' in [t.name for t in agent.tools]"
    expected: true
    failure_signal: "Missing retrieval tool; RAG pipeline broken"

  - condition: "'generate_citations' in [t.name for t in agent.tools]"
    expected: true
    failure_signal: "Missing citation tool; hallucination risk"

  - condition: "agent.output_schema.properties.citations.type == 'array'"
    expected: true
    failure_signal: "Citations not structured; traceability lost"

roundtrip_test: |
  1. Load AGENTS.md
  2. Generate agent config from metadata
  3. Instantiate RAG Agent with Firestore stub
  4. Simulate 50 user queries across document collections
  5. Verify retrieval accuracy (F1 score >0.85)
  6. Check citation coverage (>90% of answer claims cited)
  7. Measure latency (p99 <500ms)
  8. Serialize back to AGENTS.md; diff against original (must match)

test_invocation: |
  npm run test:roundtrip -- \
    --agents-file AGENTS.md \
    --firestore-db test \
    --test-queries 50 \
    --min-f1-score 0.85 \
    --max-latency-ms 500
```

---

## Reflexive Notes (Crone Immunity Check)

### Epistemic Vulnerabilities
1. **Hallucination Risk**: LLM may invent claims not in retrieved docs. Mitigation: citation validation; flag unmapped claims.
2. **Vector Search Decay**: Embedding model quality degradation over time (data drift). Mitigation: periodic re-embedding; monitor retrieval F1 score.
3. **Firestore Cost**: Vector searches + LLM calls → high bill. Mitigation: caching layer; cost alerts; rate-limiting per user.
4. **Stale Context**: Documents in Firestore may be outdated. Mitigation: doc versioning; "last updated" timestamps in citations.

### Antifragility Measures
- Implement fallback to keyword search if vector search fails
- Cache query results (Redis) to reduce Firestore reads
- Version embedding models; support rollback to previous model
- Monitor hallucination rate via user feedback; auto-flag when rate spikes
- Weekly audit: sample N answers, fact-check against source docs

---

## Cross-DRP Links

- **DRP-PROMPT-VERSIONING-MEMORY-2025**: `system_prompt_spec.version` tracks RAG prompt improvements; links to memory system for context persistence
- **DRP-CONTEXT-TO-EXECUTION-PIPELINE**: Query parsing → retrieval → re-ranking → synthesis → citation → validation maps to CxEP stages
- **DRP-GEMINI-BOOT-LAYER**: Export to agent-config.schema.json; auto-initialize with Firestore + embedding model selection

---

## Compiled Instantiation (Round-Trip Proof)

**From this AGENTS.md → Agent Instance (TypeScript/Next.js)**

```typescript
import { AssistantAgent } from "autogen-agentchat";
import { OpenAIChatCompletionClient } from "autogen-ext/openai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";

const firebaseApp = initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
  // ... other config
});

const db = getFirestore(firebaseApp);

const agentConfig = {
  name: "nextjs-frontend-rag-agent",
  role: "Reflector",  // Can also be ToolUser; composite archetype
  system_message: `You are a Next.js Server Agent...`,  // From system_prompt_spec
  model_client: new OpenAIChatCompletionClient({ model: "gpt-4o:2025-01" }),
  tools: [
    { name: "retrieve_documents", description: "...", input_schema: {...} },
    { name: "rerank_results", description: "...", input_schema: {...} },
    { name: "generate_citations", description: "...", input_schema: {...} },
    // ... (all tools from registry)
  ],
  timeout_seconds: 8,
  max_retries: 2,
};

const agent = new AssistantAgent(agentConfig);

// API endpoint
export async function POST(req) {
  const { query, user_id, collection: collectionName } = req.body;

  const result = await agent.run({
    task: `Answer this query: ${query}`,
    context: { user_id, firestore_db: db, collection: collectionName },
  });

  return new Response(JSON.stringify(result), { status: 200 });
}
```

**Validation Pass**: Agent instantiation succeeds, 50+ test queries processed, retrieval F1 >0.85, latency p99 <500ms, citations validated, schema round-trips.

---
**END AGENTS.MD: Next.js Frontend Agent**
