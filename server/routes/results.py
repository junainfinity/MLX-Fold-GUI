"""
Route: GET /api/results/:id/:filename
Serves prediction result files (PDB, mmCIF) for download.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from server.services.openfold import get_job, get_result_file_path

router = APIRouter()


@router.get("/api/results/{job_id}")
async def list_results(job_id: str):
    """List all result files for a completed job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail=f"Job is not complete (status: {job['status']})")
    return {"results": job.get("results", [])}


@router.get("/api/results/{job_id}/{filename}")
async def download_result(job_id: str, filename: str):
    """Download a specific result file (PDB or mmCIF)."""
    file_path = get_result_file_path(job_id, filename)
    if not file_path:
        raise HTTPException(status_code=404, detail=f"Result file {filename} not found for job {job_id}")

    media_type = "chemical/x-pdb" if filename.endswith(".pdb") else "chemical/x-mmcif"
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type=media_type,
    )
