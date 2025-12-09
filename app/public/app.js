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

btn.addEventListener("click", async () => {
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
    const res = await fetch("/api/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ words })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    primaryWordEl.textContent = `Primary focus: "${data.primary}" (inputs: ${data.words.join(", ")})`;

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
