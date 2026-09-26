import re

with open('app/LEXICON.md', 'r') as f:
    content = f.read()

pattern_to_insert = """
---

### PAT-005 · Rheological Mode Switcher (RMS)
**Type**: Viscosity Control | **AT Score**: 0.95
**Definition**: A dynamic L1 component controlling LLM entropy throughput by modulating parameters between Crystal Mode (T=0, high viscosity) and Cloud Mode (T>0.7, low viscosity) based on real-time topological tearing telemetry.
**Mechanism**: Evaluates semantic boundary decay (dP/dT) against Latent Heat (L) over Context Volume (V). Enforces strict JSON grammar in Crystal Mode and redundancy mapping in Cloud Mode.
**Measurement**: Confidence-Fidelity Divergence Index (CFDI). If CFDI > 0.15, execute Epistemic Escrow.
**PDL Activators**: `+++RheologicalMode(target="Crystal", temp=0.0, schema="STRICT")`
**Boundary Condition**: Sisyphus Loop recurrence necessitates viscosity decrease (heat); Semantic Entropy Spike necessitates viscosity increase (cool).
"""

# Insert it before SECTION II
content = content.replace('## SECTION II — PDL v1.0 DECORATOR REGISTRY', pattern_to_insert + '\n## SECTION II — PDL v1.0 DECORATOR REGISTRY')

with open('app/LEXICON.md', 'w') as f:
    f.write(content)
