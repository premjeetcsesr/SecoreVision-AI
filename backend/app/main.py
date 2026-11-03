"""
SecureVision AI — Deployable FastAPI Application
Entrypoint for Cloud & Local Deployment
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.routers import system_router, config_router, ai_router, memory_router

app = FastAPI(
    title="SecureVision AI — Deployable Agent Backend",
    description="Clean, production-ready AI backend for Screen Privacy Guard & Browser Agent",
    version="2.0.0"
)

# CORS configuration for Browser Extension and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(system_router)
app.include_router(config_router)
app.include_router(ai_router)
app.include_router(memory_router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "SecureVision AI Backend",
        "assistant_name": config.assistant_name,
        "has_api_key": config.is_key_configured(),
        "docs_url": "/docs"
    }
