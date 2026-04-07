import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/**
 * Fetches word relationships from the Datamuse API based on provided parameters.
 *
 * @param {Record<string, string|number>} params - The URL search parameters for the Datamuse query.
 * @returns {Promise<Array<{word: string, score: number, tags?: string[]}>>} A promise resolving to an array of word objects returned by Datamuse.
 * @throws {Error} If the HTTP response from Datamuse is not OK.
 */
async function fetchDatamuse(params) {
  const query = new URLSearchParams(params).toString();
  const url = `https://api.datamuse.com/words?${query}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Datamuse error");
  return res.json();
}

/**
 * Express route handler for mapping words to their semantic relationships.
 * Accepts a JSON body containing an array of words and returns synonyms, antonyms,
 * broader concepts, narrower concepts, and a conceptual blend description.
 *
 * @param {express.Request} req - The Express request object.
 * @param {Object} req.body - The parsed JSON body of the request.
 * @param {Array<string>} [req.body.words] - An array of words to process (up to 3).
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>} Resolves when the response has been sent to the client.
 */
app.post("/api/map", async (req, res) => {
  try {
    const words = (req.body.words || [])
      .map(w => String(w).trim())
      .filter(Boolean)
      .slice(0, 3); // limit for v0.1

    if (!words.length) {
      return res.status(400).json({ error: "No words provided" });
    }

    const primary = words[0];

    // Basic relations from Datamuse (you can expand over time)
    const [synonyms, antonyms, broader, narrower] = await Promise.all([
      fetchDatamuse({ rel_syn: primary, max: 20 }),
      fetchDatamuse({ rel_ant: primary, max: 20 }),
      fetchDatamuse({ rel_spc: primary, max: 20 }), // kind-of
      fetchDatamuse({ rel_gen: primary, max: 20 })  // more-general
    ]);

    // Very simple "mini-blend" for multiple words
    let miniBlend = null;
    if (words.length > 1) {
      miniBlend = {
        inputs: words,
        description:
          `A conceptual blend of ${words.join(", ")} – ` +
          `think about where they naturally intersect in a project, story, or system.`
      };
    }

    res.json({
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
        note: "LLM-derived dimensions (temporal, cultural, emotional, etc.) coming in later versions."
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", details: err.message });
  }
});

/**
 * Starts the Express server on the specified port.
 */
app.listen(PORT, () => {
  console.log(`Word Mapper v0.1 listening on port ${PORT}`);
});
