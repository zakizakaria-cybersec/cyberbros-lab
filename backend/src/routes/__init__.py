from .auth import router as auth_router
from .challenges import router as challenges_router
from .vms import router as vms_router

__all__ = ["auth_router", "challenges_router", "vms_router"]
