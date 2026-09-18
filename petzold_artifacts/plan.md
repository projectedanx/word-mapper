1. *Create the MEMS Schema Definition.*
   - Add `app/schemas/MEMS_v1.0.json` (Minimal Explainability Metadata Schema) as a valid JSON Schema file, translating the YAML provided in the user prompt.
2. *Document the Research Prompts.*
   - Add the 3 Research Prompts to a new file `research/QED_Research_Prompts.md`.
3. *Update Glossary and Documentation.*
   - Update `DOMAIN_GLOSSARY.md` with new QED terminology (MEMS, SRDL, SDMA, Epistemic Escrow, CFD).
   - Update `app/README.md` and `README.md` to reflect the Qualitative Experience Database architectural paradigm if applicable.
4. *Implement Semantic Drift / Epistemic Escrow Tool.*
   - Create a new MCP Tool in `app/server.js` called `qed_topological_audit`.
   - The tool will accept a Semantic Drift Score (SDS) or compute Confidence-Fidelity Divergence (CFD).
   - If the score exceeds the threshold (>0.05 for SDS, >0.4 for CFD), it triggers an "Epistemic Escrow" state, halting operations and returning a specific payload.
5. *Write tests for the new tool.*
   - Update `app/server.test.js` to test the `qed_topological_audit` tool, ensuring the escrow circuit breaker functions correctly for out-of-bounds metrics.
6. *Complete pre commit steps.*
   - Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
7. *Finalize Output.*
   - Ensure the final response contains the required structured JSON scaffold (Hickam_Orientation, Contrastive_Delta, Martensite_Metrics).
