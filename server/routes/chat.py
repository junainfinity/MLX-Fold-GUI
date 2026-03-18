"""
Routes: POST /api/chat, POST /api/chat/format
Natural Language Interface endpoints — bridges user prompts to the LLM service.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from server.services.llm import parse_user_prompt, format_for_openfold

router = APIRouter()


class ChatRequest(BaseModel):
    prompt: str


class FormatEntity(BaseModel):
    type: str
    name: str
    sequence: str = ""
    smiles: str = ""
    count: int = 1


class FormatRequest(BaseModel):
    entities: list[FormatEntity]


@router.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Parse a natural language prompt and extract biological targets + ligands.
    Returns structured entity data that can populate the UI.
    """
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    try:
        result = await parse_user_prompt(request.prompt)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM processing failed: {str(e)}")


@router.post("/api/chat/format")
async def format_entities(request: FormatRequest):
    """
    Use the LLM to format selected entities into OpenFold3-compatible query JSON.
    Acts as a 'formatting agent' between user selections and the inference engine.
    """
    if not request.entities:
        raise HTTPException(status_code=400, detail="At least one entity is required")

    try:
        entities_dicts = [e.model_dump() for e in request.entities]
        result = await format_for_openfold(entities_dicts)
        return {"success": True, "query": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Formatting failed: {str(e)}")
