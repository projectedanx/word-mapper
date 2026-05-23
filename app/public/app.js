
function parseMcpResponse(result) {
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
  return JSON.parse(result.content[0].text);
}

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
  listEl.textContent = "";
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


  const symbiosisBtn = document.getElementById('symbiosisBtn');
  const humanLensInput = document.getElementById('humanLens');
  const aiSpecInput = document.getElementById('aiSpec');
  const symbiosisStatusEl = document.getElementById('symbiosisStatus');
  const symbiosisResults = document.getElementById('symbiosisResults');
  const integratedFrameworkEl = document.getElementById('integratedFramework');
  const emergentValueEl = document.getElementById('emergentValue');
  const productivityJCurveEl = document.getElementById('productivityJCurve');

  symbiosisBtn?.addEventListener("click", async (event) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      symbiosisStatusEl.textContent = "Authentication required. Please log in.";
      symbiosisResults.classList.add("hidden");
      return;
    }

    const humanLens = humanLensInput.value.trim();
    const aiSpec = aiSpecInput.value.trim();
    if (!humanLens || !aiSpec) {
      symbiosisStatusEl.textContent = "Please enter both a Human Lens and an AI Specification.";
      symbiosisResults.classList.add("hidden");
      return;
    }

    symbiosisStatusEl.textContent = "Synthesizing symbiosis...";
    symbiosisResults.classList.add("hidden");

    try {
      if (!globalThis.mcpClient || token !== globalThis.currentToken) {
        const serverUrl = new URL("/mcp", window.location.href);
        const transport = new mcp_sdk.StreamableHTTPClientTransport(serverUrl, {
          requestInit: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });

        globalThis.mcpClient = new mcp_sdk.Client(
          { name: "word-mapper-client", version: "1.0.0" },
          { capabilities: {} }
        );

        await globalThis.mcpClient.connect(transport);
        globalThis.currentToken = token;
      }

      const result = await globalThis.mcpClient.callTool({
        name: "synthesize_symbiosis",
        arguments: { human_lens: humanLens, ai_spec: aiSpec }
      });
      const data = parseMcpResponse(result);

      integratedFrameworkEl.textContent = data.integrated_framework;
      emergentValueEl.textContent = data.emergent_value;
      productivityJCurveEl.textContent = data.productivity_j_curve_impact;

      symbiosisResults.classList.remove("hidden");
      symbiosisStatusEl.textContent = "";
    } catch (err) {
      console.error(err);
      globalThis.mcpClient = null;
      globalThis.currentToken = null;
      symbiosisStatusEl.textContent = err.message || "An error occurred during synthesis.";
      symbiosisResults.classList.add("hidden");
    }
  });

// WHIMSY INJECT
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

  const domainsInput = document.getElementById("domains");
  const mineBtn = document.getElementById("mineBtn");
  const mineStatusEl = document.getElementById("mineStatus");
  const topologyResults = document.getElementById("topologyResults");

  const semanticDriftEl = document.getElementById("semanticDrift");
  const connotationVectorsEl = document.getElementById("connotationVectors");
  const semioticBlindSpotsEl = document.getElementById("semioticBlindSpots");
  const ambiguityZonesEl = document.getElementById("ambiguityZones");
  const knowledgeCapsuleEl = document.getElementById("knowledgeCapsule");

  globalThis.mcpClient = null;
  globalThis.currentToken = null;

  /**
   * Handles the mapping process when the 'Map' button is clicked.
   * Connects to the MCP server via StreamableHTTPServerTransport and retrieves semantic relationships.
   * Updates the DOM with synonyms, antonyms, broader, and narrower terms.
   *
   * @param {Event} event - The DOM click event.
   * @returns {Promise<void>} A promise that resolves when the mapping and DOM update are complete.
   */
  btn?.addEventListener("click", async (event) => {
    const token = sessionStorage.getItem('token');
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
      if (!globalThis.mcpClient || token !== globalThis.currentToken) {
        const serverUrl = new URL("/mcp", window.location.href);
        const transport = new mcp_sdk.StreamableHTTPClientTransport(serverUrl, {
          requestInit: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });

        globalThis.mcpClient = new mcp_sdk.Client(
          { name: "word-mapper-client", version: "1.0.0" },
          { capabilities: {} }
        );

        await globalThis.mcpClient.connect(transport);
        globalThis.currentToken = token;
      }

      const result = await globalThis.mcpClient.callTool({
        name: "map_semantic_relations",
        arguments: { words }
      });
      const data = parseMcpResponse(result);

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
      globalThis.mcpClient = null;
      globalThis.currentToken = null;
      // WHIMSY INJECT — Manifold α — RESTRICTED ZONE error copy
      statusEl.textContent = err.message || "An error occurred.";
      resultsSection.classList.add("hidden");
    }
  });
}

  const mineBtn = document.getElementById('mineBtn');
  const domainsInput = document.getElementById('domains');
  const mineStatusEl = document.getElementById('mineStatus');
  const topologyResults = document.getElementById('topologyResults');
  const semanticDriftEl = document.getElementById('semanticDrift');
  const connotationVectorsEl = document.getElementById('connotationVectors');
  const semioticBlindSpotsEl = document.getElementById('semioticBlindSpots');
  const ambiguityZonesEl = document.getElementById('ambiguityZones');
  const knowledgeCapsuleEl = document.getElementById('knowledgeCapsule');

  mineBtn?.addEventListener("click", async (event) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      mineStatusEl.textContent = "Authentication required. Please log in.";
      topologyResults.classList.add("hidden");
      return;
    }

    const raw = domainsInput.value.trim();
    if (!raw) {
      mineStatusEl.textContent = "Please enter two domains.";
      topologyResults.classList.add("hidden");
      return;
    }

    const domains = raw.split(",").map(w => w.trim()).filter(Boolean);
    if (domains.length !== 2) {
      mineStatusEl.textContent = "Please enter exactly two domains separated by a comma.";
      topologyResults.classList.add("hidden");
      return;
    }

    mineStatusEl.textContent = "Computing topological intersections...";
    topologyResults.classList.add("hidden");
    knowledgeCapsuleEl.classList.add("hidden");

    try {
      if (!globalThis.mcpClient || token !== globalThis.currentToken) {
        const serverUrl = new URL("/mcp", window.location.href);
        const transport = new mcp_sdk.StreamableHTTPClientTransport(serverUrl, {
          requestInit: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });

        globalThis.mcpClient = new mcp_sdk.Client(
          { name: "word-mapper-client", version: "1.0.0" },
          { capabilities: {} }
        );

        await globalThis.mcpClient.connect(transport);
        globalThis.currentToken = token;
      }

      const result = await globalThis.mcpClient.callTool({
        name: "mine_lexical_topology",
        arguments: { domains }
      });
      const data = parseMcpResponse(result);

      semanticDriftEl.textContent = data.analysis_zones.semantic_drift;
      connotationVectorsEl.textContent = data.analysis_zones.connotation_vectors;
      semioticBlindSpotsEl.textContent = data.analysis_zones.semiotic_blind_spots;
      ambiguityZonesEl.textContent = data.analysis_zones.ambiguity_zones;

      if (data.pluriversal_knowledge_capsule) {
        knowledgeCapsuleEl.textContent = "";
        const strong = document.createElement("strong");
        strong.textContent = "Knowledge Capsule:";
        knowledgeCapsuleEl.appendChild(strong);
        knowledgeCapsuleEl.appendChild(document.createElement("br"));
        knowledgeCapsuleEl.appendChild(document.createTextNode(data.pluriversal_knowledge_capsule.emergent_synthesis));
        knowledgeCapsuleEl.appendChild(document.createElement("br"));
        knowledgeCapsuleEl.appendChild(document.createTextNode(data.pluriversal_knowledge_capsule.isomorphisms_of_friction));
        knowledgeCapsuleEl.classList.remove("hidden");
      }

      topologyResults.classList.remove("hidden");
      mineStatusEl.textContent = "";
    } catch (err) {
      console.error(err);
      globalThis.mcpClient = null;
      globalThis.currentToken = null;
      mineStatusEl.textContent = err.message || "An error occurred during mining.";
      topologyResults.classList.add("hidden");
    }
  });


  const paraconsistentBtn = document.getElementById('paraconsistentBtn');
  const paraHumanInput = document.getElementById('paraHumanInput');
  const paraAiInput = document.getElementById('paraAiInput');
  const paraStatusEl = document.getElementById('paraStatus');
  const paraResults = document.getElementById('paraResults');
  const goldenScarEl = document.getElementById('goldenScar');
  const superpositionPayloadEl = document.getElementById('superpositionPayload');
  const synthesisLogEl = document.getElementById('synthesisLog');

  paraconsistentBtn?.addEventListener("click", async (event) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      paraStatusEl.textContent = "Authentication required. Please log in.";
      paraResults.classList.add("hidden");
      return;
    }

    const humanInput = paraHumanInput.value.trim();
    const aiInput = paraAiInput.value.trim();
    if (!humanInput || !aiInput) {
      paraStatusEl.textContent = "Please enter both human tacit input and AI structural input.";
      paraResults.classList.add("hidden");
      return;
    }

    paraStatusEl.textContent = "Computing paraconsistent tension...";
    paraResults.classList.add("hidden");
    synthesisLogEl.classList.add("hidden");

    try {
      if (!globalThis.mcpClient || token !== globalThis.currentToken) {
        const serverUrl = new URL("/mcp", window.location.href);
        const transport = new mcp_sdk.StreamableHTTPClientTransport(serverUrl, {
          requestInit: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });


  const inversionBtn = document.getElementById('inversionBtn');
  const invHumanInput = document.getElementById('invHumanInput');
  const invAiInput = document.getElementById('invAiInput');
  const invStatusEl = document.getElementById('invStatus');
  const invResults = document.getElementById('invResults');
  const epistemicDriftEl = document.getElementById('epistemicDrift');
  const latentLeapEl = document.getElementById('latentLeap');
  const paraconsistentContradictionEl = document.getElementById('paraconsistentContradiction');

  inversionBtn?.addEventListener("click", async (event) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      invStatusEl.textContent = "Authentication required. Please log in.";
      invResults.classList.add("hidden");
      return;
    }

    const humanHypothesis = invHumanInput.value.trim();
    const aiConstraint = invAiInput.value.trim();
    if (!humanHypothesis || !aiConstraint) {
      invStatusEl.textContent = "Please enter both hypothesis and constraint.";
      invResults.classList.add("hidden");
      return;
    }

    invStatusEl.textContent = "Executing inversion...";
    invResults.classList.add("hidden");

    try {
      if (!globalThis.mcpClient || token !== globalThis.currentToken) {
        const serverUrl = new URL("/mcp", window.location.href);
        const transport = new mcp_sdk.StreamableHTTPClientTransport(serverUrl, {
          requestInit: { headers: { Authorization: `Bearer ${token}` } }
        });
        globalThis.mcpClient = new mcp_sdk.Client(
          { name: "word-mapper-client", version: "1.0.0" }, { capabilities: {} }
        );
        await globalThis.mcpClient.connect(transport);
        globalThis.currentToken = token;
      }

      const result = await globalThis.mcpClient.callTool({
        name: "agentic_inversion_engine",
        arguments: { human_hypothesis: humanHypothesis, ai_constraint: aiConstraint }
      });
      const data = parseMcpResponse(result);

      epistemicDriftEl.textContent = String(data.epistemic_drift);
      latentLeapEl.textContent = data.latent_leap;

      if (data.paraconsistent_contradiction) {
        paraconsistentContradictionEl.textContent = "";
        const node = document.createTextNode(data.paraconsistent_contradiction);
        paraconsistentContradictionEl.appendChild(node);
        paraconsistentContradictionEl.classList.remove("hidden");
      } else {
        paraconsistentContradictionEl.classList.add("hidden");
      }

      invResults.classList.remove("hidden");
      invStatusEl.textContent = "Inversion complete.";
    } catch (err) {
      console.error(err);
      invStatusEl.textContent = err.message || "An error occurred.";
      invResults.classList.add("hidden");
      if (globalThis.mcpClient) {
        try { await globalThis.mcpClient.close(); } catch (e) {}
        globalThis.mcpClient = null;
      }
    }
  });


        globalThis.mcpClient = new mcp_sdk.Client(
          { name: "word-mapper-client", version: "1.0.0" },
          { capabilities: {} }
        );

        await globalThis.mcpClient.connect(transport);
        globalThis.currentToken = token;
      }

      const result = await globalThis.mcpClient.callTool({
        name: "paraconsistent_synthesis",
        arguments: { human_input: humanInput, ai_input: aiInput }
      });
      const data = parseMcpResponse(result);

      goldenScarEl.textContent = String(data.golden_scar);
      superpositionPayloadEl.textContent = data.superposition_payload;

      if (data.synthesis_log) {
        synthesisLogEl.textContent = data.synthesis_log;
        synthesisLogEl.classList.remove("hidden");
      }

      paraResults.classList.remove("hidden");
      paraStatusEl.textContent = "";
    } catch (err) {
      console.error(err);
      globalThis.mcpClient = null;
      globalThis.currentToken = null;
      paraStatusEl.textContent = err.message || "An error occurred during synthesis computation.";
      paraResults.classList.add("hidden");
    }
  });


  // MULTI-AGENT ORCHESTRATOR LOGIC
  const agentSelector = document.getElementById('agentSelector');
  const orchestratorInput1 = document.getElementById('orchestratorInput1');
  const orchestratorInput2 = document.getElementById('orchestratorInput2');
  const orchestratorLabel1 = document.getElementById('orchestratorLabel1');
  const orchestratorLabel2 = document.getElementById('orchestratorLabel2');
  const orchestratorBtn = document.getElementById('orchestratorBtn');
  const orchestratorStatusEl = document.getElementById('orchestratorStatus');
  const orchestratorResults = document.getElementById('orchestratorResults');
  const orchestratorGrid = document.getElementById('orchestratorGrid');
  const orchestratorLog = document.getElementById('orchestratorLog');

  const updateOrchestratorUI = () => {
    const agent = agentSelector?.value;
    if (!agent) return;

    if (agent === 'synthesize_symbiosis') {
      orchestratorLabel1.textContent = "Human Lens (tacit knowledge):";
      orchestratorInput1.placeholder = "e.g. Reflexive Dialogue, tacit operations";
      orchestratorInput1.style.display = "block";
      orchestratorLabel1.style.display = "block";

      orchestratorLabel2.textContent = "AI Specification (structural constraint):";
      orchestratorInput2.placeholder = "e.g. JSON-LD Schema, Draft-Conditioned Decoding";
      orchestratorInput2.style.display = "block";
      orchestratorLabel2.style.display = "block";
    } else if (agent === 'paraconsistent_synthesis') {
      orchestratorLabel1.textContent = "Human Tacit Input (Entropy):";
      orchestratorInput1.placeholder = "e.g. Unquantifiable subjective tension";
      orchestratorInput1.style.display = "block";
      orchestratorLabel1.style.display = "block";

      orchestratorLabel2.textContent = "AI Structural Input (Topology):";
      orchestratorInput2.placeholder = "e.g. Rigid schema constraints";
      orchestratorInput2.style.display = "block";
      orchestratorLabel2.style.display = "block";
    } else if (agent === 'agentic_inversion_engine') {
      orchestratorLabel1.textContent = "Human Hypothesis (Fuzzy Intent):";
      orchestratorInput1.placeholder = "e.g. Need to bridge logic and intuition";
      orchestratorInput1.style.display = "block";
      orchestratorLabel1.style.display = "block";

      orchestratorLabel2.textContent = "AI Constraint (Rigid Schema):";
      orchestratorInput2.placeholder = "e.g. JSON-LD requirement";
      orchestratorInput2.style.display = "block";
      orchestratorLabel2.style.display = "block";
    } else if (agent === 'viper_optical_extrusion_engine') {
      orchestratorLabel1.textContent = "User Intent (Affective/Visual input):";
      orchestratorInput1.placeholder = "e.g. A cinematic moody masterpiece";
      orchestratorInput1.style.display = "block";
      orchestratorLabel1.style.display = "block";

      orchestratorInput2.style.display = "none";
      orchestratorLabel2.style.display = "none";
    }
  };

  agentSelector?.addEventListener('change', updateOrchestratorUI);

  if(agentSelector) updateOrchestratorUI();

  orchestratorBtn?.addEventListener("click", async (event) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      orchestratorStatusEl.textContent = "Authentication required. Please log in.";
      orchestratorResults.classList.add("hidden");
      return;
    }

    const agent = agentSelector.value;
    const input1 = orchestratorInput1.value.trim();
    const input2 = orchestratorInput2.value.trim();

    if (!input1 || (agent !== 'viper_optical_extrusion_engine' && !input2)) {
      orchestratorStatusEl.textContent = "Please provide all required inputs.";
      orchestratorResults.classList.add("hidden");
      return;
    }

    orchestratorStatusEl.textContent = "Executing Agent Workflow...";
    orchestratorResults.classList.add("hidden");
    orchestratorGrid.textContent = "";
    orchestratorLog.textContent = "";
    orchestratorLog.classList.add("hidden");

    let args = {};
    if (agent === 'synthesize_symbiosis') {
      args = { human_lens: input1, ai_spec: input2 };
    } else if (agent === 'paraconsistent_synthesis') {
      args = { human_input: input1, ai_input: input2 };
    } else if (agent === 'agentic_inversion_engine') {
      args = { human_hypothesis: input1, ai_constraint: input2 };
    } else if (agent === 'viper_optical_extrusion_engine') {
      args = { user_intent: input1 };
    }

    try {
      if (!globalThis.mcpClient || token !== globalThis.currentToken) {
        const serverUrl = new URL("/mcp", window.location.href);
        const transport = new mcp_sdk.StreamableHTTPClientTransport(serverUrl, {
          requestInit: { headers: { Authorization: `Bearer ${token}` } }
        });
        globalThis.mcpClient = new mcp_sdk.Client(
          { name: "word-mapper-client", version: "1.0.0" }, { capabilities: {} }
        );
        await globalThis.mcpClient.connect(transport);
        globalThis.currentToken = token;
      }

      const result = await globalThis.mcpClient.callTool({
        name: agent,
        arguments: args
      });
      const data = parseMcpResponse(result);

      const renderCard = (title, content, valueColor) => {
          const card = document.createElement('div');
          card.className = 'card';
          card.style.borderColor = valueColor || '#374151';

          const titleEl = document.createElement('h3');
          titleEl.textContent = title;

          const contentEl = document.createElement('div');
          contentEl.style.fontSize = valueColor ? '1.25rem' : '0.85rem';
          if(valueColor) {
              contentEl.style.fontWeight = 'bold';
              contentEl.style.color = valueColor;
          }

          if(typeof content === 'object') {
             const pre = document.createElement('pre');
             pre.style.whiteSpace = 'pre-wrap';
             pre.style.wordBreak = 'break-word';
             pre.textContent = JSON.stringify(content, null, 2);
             contentEl.appendChild(pre);
          } else {
             contentEl.textContent = String(content);
          }

          card.appendChild(titleEl);
          card.appendChild(contentEl);
          return card;
      };

      if (agent === 'synthesize_symbiosis') {
          orchestratorGrid.appendChild(renderCard('Integrated Framework', data.integrated_framework));
          orchestratorGrid.appendChild(renderCard('Emergent Value', data.emergent_value));
          orchestratorGrid.appendChild(renderCard('Productivity J-Curve', data.productivity_j_curve_impact));
      } else if (agent === 'paraconsistent_synthesis') {
          orchestratorGrid.appendChild(renderCard('Golden Scar (Φ)', data.golden_scar, '#facc15'));
          orchestratorGrid.appendChild(renderCard('Superposition Payload', data.superposition_payload, '#d8b4fe'));
          if (data.synthesis_log) {
            orchestratorLog.textContent = data.synthesis_log;
            orchestratorLog.classList.remove("hidden");
          }
      } else if (agent === 'agentic_inversion_engine') {
          orchestratorGrid.appendChild(renderCard('Epistemic Drift', data.epistemic_drift, '#ef4444'));
          orchestratorGrid.appendChild(renderCard('Latent Leap (Φ)', data.latent_leap, '#10b981'));
          if (data.paraconsistent_contradiction) {
            orchestratorLog.textContent = data.paraconsistent_contradiction;
            orchestratorLog.classList.remove("hidden");
            orchestratorLog.style.borderColor = '#f87171';
          }
      } else if (agent === 'viper_optical_extrusion_engine') {
          orchestratorGrid.appendChild(renderCard('Diagnostic', data.DIAGNOSTIC));
          orchestratorGrid.appendChild(renderCard('Optical State Matrix', data.OPTICAL_STATE_MATRIX));
      }

      orchestratorResults.classList.remove("hidden");
      orchestratorStatusEl.textContent = "Agent Workflow Complete.";
    } catch (err) {
      console.error(err);
      orchestratorStatusEl.textContent = err.message || "An error occurred executing the agent.";
      orchestratorResults.classList.add("hidden");
      if (globalThis.mcpClient) {
        try { await globalThis.mcpClient.close(); } catch (e) {}
        globalThis.mcpClient = null;
      }
    }
  });

// WHIMSY INJECT
// WHIMSY INJECT — Manifold β — Easter Egg: Konami Code Brand Moment
if (isBrowser) {
  /**
   * WhimsyKonamiEngine is an IIFE that handles Konami Code Easter egg.
   * @returns {void}
   */
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
          !easterEggActive &&
          e.keyCode === KONAMI[KONAMI.length - 1] &&
          inputBuffer.length === KONAMI.length &&
          sessionActivations < BRAND_MOMENT.max_activations_per_session
        ) {
          let match = true;
          for (let i = 0; i < KONAMI.length; i++) {
            if (inputBuffer[i] !== KONAMI[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            triggerBrandMoment();
          }
        }
      });
    }

    /**
     * Triggers the brand moment overlay and handles its lifecycle.
     * @returns {void}
     */
    function triggerBrandMoment() {
      easterEggActive = true;
      sessionActivations++;

      const overlay = document.createElement('div');
      overlay.id = BRAND_MOMENT.overlay_id;

      const card = document.createElement('div');
      card.className = "whimsy-egg-card";

      const pPrimary = document.createElement('p');
      pPrimary.className = "whimsy-egg-primary";
      pPrimary.textContent = BRAND_MOMENT.message_primary;

      const pSecondary = document.createElement('p');
      pSecondary.className = "whimsy-egg-secondary";
      pSecondary.textContent = BRAND_MOMENT.message_secondary;

      const btn = document.createElement('button');
      btn.className = "whimsy-egg-cta";
      btn.textContent = BRAND_MOMENT.cta_text;
      btn.addEventListener('click', () => {
        overlay.remove();
      });

      card.appendChild(pPrimary);
      card.appendChild(pSecondary);
      card.appendChild(btn);
      overlay.appendChild(card);

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
