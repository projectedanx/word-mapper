<korsakov_analysis>
Proposed schema:
{
  "name": "map_semantic_relations",
  "description": "PURPOSE: Retrieves semantic relationships (synonyms, antonyms, broader, narrower) for given words. GUIDELINES: Invoke when the agent needs linguistic associations for words. LIMITATIONS: Maximum 3 words allowed. Words must be strings. PARAMETERS: words - an array of up to 3 strings representing the words to map.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "words": {
        "type": "array",
        "items": { "type": "string", "maxLength": 100 },
        "minItems": 1,
        "maxItems": 3,
        "description": "Array of words to process. Max 3 items."
      }
    },
    "required": ["words"],
    "additionalProperties": false,
    "$schema": "https://json-schema.org/draft/2020-12/schema"
  }
}
Context: Semantic intelligence platform API
Score 1-5 for components:
Purpose: 5 (clearly defined)
Guidelines: 5 (invocation condition defined)
Limitations: 5 (max words defined)
Parameters: 5 (words parameter clearly described)
Length: 5 (concise)
Examples: N/A (not strictly required by rubric if context budget is tight)

Fault Category: NONE
CFDI Estimate: 0.05
EpistemicEscrow Status: INACTIVE
</korsakov_analysis>
