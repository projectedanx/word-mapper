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

    // WHIMSY INJECT — Manifold α — Affective Copy Payload
    let loadDuration = 0;
    statusEl.textContent = "Crunching the numbers.";
    const loadingInterval = setInterval(() => {
      loadDuration += 1000;
      if (loadDuration >= 4000) {
        statusEl.textContent = "This is taking longer than a Tuesday standup.";
      } else if (loadDuration >= 1500) {
        statusEl.textContent = "Your data is having a moment.";
      }
    }, 1000);

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

      clearInterval(loadingInterval);
      resultsSection.classList.remove("hidden");
      statusEl.textContent = "";
    } catch (err) {
      console.error(err);
      clearInterval(loadingInterval);
      mcpClient = null;
      currentToken = null;
      // WHIMSY INJECT — Manifold α — RESTRICTED ZONE error copy
      statusEl.textContent = "The data went sideways.";
      resultsSection.classList.add("hidden");
    }
  });
}

// WHIMSY INJECT — Manifold β — Easter Egg: Konami Code Brand Moment
if (isBrowser) {
  (function WhimsyKonamiEngine() {
    const KONAMI = [38,38,40,40,37,39,37,39,66,65];
    let inputBuffer = [];
    let easterEggActive = false;

    const BRAND_MOMENT = {
      overlay_id: "whimsy-konami-overlay",
      message_primary: "You found the secret.",
      message_secondary: "We put this here for exactly the kind of person who would look for it.",
      cta_text: "Acknowledge and Feel Seen",
      duration_ms: 4200,
      max_activations_per_session: 3
    };

    let sessionActivations = 0;

    if (typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', (e) => {
        inputBuffer.push(e.keyCode);
        if (inputBuffer.length > KONAMI.length) {
          inputBuffer.shift();
        }
        if (
          inputBuffer.length === KONAMI.length &&
          inputBuffer.every((v, i) => v === KONAMI[i]) &&
          !easterEggActive &&
          sessionActivations < BRAND_MOMENT.max_activations_per_session
        ) {
          triggerBrandMoment();
        }
      });
    }

    function triggerBrandMoment() {
      easterEggActive = true;
      sessionActivations++;

      const overlay = document.createElement('div');
      overlay.id = BRAND_MOMENT.overlay_id;
      overlay.innerHTML = `
        <div class="whimsy-egg-card">
          <p class="whimsy-egg-primary">${BRAND_MOMENT.message_primary}</p>
          <p class="whimsy-egg-secondary">${BRAND_MOMENT.message_secondary}</p>
          <button class="whimsy-egg-cta" onclick="this.closest('#${BRAND_MOMENT.overlay_id}').remove()">
            ${BRAND_MOMENT.cta_text}
          </button>
        </div>
      `;
      document.body.appendChild(overlay);

      // Auto-dismiss with fade
      setTimeout(() => {
        if (document.getElementById(BRAND_MOMENT.overlay_id)) {
          overlay.style.opacity = '0';
          overlay.style.transition = 'opacity 600ms ease';
          setTimeout(() => {
             if (document.getElementById(BRAND_MOMENT.overlay_id)) {
                 overlay.remove()
             }
          }, 600);
        }
        easterEggActive = false;
      }, BRAND_MOMENT.duration_ms);

      window.dispatchEvent(new CustomEvent('whimsy:easter_egg_triggered', {
        detail: { egg_id: 'konami', timestamp: Date.now() }
      }));
    }
  })();
}
