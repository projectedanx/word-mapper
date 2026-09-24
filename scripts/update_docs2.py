import re

with open('README.md', 'r') as f:
    content = f.read()

if "`agentic_inversion_engine`" in content:
    table_row = "| `agentic_inversion_engine` | `app/server.js:166` | `Intent_Parser` | Inverts abstract intent into executable structural boundaries, averting Epistemic Sclerosis. | `[CULTURAL_ARTIFACT]` |"
    new_table_row = table_row + "\n| `invariant_verification_harness` | `app/server.js` | `Automated Hypothesis Tester` | Programmatically mines, formalizes, and stress-tests candidate scientific laws using Popperian edge-case falsification. | `[IVH_CORE]` |"

    content = content.replace(table_row, new_table_row)
    with open('README.md', 'w') as f:
        f.write(content)
    print("Updated README table")

with open('DOMAIN_GLOSSARY.md', 'r') as f:
    content = f.read()

new_terms = """
## IVH Architecture (Invariant Verification Harness)

### Invariant_Verification_Harness (IVH)
- **Standard Equivalent:** Automated Hypothesis Tester / Model Validator.
- **Local Meaning:** A 4-pillar system architecture that ingests empirical data, formalizes isomorphic laws, constructs explanatory DAGs, and applies Popperian falsification to automate scientific discovery.
- **Preservation Flag:** `[IVH_CORE]`

### Modus_Tollens_Falsification
- **Standard Equivalent:** Proof by Contradiction / Edge-Case Falsification.
- **Local Meaning:** Evaluates mathematical models at asymptotic boundaries (e.g., velocity approaching light speed) to trigger controlled "Model Breaking".
- **Preservation Flag:** `[POPPERIAN_LIMIT]`

### De-Idealization_Loop
- **Standard Equivalent:** Model Refinement / Parameter Re-injection.
- **Local Meaning:** An automated routine that detects when an idealized model (e.g., frictionless surface) exceeds a 3-sigma error threshold, locating the faulty assumption and re-injecting omitted physical variables.
- **Preservation Flag:** `[DE_IDEALIZATION]`
"""
if "Invariant_Verification_Harness" not in content:
    content += new_terms
    with open('DOMAIN_GLOSSARY.md', 'w') as f:
        f.write(content)
    print("Updated DOMAIN_GLOSSARY.md")
