from .system import router as system_router
from .config import router as config_router
from .ai import router as ai_router
from .memory import router as memory_router

__all__ = ["system_router", "config_router", "ai_router", "memory_router"]
