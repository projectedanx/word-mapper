import re

with open('app/server.js', 'r') as f:
    content = f.read()

# Refactor mine_lexical_topology
old_desc_mine = '"Computes thermodynamic constraints and non-Euclidean routing vectors for two orthogonal domains, returning the Four Analysis Zones and Pluriversal Knowledge Capsule."'
new_desc_mine = '[\n      "PURPOSE: Computes thermodynamic constraints and non-Euclidean routing vectors for two orthogonal domains.",\n      "GUIDELINES: Invoke when extracting semantic topology across disparate fields.",\n      "LIMITATIONS: Accepts exactly two domains. Maximum 100 characters per domain string.",\n      "PARAMETERS: domains - array of two string domains."\n    ].join(" ")'
content = content.replace(old_desc_mine, new_desc_mine)

# Refactor synthesize_symbiosis
old_desc_synth = '"Integrates a \'Human Lens\' (subjective context, reflexive dialogue, tacit knowledge) with an \'AI Specification\' (deterministic extrusion, strict schema, scalable computation) to yield an emergent framework."'
new_desc_synth = '[\n      "PURPOSE: Integrates a Human Lens with an AI Specification to yield an emergent framework.",\n      "GUIDELINES: Use to synthesize tacit knowledge against deterministic structures.",\n      "LIMITATIONS: Human lens and AI specification strings must not exceed 200 characters.",\n      "PARAMETERS: human_lens - tacit context string; ai_spec - formal structure string."\n    ].join(" ")'
content = content.replace(old_desc_synth, new_desc_synth)

# Refactor paraconsistent_synthesis
old_desc_para = '"Fuses human tacit knowledge with AI structural determinism, computing tension metrics and emitting a Golden Scar (Φ = 1.618) to anchor contradictory inputs."'
new_desc_para = '[\n      "PURPOSE: Computes tension metrics between human tacit knowledge and AI structural determinism.",\n      "GUIDELINES: Execute when epistemic contradiction requires paraconsistent anchoring.",\n      "LIMITATIONS: Input strings max 200 characters.",\n      "PARAMETERS: human_input - subjective intent string; ai_input - formal boundary string."\n    ].join(" ")'
content = content.replace(old_desc_para, new_desc_para)

# Refactor agentic_inversion_engine
old_desc_inv = '"Calculates the epistemic drift between human intuition and AI constraints to propose a latent leap."'
new_desc_inv = '[\n      "PURPOSE: Calculates epistemic drift between human hypothesis and AI constraints.",\n      "GUIDELINES: Deploy to invert passive structural mapping into agentic projection.",\n      "LIMITATIONS: String lengths max 200 characters.",\n      "PARAMETERS: human_hypothesis - fuzzy input string; ai_constraint - structural schema string."\n    ].join(" ")'
content = content.replace(old_desc_inv, new_desc_inv)

# Refactor viper_optical_extrusion_engine
old_desc_viper = '"Executes Analytic-to-Generative Inversion. Ingests fuzzy human visual intent and extrudes a deterministic Optical State Matrix (OSM), enforcing Hardware-Forced Physicality and eliminating Semantic Saponification."'
new_desc_viper = '[\n      "PURPOSE: Executes Analytic-to-Generative Inversion to output an Optical State Matrix.",\n      "GUIDELINES: Trigger for visual or affective constraint translation.",\n      "LIMITATIONS: User intent string maximum 300 characters.",\n      "PARAMETERS: user_intent - affective subjective input string."\n    ].join(" ")'
content = content.replace(old_desc_viper, new_desc_viper)

with open('app/server.js', 'w') as f:
    f.write(content)
