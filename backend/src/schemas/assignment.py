from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class AssignmentCreate(BaseModel):
    user_id: int
    challenge_id: int
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None


class BulkAssignmentCreate(BaseModel):
    """Bulk assignment creation for assigning challenges to multiple users"""
    user_ids: List[int]
    challenge_id: int
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None


class AssignmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None


class AssignmentResponse(BaseModel):
    id: int
    user_id: int
    challenge_id: int
    assigned_by: int
    status: str
    assigned_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    expires_at: Optional[datetime]
    notes: Optional[str]
    
    class Config:
        from_attributes = True


class AssignmentWithDetails(AssignmentResponse):
    user_email: str
    challenge_name: str
    admin_email: str
    
    class Config:
        from_attributes = True


class UserAssignmentDetail(BaseModel):
    """User-facing assignment with challenge details and VM status"""
    id: int
    challenge_id: int
    challenge_name: str
    challenge_description: str
    challenge_difficulty: str
    challenge_duration_hours: int
    status: str
    assigned_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    expires_at: Optional[datetime]
    notes: Optional[str]
    has_active_vm: bool = False
    vm_instance_id: Optional[int] = None
    vm_status: Optional[str] = None
    vm_public_ip: Optional[str] = None
    vm_expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
