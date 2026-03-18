"""
Routes: GET /api/samples/persons, GET /api/samples/medicines
Serves pre-loaded biological sample data for the UI.
"""

from fastapi import APIRouter
from server.data.samples import get_sample_persons, get_sample_medicines

router = APIRouter()


@router.get("/api/samples/persons")
async def list_sample_persons():
    """Return all available sample persons with their biological targets."""
    return {"persons": get_sample_persons()}


@router.get("/api/samples/medicines")
async def list_sample_medicines():
    """Return all available common medicines with SMILES strings."""
    return {"medicines": get_sample_medicines()}
