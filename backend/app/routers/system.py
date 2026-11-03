"""
System & Health Endpoints
"""

from fastapi import APIRouter
from app.config import config
from app.services.metrics_service import metrics_service

router = APIRouter(tags=["System"])

@router.get("/health")
@router.get("/api/health")
async def health_check():
    """Liveness probe and backend service status."""
    return {
        "status": "ok",
        "service": "SecureVision AI Backend",
        "assistant_name": config.assistant_name,
        "has_api_key": config.is_key_configured(),
        "api_key_masked": config.get_masked_key(),
        "model": config.gemini_model,
        "deployable": True
    }

@router.get("/metrics")
@router.get("/api/jarvis/metrics")
async def get_metrics():
    """Real-time system telemetry (CPU, Memory, Network)."""
    return metrics_service.get_system_metrics()
