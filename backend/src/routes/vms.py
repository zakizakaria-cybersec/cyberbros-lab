from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..schemas.vm_instance import VMStartRequest, VMInstanceResponse
from ..services.vm_service import VMService
from ..utils.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api", tags=["vms"])


@router.post("/challenge/start", response_model=VMInstanceResponse)
def start_challenge(
    request: VMStartRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Start a challenge and provision a VM"""
    vm_instance = VMService.start_challenge(db, user, request.challenge_id)
    
    # Calculate time remaining
    time_remaining = (vm_instance.expires_at - datetime.utcnow()).total_seconds()
    
    return {
        **vm_instance.__dict__,
        "time_remaining_seconds": int(time_remaining) if time_remaining > 0 else 0,
    }


@router.get("/challenge/status", response_model=VMInstanceResponse)
def get_challenge_status(
    challenge_id: int = Query(..., description="Challenge ID"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get the status of a running VM for a challenge"""
    vm_instance = VMService.get_vm_status(db, user, challenge_id)
    
    if not vm_instance:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active VM found for this challenge"
        )
    
    # Calculate time remaining
    time_remaining = (vm_instance.expires_at - datetime.utcnow()).total_seconds()
    
    return {
        **vm_instance.__dict__,
        "time_remaining_seconds": int(time_remaining) if time_remaining > 0 else 0,
    }
