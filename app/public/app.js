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

/**
 * Handles the mapping process when the 'Map' button is clicked.
 * It retrieves the input words, sends them to the backend API via a POST request,
 * parses the semantic relationships, and updates the DOM to display the results.
 *
 * @param {MouseEvent} event - The DOM click event.
 * @returns {Promise<void>} Resolves when the DOM has been updated with the results or an error message.
 */
btn.addEventListener("click", async (event) => {
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
    const serverUrl = new URL("/mcp", window.location.href);
    const transport = new mcp_sdk.StreamableHTTPClientTransport(serverUrl, {
      requestInit: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || 'dummy-token'}`
        }
      }
    });

    const client = new mcp_sdk.Client(
      { name: "word-mapper-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);

    const result = await client.callTool({
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

    /**
     * Populates an HTML list element with a series of text items.
     * Clears the list before adding items. If the items array is empty or undefined,
     * it inserts a single list item containing an em dash ("—").
     *
     * @param {HTMLElement} listEl - The DOM list element (e.g., <ul> or <ol>) to populate.
     * @param {Array<string>} [items] - The array of strings to be added as <li> items.
     * @returns {void}
     */
    function fillList(listEl, items) {
      listEl.innerHTML = "";
      if (!items || !items.length) {
        const li = document.createElement("li");
        li.textContent = "—";
        listEl.appendChild(li);
        return;
      }
      items.forEach(w => {
        const li = document.createElement("li");
        li.textContent = w;
        listEl.appendChild(li);
      });
    }

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
    statusEl.textContent = "Error mapping words. Try again in a moment.";
    resultsSection.classList.add("hidden");
  }
});
