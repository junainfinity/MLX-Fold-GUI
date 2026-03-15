"""
Route: GET /api/jobs/:id
Returns the current status and progress of a prediction job.
"""

from fastapi import APIRouter, HTTPException
from server.services.openfold import get_job

router = APIRouter()


@router.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get the status and progress of a prediction job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return {
        "id": job["id"],
        "status": job["status"],
        "progress": job["progress"],
        "created_at": job.get("created_at"),
        "error": job.get("error"),
        "results": job.get("results"),
    }
