# Word Mapper

Revolutionary Semantic Intelligence Platform for Context Engineering & Advanced Prompt Development.

## Purpose

Word Mapper is a semantic explorer API designed to help context engineering and advanced prompt development. It allows users to dynamically discover relationships between concepts—uncovering synonyms, antonyms, broader associations, and narrower constructs—by analyzing and mapping the multi-dimensional connections between words. This platform bridges the gap between simple semantic lookups and sophisticated conceptual blending, making it ideal for researchers, creators, and AI prompt engineers.

## Project Structure

- `app/server.js`: The Express backend that interfaces with the Datamuse API to fetch and organize word relationships.
- `app/public/`: Static files serving the minimal user interface.
  - `app/public/index.html`: The HTML layout.
  - `app/public/app.js`: The client-side application logic.
  - `app/public/style.css`: The styling.

## Setup Instructions

1. **Prerequisites:** Ensure you have Node.js and `npm` installed.
2. **Installation:** Navigate to the `app/` directory and install the dependencies:
   `cd app`
   `npm install`
3. **Run the Server:** Start the Express application:
   `npm start`
   The server will start on port 3000 by default (or the value of the `PORT` environment variable).

## Usage

1. Open your web browser and navigate to `http://localhost:3000`.
2. In the interface, enter up to 3 words (separated by commas) into the input field.
3. Click "Map" to process the request.
4. The application will contact the backend API (`/api/map`), retrieve the relations from the Datamuse API, and render lists of synonyms, antonyms, broader, and narrower terms. It will also provide a "mini-blend" conceptual description if multiple words are provided.

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
