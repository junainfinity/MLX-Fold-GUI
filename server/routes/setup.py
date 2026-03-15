"""
Route: POST /api/setup
Handles the full OpenFold3-MLX installation pipeline.
"""

from fastapi import APIRouter, WebSocket
from server.services.openfold import run_setup, get_install_status

router = APIRouter()


@router.post("/api/setup")
async def setup_model():
    """
    Start the full setup process: clone, install, download weights.
    Returns progress info. For real-time logs, connect to WS /api/logs.
    """
    logs = []

    async def collect_log(msg: str):
        logs.append(msg)

    result = await run_setup(log_callback=collect_log)
    return {**result, "logs": logs}


@router.get("/api/setup/status")
async def setup_status():
    """Check the current setup/installation status."""
    return get_install_status()
