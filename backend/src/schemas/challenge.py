from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ChallengeCreate(BaseModel):
    name: str
    description: str
    snapshot_id: str
    difficulty: str = "beginner"
    cpu_count: int = 2
    memory_gb: int = 4
    duration_hours: int = 2


class ChallengeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    snapshot_id: Optional[str] = None
    difficulty: Optional[str] = None
    cpu_count: Optional[int] = None
    memory_gb: Optional[int] = None
    duration_hours: Optional[int] = None
    is_active: Optional[bool] = None


class ChallengeResponse(BaseModel):
    id: int
    name: str
    description: str
    snapshot_id: str
    difficulty: str
    cpu_count: int
    memory_gb: int
    duration_hours: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChallengeListResponse(BaseModel):
    """Simplified response for listing challenges (user view)"""
    id: int
    name: str
    description: str
    difficulty: str
    duration_hours: int
    
    class Config:
        from_attributes = True
