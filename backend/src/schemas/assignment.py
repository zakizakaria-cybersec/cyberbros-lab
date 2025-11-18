from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AssignmentCreate(BaseModel):
    user_id: int
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
