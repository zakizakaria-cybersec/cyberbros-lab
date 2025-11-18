from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import User, Challenge, Assignment, AssignmentStatus, VMInstance
from ..schemas import (
    ChallengeListResponse,
    VMStartRequest,
    VMResetRequest,
    VMStatusResponse,
    VMCredentialsResponse,
    AssignmentWithDetails
)
from ..services.vm_service import VMService
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/challenges", response_model=List[ChallengeListResponse])
def get_assigned_challenges(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get challenges assigned to the current user"""
    # Get all assignments for the user
    assignments = db.query(Assignment).filter(
        Assignment.user_id == user.id,
        Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS])
    ).all()
    
    if not assignments:
        return []
    
    # Get the challenges
    challenge_ids = [a.challenge_id for a in assignments]
    challenges = db.query(Challenge).filter(
        Challenge.id.in_(challenge_ids),
        Challenge.is_active == True
    ).all()
    
    return challenges


@router.get("/assignments", response_model=List[AssignmentWithDetails])
def get_my_assignments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all assignments for the current user"""
    assignments = db.query(
        Assignment,
        Challenge.name.label("challenge_name"),
        User.email.label("admin_email")
    ).join(
        Challenge, Assignment.challenge_id == Challenge.id
    ).join(
        User, Assignment.assigned_by == User.id
    ).filter(
        Assignment.user_id == user.id
    ).order_by(Assignment.assigned_at.desc()).all()
    
    # Format response
    result = []
    for assignment, challenge_name, admin_email in assignments:
        assignment_dict = {
            **assignment.__dict__,
            "user_email": user.email,
            "challenge_name": challenge_name,
            "admin_email": admin_email
        }
        result.append(assignment_dict)
    
    return result


@router.post("/vm/start", response_model=VMStatusResponse)
def start_vm(
    request: VMStartRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Start a VM for a challenge"""
    # Check if user has this challenge assigned
    assignment = db.query(Assignment).filter(
        Assignment.user_id == user.id,
        Assignment.challenge_id == request.challenge_id,
        Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS])
    ).first()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this challenge. Please contact an admin."
        )
    
    # Start the VM
    vm_instance = VMService.start_challenge(
        db=db,
        user=user,
        challenge_id=request.challenge_id,
        assignment_id=assignment.id
    )
    
    # Calculate time remaining
    time_remaining = (vm_instance.expires_at - datetime.utcnow()).total_seconds()
    
    return {
        "id": vm_instance.id,
        "challenge_id": vm_instance.challenge_id,
        "status": vm_instance.status,
        "public_ip": vm_instance.public_ip,
        "ssh_username": vm_instance.ssh_username,
        "created_at": vm_instance.created_at,
        "started_at": vm_instance.started_at,
        "expires_at": vm_instance.expires_at,
        "time_remaining_seconds": int(time_remaining) if time_remaining > 0 else 0,
        "provider": vm_instance.provider,
        "credentials_accessed": vm_instance.credentials_accessed
    }


@router.get("/vm/credentials/{instance_id}", response_model=VMCredentialsResponse)
def get_vm_credentials(
    instance_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get SSH credentials for a VM (one-time display)"""
    credentials = VMService.get_vm_credentials(db, user, instance_id)
    
    return {
        "ssh_username": credentials["ssh_username"],
        "ssh_password": credentials["ssh_password"],
        "ssh_private_key": credentials.get("ssh_private_key"),
        "public_ip": credentials["public_ip"],
        "message": "⚠️ These credentials are shown only once. Please save them securely." if not credentials["credentials_accessed"] else "Credentials were already accessed previously."
    }


@router.get("/vm/status/{instance_id}", response_model=VMStatusResponse)
def get_vm_status(
    instance_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get VM status"""
    vm_instance = VMService.get_vm_status(db, user, instance_id)
    
    time_remaining = (vm_instance.expires_at - datetime.utcnow()).total_seconds()
    
    return {
        "id": vm_instance.id,
        "challenge_id": vm_instance.challenge_id,
        "status": vm_instance.status,
        "public_ip": vm_instance.public_ip,
        "ssh_username": vm_instance.ssh_username,
        "created_at": vm_instance.created_at,
        "started_at": vm_instance.started_at,
        "expires_at": vm_instance.expires_at,
        "time_remaining_seconds": int(time_remaining) if time_remaining > 0 else 0,
        "provider": vm_instance.provider,
        "credentials_accessed": vm_instance.credentials_accessed
    }


@router.get("/vm/active", response_model=Optional[VMStatusResponse])
def get_active_vm(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get the user's active VM if any"""
    vm_instance = VMService.get_active_vm(db, user)
    
    if not vm_instance:
        return None
    
    time_remaining = (vm_instance.expires_at - datetime.utcnow()).total_seconds()
    
    return {
        "id": vm_instance.id,
        "challenge_id": vm_instance.challenge_id,
        "status": vm_instance.status,
        "public_ip": vm_instance.public_ip,
        "ssh_username": vm_instance.ssh_username,
        "created_at": vm_instance.created_at,
        "started_at": vm_instance.started_at,
        "expires_at": vm_instance.expires_at,
        "time_remaining_seconds": int(time_remaining) if time_remaining > 0 else 0,
        "provider": vm_instance.provider,
        "credentials_accessed": vm_instance.credentials_accessed
    }


@router.post("/vm/reset", response_model=VMStatusResponse)
def reset_vm(
    request: VMResetRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Reset (destroy and recreate) a VM"""
    vm_instance = VMService.reset_vm(db, user, request.instance_id)
    
    time_remaining = (vm_instance.expires_at - datetime.utcnow()).total_seconds()
    
    return {
        "id": vm_instance.id,
        "challenge_id": vm_instance.challenge_id,
        "status": vm_instance.status,
        "public_ip": vm_instance.public_ip,
        "ssh_username": vm_instance.ssh_username,
        "created_at": vm_instance.created_at,
        "started_at": vm_instance.started_at,
        "expires_at": vm_instance.expires_at,
        "time_remaining_seconds": int(time_remaining) if time_remaining > 0 else 0,
        "provider": vm_instance.provider,
        "credentials_accessed": vm_instance.credentials_accessed
    }


@router.delete("/vm/{instance_id}", status_code=status.HTTP_204_NO_CONTENT)
def destroy_vm(
    instance_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Destroy a VM"""
    VMService.destroy_vm(db, user, instance_id)
    return None
