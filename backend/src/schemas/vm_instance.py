from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class VMStartRequest(BaseModel):
    challenge_id: int


class VMInstanceResponse(BaseModel):
    id: int
    challenge_id: int
    instance_id: Optional[str]
    public_ip: Optional[str]
    ssh_username: str
    ssh_password: Optional[str]
    status: str
    created_at: datetime
    expires_at: datetime
    time_remaining_seconds: Optional[int] = None
    
    class Config:
        from_attributes = True
