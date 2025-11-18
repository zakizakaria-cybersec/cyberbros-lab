from .auth import router as auth_router
from .challenges import router as challenges_router
from .vms import router as vms_router
from .user import router as user_router
from .admin import challenges_router as admin_challenges_router
from .admin import assignments_router as admin_assignments_router
from .admin import monitoring_router as admin_monitoring_router
from .admin import users_router as admin_users_router

__all__ = [
    "auth_router",
    "challenges_router",
    "vms_router",
    "user_router",
    "admin_challenges_router",
    "admin_assignments_router",
    "admin_monitoring_router",
    "admin_users_router"
]
