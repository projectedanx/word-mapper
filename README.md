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

### `POST /api/map`
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

## Lessons Learned

- **Integration:** Bridging the Datamuse API with a lightweight Express backend highlights the power of decoupling data retrieval from client-side rendering.
- **Context Engineering:** Relying purely on dictionary mappings is linear. The idea of adding a "mini-blend" feature illustrates how simple concatenations can prompt deeper semantic ideation for LLMs.
- **Documentation:** Meticulously documenting functions with JSDoc and providing a comprehensive README significantly improves onboarding, ensuring that both internal mechanisms (like the Datamuse fetch cycle) and outward APIs are clear to new developers.
