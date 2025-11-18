from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class VMStartRequest(BaseModel):
    challenge_id: int


class VMResetRequest(BaseModel):
    instance_id: int


class VMCredentialsResponse(BaseModel):
    """One-time credentials display"""
    ssh_username: str
    ssh_password: str
    ssh_private_key: Optional[str] = None
    public_ip: str
    message: str = "These credentials are shown only once. Please save them securely."


class VMStatusResponse(BaseModel):
    """VM status without sensitive credentials"""
    id: int
    challenge_id: int
    status: str
    public_ip: Optional[str]
    ssh_username: str
    created_at: datetime
    started_at: Optional[datetime]
    expires_at: datetime
    time_remaining_seconds: int
    provider: str
    credentials_accessed: bool
    
    class Config:
        from_attributes = True


class VMInstanceResponse(BaseModel):
    """Full VM instance details (admin view)"""
    id: int
    user_id: int
    challenge_id: int
    assignment_id: Optional[int]
    instance_id: Optional[str]
    provider: str
    public_ip: Optional[str]
    ssh_username: str
    status: str
    created_at: datetime
    started_at: Optional[datetime]
    expires_at: datetime
    destroyed_at: Optional[datetime]
    server_type: Optional[str]
    location: Optional[str]
    credentials_accessed: bool
    credentials_accessed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class VMInstanceWithDetails(VMInstanceResponse):
    """VM instance with user and challenge details"""
    user_email: str
    challenge_name: str
    
    class Config:
        from_attributes = True
