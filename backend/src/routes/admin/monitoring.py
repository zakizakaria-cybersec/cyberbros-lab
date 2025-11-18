from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ...database import get_db
from ...models import VMInstance, User, Challenge, ProvisioningLog
from ...schemas import VMInstanceWithDetails, ProvisioningLogResponse
from ...utils.auth import get_current_admin_user

router = APIRouter(prefix="/api/admin/monitoring", tags=["admin-monitoring"])


@router.get("/instances", response_model=List[VMInstanceWithDetails])
def list_all_instances(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    challenge_id: Optional[int] = Query(None, description="Filter by challenge ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    provider: Optional[str] = Query(None, description="Filter by provider")
):
    """List all VM instances with filters (Admin only)"""
    query = db.query(
        VMInstance,
        User.email.label("user_email"),
        Challenge.name.label("challenge_name")
    ).join(
        User, VMInstance.user_id == User.id
    ).join(
        Challenge, VMInstance.challenge_id == Challenge.id
    )
    
    if user_id:
        query = query.filter(VMInstance.user_id == user_id)
    if challenge_id:
        query = query.filter(VMInstance.challenge_id == challenge_id)
    if status:
        query = query.filter(VMInstance.status == status)
    if provider:
        query = query.filter(VMInstance.provider == provider)
    
    results = query.order_by(VMInstance.created_at.desc()).all()
    
    # Format response
    instances = []
    for instance, user_email, challenge_name in results:
        instance_dict = {
            **instance.__dict__,
            "user_email": user_email,
            "challenge_name": challenge_name
        }
        instances.append(instance_dict)
    
    return instances


@router.get("/instances/{instance_id}/logs", response_model=List[ProvisioningLogResponse])
def get_instance_logs(
    instance_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get provisioning logs for a specific instance (Admin only)"""
    logs = db.query(ProvisioningLog).filter(
        ProvisioningLog.instance_id == instance_id
    ).order_by(ProvisioningLog.created_at.asc()).all()
    
    return logs


@router.get("/logs", response_model=List[ProvisioningLogResponse])
def list_all_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    instance_id: Optional[int] = Query(None, description="Filter by instance ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    limit: int = Query(100, description="Limit number of results")
):
    """List provisioning logs with filters (Admin only)"""
    query = db.query(ProvisioningLog)
    
    if instance_id:
        query = query.filter(ProvisioningLog.instance_id == instance_id)
    if event_type:
        query = query.filter(ProvisioningLog.event_type == event_type)
    if provider:
        query = query.filter(ProvisioningLog.provider == provider)
    
    logs = query.order_by(ProvisioningLog.created_at.desc()).limit(limit).all()
    return logs


@router.get("/stats")
def get_platform_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get platform statistics (Admin only)"""
    from sqlalchemy import func
    
    # Total users
    total_users = db.query(func.count(User.id)).scalar()
    
    # Total challenges
    total_challenges = db.query(func.count(Challenge.id)).scalar()
    active_challenges = db.query(func.count(Challenge.id)).filter(Challenge.is_active == True).scalar()
    
    # VM instances
    total_instances = db.query(func.count(VMInstance.id)).scalar()
    running_instances = db.query(func.count(VMInstance.id)).filter(VMInstance.status == 'running').scalar()
    expired_instances = db.query(func.count(VMInstance.id)).filter(VMInstance.status == 'expired').scalar()
    failed_instances = db.query(func.count(VMInstance.id)).filter(VMInstance.status == 'failed').scalar()
    
    # Provider usage
    provider_stats = db.query(
        VMInstance.provider,
        func.count(VMInstance.id).label('count')
    ).group_by(VMInstance.provider).all()
    
    # Recent failures
    recent_failures = db.query(func.count(ProvisioningLog.id)).filter(
        ProvisioningLog.event_type == 'error',
        ProvisioningLog.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
    ).scalar()
    
    # Fallback events today
    fallback_events = db.query(func.count(ProvisioningLog.id)).filter(
        ProvisioningLog.event_type == 'provider_fallback',
        ProvisioningLog.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
    ).scalar()
    
    return {
        "users": {
            "total": total_users
        },
        "challenges": {
            "total": total_challenges,
            "active": active_challenges
        },
        "instances": {
            "total": total_instances,
            "running": running_instances,
            "expired": expired_instances,
            "failed": failed_instances
        },
        "providers": {
            provider: count for provider, count in provider_stats
        },
        "today": {
            "failures": recent_failures,
            "fallbacks": fallback_events
        }
    }
