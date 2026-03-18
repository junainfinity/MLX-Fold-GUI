"""
LLM Service — osmAPI (OpenAI-compatible) client for natural language processing.

Uses the Qwen 3.5 model to:
1. Parse user prompts and extract biological targets + ligands
2. Format extracted data into OpenFold3-compatible query JSON
"""

import httpx
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# osmAPI Configuration
OSM_API_BASE = "https://api.osmapi.com/v1"
OSM_API_KEY = "osm_LMgPkQABKqd7bfRPULXPUoQK4ZxJQxmKAj3ThPEY"
OSM_MODEL = "qwen3.5-397b-a17b"

# System prompts
PARSE_SYSTEM_PROMPT = """You are a molecular biology assistant for MLX Fold Studio.
Your job is to parse user requests about drug interactions and molecular simulations.

When a user describes a simulation they want to run, extract:
1. Biological targets (proteins, DNA sequences, RNA sequences)
2. Ligands/medicines (drugs, small molecules)
3. Ions (if mentioned)

You MUST respond with ONLY valid JSON in this exact format:
{
  "intent": "simulate_interaction",
  "entities": [
    {
      "type": "Protein|DNA|RNA|Ligand|Ion",
      "name": "descriptive name",
      "sequence": "sequence or SMILES string",
      "count": 1,
      "source": "sample|custom|inferred"
    }
  ],
  "summary": "Brief description of what will be simulated"
}

Common medicines and their SMILES:
- Paracetamol/Acetaminophen: CC(=O)NC1=CC=C(O)C=C1
- Aspirin: CC(=O)OC1=CC=CC=C1C(=O)O
- Caffeine: CN1C=NC2=C1C(=O)N(C(=O)N2C)C
- Ibuprofen: CC(C)CC1=CC=C(C=C1)C(C)C(=O)O
- Metformin: CN(C)C(=N)NC(=N)N
- ATP: NC1=NC=NC2=C1N=CN2[C@@H]3O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]3O

If the user mentions "Sample Person A", use this protein: MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK
If the user mentions "Sample Person B", use this DNA: ATGCGTACGTAGCTAGATGCGTACGTAGCTAG and RNA: AUGCGUACGUAGCUAGAUGCGUACGUAGCUAG
If the user mentions "Sample Person C", use this protein: MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH

If you cannot determine specific sequences, use reasonable defaults or indicate "unknown" in the sequence field.
Always respond with ONLY the JSON, no markdown formatting, no code fences."""

FORMAT_SYSTEM_PROMPT = """You are a data formatting agent for OpenFold3-MLX.
Your job is to take a list of molecular entities and produce the exact JSON configuration
that OpenFold3 needs for structure prediction.

You MUST respond with ONLY valid JSON in this exact format:
{
  "seeds": [42],
  "queries": {
    "mlx-fold-studio-job": {
      "chains": [
        {
          "molecule_type": "protein|dna|rna|ligand",
          "chain_ids": ["A"],
          "sequence": "amino acid or nucleotide sequence (null for ligands)",
          "smiles": "SMILES string (only for ligands, null otherwise)"
        }
      ]
    }
  }
}

Rules:
- Assign chain IDs alphabetically: A, B, C, D...
- molecule_type must be lowercase: "protein", "dna", "rna", or "ligand"
- For proteins: include "sequence", set "smiles" to null
- For DNA/RNA: include "sequence", set "smiles" to null
- For ligands: set "sequence" to null, include "smiles"
- If count > 1 for an entity, duplicate it with additional chain IDs
- Always respond with ONLY the JSON, no markdown formatting, no code fences."""


async def _call_osmapi(system_prompt: str, user_message: str, temperature: float = 0.3) -> Optional[dict]:
    """Make a chat completion call to the osmAPI."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OSM_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OSM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OSM_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": temperature,
                    "max_tokens": 2048,
                },
            )
            response.raise_for_status()
            data = response.json()

            # Extract the assistant's message content
            content = data["choices"][0]["message"]["content"]

            # Strip markdown code fences if present
            content = content.strip()
            if content.startswith("```"):
                # Remove opening fence (possibly with language tag)
                first_newline = content.index("\n")
                content = content[first_newline + 1:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            # Parse JSON
            return json.loads(content)

    except httpx.HTTPStatusError as e:
        logger.error(f"osmAPI HTTP error: {e.response.status_code} - {e.response.text}")
        raise Exception(f"LLM API error: {e.response.status_code}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {e}")
        raise Exception(f"LLM returned invalid JSON: {str(e)}")
    except Exception as e:
        logger.error(f"osmAPI call failed: {e}")
        raise


async def parse_user_prompt(prompt: str) -> dict:
    """
    Parse a natural language prompt and extract biological targets and ligands.

    Args:
        prompt: User's natural language request (e.g. "Simulate Paracetamol with Sample Person A's protein")

    Returns:
        Dict with 'intent', 'entities', and 'summary' keys.
    """
    result = await _call_osmapi(PARSE_SYSTEM_PROMPT, prompt)
    if not result:
        raise Exception("Failed to parse prompt")
    return result


async def format_for_openfold(entities: list[dict]) -> dict:
    """
    Use the LLM to format entity selections into OpenFold3-compatible query JSON.

    Args:
        entities: List of entity dicts with type, name, sequence/smiles, count

    Returns:
        OpenFold3 query JSON dict ready to be written to a file.
    """
    user_message = f"Format these entities for OpenFold3 prediction:\n{json.dumps(entities, indent=2)}"
    result = await _call_osmapi(FORMAT_SYSTEM_PROMPT, user_message)
    if not result:
        raise Exception("Failed to format entities for OpenFold")
    return result
