"""
MLX Fold Studio — FastAPI Backend

Wraps OpenFold3-MLX for protein/molecule structure prediction on Apple Silicon.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json

from server.routes.setup import router as setup_router
from server.routes.status import router as status_router
from server.routes.predict import router as predict_router
from server.routes.jobs import router as jobs_router
from server.routes.results import router as results_router

app = FastAPI(
    title="MLX Fold Studio API",
    description="Backend API for OpenFold3-MLX structure prediction on Apple Silicon",
    version="0.1.0",
)

# CORS - allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(setup_router)
app.include_router(status_router)
app.include_router(predict_router)
app.include_router(jobs_router)
app.include_router(results_router)


# WebSocket endpoint for real-time log streaming
_log_connections: list[WebSocket] = []


async def broadcast_log(msg: str):
    """Send a log message to all connected WebSocket clients."""
    disconnected = []
    for ws in _log_connections:
        try:
            await ws.send_text(json.dumps({"type": "log", "message": msg}))
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        _log_connections.remove(ws)


@app.websocket("/api/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for streaming real-time logs to the frontend."""
    await websocket.accept()
    _log_connections.append(websocket)
    try:
        while True:
            # Keep connection alive; client can also send commands
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        if websocket in _log_connections:
            _log_connections.remove(websocket)


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "mlx-fold-studio"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
