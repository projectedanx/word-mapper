/**
 * Populates an HTML list element with a series of text items.
 * Clears the list before adding items. If the items array is empty or undefined,
 * it inserts a single list item containing an em dash ("—").
 *
 * @param {HTMLElement} listEl - The DOM list element (e.g., <ul> or <ol>) to populate.
 * @param {Array<string>} [items] - The array of strings to be added as <li> items.
 * @returns {void}
 */
export function fillList(listEl, items) {
  listEl.innerHTML = "";
  if (!items || !items.length) {
    const li = document.createElement("li");
    li.textContent = "—";
    listEl.appendChild(li);
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach(w => {
    const li = document.createElement("li");
    li.textContent = w;
    fragment.appendChild(li);
  });
  listEl.appendChild(fragment);
}

// In Node.js testing environment via import, we want to allow exporting
// `fillList` without triggering DOM lookup side effects when imported.
// The standard convention per repository guidelines is to guard entry-points
// or side-effects by checking `import.meta.url`. However, in the browser,
// this is loaded as a script. If it's loaded as type="module", import.meta.url works.
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

if (isBrowser) {
  const input = document.getElementById("words");
  const btn = document.getElementById("mapBtn");
  const statusEl = document.getElementById("status");
  const resultsSection = document.getElementById("results");

  const primaryWordEl = document.getElementById("primaryWord");
  const synList = document.getElementById("synonyms");
  const antList = document.getElementById("antonyms");
  const broadList = document.getElementById("broader");
  const narrowList = document.getElementById("narrower");
  const miniBlendEl = document.getElementById("miniBlend");

  let mcpClient = null;
  let currentToken = null;

  /**
   * Handles the mapping process when the 'Map' button is clicked.
   * Connects to the MCP server via StreamableHTTPServerTransport and retrieves semantic relationships.
   * Updates the DOM with synonyms, antonyms, broader, and narrower terms.
   *
   * @param {Event} event - The DOM click event.
   * @returns {Promise<void>} A promise that resolves when the mapping and DOM update are complete.
   */
  btn?.addEventListener("click", async (event) => {
    const token = localStorage.getItem('token');
    if (!token) {
      statusEl.textContent = "Authentication required. Please log in.";
      resultsSection.classList.add("hidden");
      return;
    }

    const raw = input.value.trim();
    if (!raw) {
      statusEl.textContent = "Please enter at least one word.";
      resultsSection.classList.add("hidden");
      return;
    }

    const words = raw.split(",").map(w => w.trim()).filter(Boolean).slice(0, 3);

    statusEl.textContent = "Mapping…";
    resultsSection.classList.add("hidden");
    miniBlendEl.classList.add("hidden");

    try {
      if (!mcpClient || token !== currentToken) {
        const serverUrl = new URL("/mcp", window.location.href);
        const transport = new mcp_sdk.StreamableHTTPClientTransport(serverUrl, {
          requestInit: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });

        mcpClient = new mcp_sdk.Client(
          { name: "word-mapper-client", version: "1.0.0" },
          { capabilities: {} }
        );

        await mcpClient.connect(transport);
        currentToken = token;
      }

      const result = await mcpClient.callTool({
        name: "map_semantic_relations",
        arguments: { words }
      });

      if (result.isError) {
        const errorContent = result.content[0].text;
        let errorObj;
        try {
          errorObj = JSON.parse(errorContent);
        } catch (e) {
          throw new Error(errorContent || "Request failed");
        }
        throw new Error(errorObj.structured_detail?.error || errorObj.error_code || "Request failed");
      }

      const data = JSON.parse(result.content[0].text);

      primaryWordEl.textContent = `Primary focus: "${data.primary}" (inputs: ${data.words.join(", ")})`;

      fillList(synList, data.relations.synonyms);
      fillList(antList, data.relations.antonyms);
      fillList(broadList, data.relations.broader);
      fillList(narrowList, data.relations.narrower);

      if (data.miniBlend) {
        miniBlendEl.textContent = `Mini-blend: ${data.miniBlend.description}`;
        miniBlendEl.classList.remove("hidden");
      }

      resultsSection.classList.remove("hidden");
      statusEl.textContent = "";
    } catch (err) {
      console.error(err);
      mcpClient = null;
      currentToken = null;
      statusEl.textContent = "Error mapping words. Try again in a moment.";
      resultsSection.classList.add("hidden");
    }
  });
}
