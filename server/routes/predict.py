"""
Route: POST /api/predict
Accepts entities and starts a structure prediction job.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from server.services.openfold import start_prediction

router = APIRouter()


class Entity(BaseModel):
    id: str
    type: str  # 'Protein' | 'DNA' | 'RNA' | 'Ligand' | 'Ion'
    name: str
    sequence: str
    count: int = 1


class PredictRequest(BaseModel):
    entities: list[Entity]


@router.post("/api/predict")
async def predict(request: PredictRequest):
    """
    Start a structure prediction job.
    Returns a job_id that can be polled for progress.
    """
    entities_dicts = [e.model_dump() for e in request.entities]

    logs = []

    async def collect_log(msg: str):
        logs.append(msg)

    result = await start_prediction(entities_dicts, log_callback=collect_log)
    return {**result, "logs": logs}
