with open('DOMAIN_GLOSSARY.md', 'a') as f:
    f.write("""
| `Cognitive_Rheology` | Treats LLMs as high-dimensional probability manifolds governed by thermodynamic principles, replacing conversational interfaces with fluid dynamic constraints. | `[ARCHITECTURAL_MANDATE]` |
| `Variable_Viscosity_Prompting` | (VVP) Active modulation of inference decoding strategies, parameter space, and prompt constraints based on topological requirements of a task. | `[ARCHITECTURAL_MANDATE]` |
| `Rheological_Mode_Switcher` | (RMS) Layer-1 meta-architectural component that monitors semantic entropy and dynamically shifts between Crystal Mode and Cloud Mode. | `[ARCHITECTURAL_MANDATE]` |
| `Crystal_Mode` | High Viscosity, Low Entropy operational mode enforced via low temperature (T≈0) and strict output schemas (Grammar constraints). | `[STATE] — T≈0` |
| `Cloud_Mode` | Low Viscosity, High Entropy operational mode using elevated temperature (T>0.7) and structural redundancy for divergent synthesis. | `[STATE] — T>0.7` |
| `Epistemic_Escrow_Manager` | Circuit breaker that physically segregates untrusted inputs, monitoring Confidence-Fidelity Divergence Index (CFDI) spikes. | `[GOLDEN_SCAR] — Escrow State` |
""")
