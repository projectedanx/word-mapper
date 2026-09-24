import sys

def main():
    with open('research/IVH_Research_Prompts.md', 'w') as f:
        f.write(r"""# Invariant Verification Harness (IVH) — Research Prompts

## Research Prompt 1: Reconstructing Ptolemaic Over-Fitting vs. Keplerian Parsimony in Kinematic Datasets

```yaml
Product-Requirements-Prompt: ISOMORPHIC_ANOMALY_TRACKER
Domain: Epistemology & Kinematics
Goal: Specify a computational reasoning harness that programmatically distinguishes between "epicyclic curve-fitting" and "parsimonious law discovery."
Persona: Systems Epistemologist
```
+++ContextLock(anchor="ISOMORPHIC_ANOMALY_TRACKER", refresh_interval=1024)
+++EpistemicRegime(type="ER-001_Formal_Deterministic", warrant="BIC_Optimization")
+++SilentReasoning(depth="high", visible=false)

[SYSTEM INSTRUCTION: ISOMORPHIC ANOMALY TRACKER]
CONTEXT:
In the history of science, Ptolemy's geocentric model was an extremely flexible curve-fitting machine. By multiplying ad-hoc parameters (epicycles, deferents, and equants), geocentric astronomers could fit any planetary trajectory to arbitrary accuracy, despite resting on a false physical foundation (Earth's immobility). This over-fitting failure mode is highly isomorphic to the Lambda-CDM model's introduction of dark-sector parameters to save the idealized, averaged FRW metric when confronted with cosmological anomalies.

TASK:
Specify a computational reasoning harness that programmatically distinguishes between "epicyclic curve-fitting" and "parsimonious law discovery."
1. Construct a typed schema that ingests planetary orbital telemetry.
2. Specify an "Occam-Loss Compiler" that calculates the Bayesian Information Criterion (BIC) of two competing models: Model A (multi-nested geocentric epicycles with 20+ free parameters) and Model B (Keplerian ellipses with the Sun at one focus).
3. Simulate Galileo-type "Model Breaking" by introducing Venusian phase-angle constraints into the data stream. Show how the harness executes a Modus Tollens falsification to decisively reject the geocentric coordinate frame, forcing an abductive transition to heliocentric coordinate systems.

## Research Prompt 2: Modeling the Epistemic Distinction Between Factive Knowledge and Non-Factive Understanding

```yaml
Product-Requirements-Prompt: COGNITIVE_ARCHITECTURE_COMPILER
Domain: Active Inference & Epistemology
Goal: Design an active-inference reasoning framework for LLM-based scientific agents that formalizes the transition from propositional fact-gathering to holistic, causal understanding.
Persona: Lead Cognitive Architect
```
+++ContextLock(anchor="COGNITIVE_ARCHITECTURE_COMPILER", refresh_interval=1024)
+++EpistemicRegime(type="ER-003_State_Centric", warrant="Active_Inference")
+++SilentReasoning(depth="high", visible=false)

[SYSTEM INSTRUCTION: COGNITIVE ARCHITECTURE COMPILER]
CONTEXT:
Contemporary epistemology draws a sharp distinction between propositional knowledge (which is factive and requires strict truth) and understanding (which is non-factive and tolerates approximation, idealization, and the use of "fictive principles"). Science routinely generates genuine understanding of physical systems utilizing models (such as the Ideal Gas Law or Newtonian gravity) that are known to be strictly false at fundamental scales but possess high explanatory power.

TASK:
Design an active-inference reasoning framework for LLM-based scientific agents that formalizes the transition from propositional fact-gathering to holistic, causal understanding.
1. Specify an ontology of "Fictive Principles," explicitly mapping idealized assumptions (e.g., zero molecular volume, frictionless surfaces, point masses) to their computational and explanatory utility.
2. Formulate a quantitative "Grasping Metric" that evaluates the agent's capacity to competently manipulate variables, identify causal dependencies, and successfully transfer the model's core relational structure to an entirely new, unencountered domain.
3. Simulate a scenario where the agent uses a strictly Newtonian gravitational framework to solve an astrophysical trajectory problem, demonstrating how the system retains a high "Understanding Score" despite the presence of General Relativistic defeaters.

## Research Prompt 3: Automating the De-Idealization Loop in Systems Biology and Material Sciences

```yaml
Product-Requirements-Prompt: SYSTEMIC_DE_IDEALIZATION_ENGINE
Domain: Systems Engineering & Biology
Goal: Formulate a systems engineering specification for an automated "De-Idealization Engine" designed to govern model refinement.
Persona: Systems Engineer
```
+++ContextLock(anchor="SYSTEMIC_DE_IDEALIZATION_ENGINE", refresh_interval=1024)
+++EpistemicRegime(type="ER-001_Formal_Deterministic", warrant="Asymptotic_Falsification")
+++SilentReasoning(depth="high", visible=false)

[SYSTEM INSTRUCTION: SYSTEMIC DE-IDEALIZATION ENGINE]
CONTEXT:
To make complex, high-dimensional physical systems tractable, scientific modelers utilize Aristotelian idealization ("stripping away" irrelevant properties) and Galilean idealization (deliberately introducing distortions). For instance, in systems biology, researchers simplify complex, flexible protein structures into static "ribbon diagrams" or "bead-rod polymers" to isolate key structural elements. However, these models break down when applied outside their specified "domain of validity" (e.g., when protein dynamics and conformational flexibility become the dominant physical drivers).

TASK:
Formulate a systems engineering specification for an automated "De-Idealization Engine" designed to govern model refinement.
1. Build a formal representation of an idealized model as a Directed Acyclic Graph (DAG) of logical constraints and simplifying assumptions.
2. Specify a "Boundary Auditor" that programmatically evaluates the model at extreme limits using bounding and asymptotic analysis.
3. Design a feedback loop that detects when the prediction error of the idealized model diverges by more than 3-sigma from high-fidelity experimental data. The engine must automatically locate the specific faulty assumption (e.g., "zero friction" or "zero flexibility") and execute a targeted "De-Idealization" routine—re-injecting the omitted variables back into the model to construct a higher-dimensional, more accurate representation of the target system.
"""

if __name__ == '__main__':
    main()
