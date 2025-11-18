from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models import User, Challenge, Assignment, AssignmentStatus, VMInstance, VMStatus
from ..schemas import (
    ChallengeListResponse,
    VMStartRequest,
    VMResetRequest,
    VMStatusResponse,
    VMCredentialsResponse,
    AssignmentWithDetails,
    UserAssignmentDetail
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


@router.get("/assignments", response_model=List[UserAssignmentDetail])
def get_my_assignments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all assignments for the current user with challenge and VM details"""
    # Get assignments with challenge details
    assignments_query = db.query(Assignment, Challenge).join(
        Challenge, Assignment.challenge_id == Challenge.id
    ).filter(
        Assignment.user_id == user.id
    ).order_by(Assignment.assigned_at.desc()).all()
    
    result = []
    for assignment, challenge in assignments_query:
        # Check for active VM for this assignment
        vm_instance = db.query(VMInstance).filter(
            VMInstance.assignment_id == assignment.id,
            VMInstance.status.in_([VMStatus.PROVISIONING, VMStatus.RUNNING])
        ).first()
        
        has_active_vm = vm_instance is not None
        vm_instance_id = vm_instance.id if vm_instance else None
        vm_status = vm_instance.status.value if vm_instance else None
        vm_public_ip = vm_instance.public_ip if vm_instance else None
        vm_expires_at = vm_instance.expires_at if vm_instance else None
        
        assignment_detail = {
            "id": assignment.id,
            "challenge_id": challenge.id,
            "challenge_name": challenge.name,
            "challenge_description": challenge.description,
            "challenge_difficulty": challenge.difficulty,
            "challenge_duration_hours": challenge.duration_hours,
            "status": assignment.status.value,
            "assigned_at": assignment.assigned_at,
            "started_at": assignment.started_at,
            "completed_at": assignment.completed_at,
            "expires_at": assignment.expires_at,
            "notes": assignment.notes,
            "has_active_vm": has_active_vm,
            "vm_instance_id": vm_instance_id,
            "vm_status": vm_status,
            "vm_public_ip": vm_public_ip,
            "vm_expires_at": vm_expires_at
        }
        result.append(assignment_detail)
    
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
