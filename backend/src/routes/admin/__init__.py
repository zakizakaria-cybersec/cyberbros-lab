from .challenges import router as challenges_router
from .assignments import router as assignments_router
from .monitoring import router as monitoring_router
from .users import router as users_router

__all__ = ["challenges_router", "assignments_router", "monitoring_router", "users_router"]
