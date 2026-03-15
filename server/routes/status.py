"""
Route: GET /api/status
Returns system info + OpenFold3-MLX installation status.
"""

from fastapi import APIRouter
from server.services.system import get_system_info, check_compatibility
from server.services.openfold import get_install_status

router = APIRouter()


@router.get("/api/status")
async def get_status():
    """
    Combined status endpoint: system info, compatibility check,
    and OpenFold3-MLX installation status.
    """
    return {
        "system": get_system_info(),
        "compatibility": check_compatibility(),
        "openfold": get_install_status(),
    }
