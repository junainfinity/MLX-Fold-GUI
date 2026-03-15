"""
Route: GET /api/jobs/:id
Returns the current status and progress of a prediction job.
"""

from fastapi import APIRouter, HTTPException
from server.services.openfold import get_job, pause_job, resume_job, stop_job

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


@router.post("/api/jobs/{job_id}/pause")
async def pause_job_endpoint(job_id: str):
    """Pause a running prediction job."""
    success = await pause_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot pause job (not found or not running)")
    return {"success": True, "message": "Job paused"}


@router.post("/api/jobs/{job_id}/resume")
async def resume_job_endpoint(job_id: str):
    """Resume a paused prediction job."""
    success = await resume_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot resume job (not found or not paused)")
    return {"success": True, "message": "Job resumed"}


@router.post("/api/jobs/{job_id}/stop")
async def stop_job_endpoint(job_id: str):
    """Stop a running or paused prediction job."""
    success = await stop_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot stop job (not found or not active)")
    return {"success": True, "message": "Job stopped"}
