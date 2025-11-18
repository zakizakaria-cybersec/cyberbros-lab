from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProvisioningLogCreate(BaseModel):
    instance_id: int
    event_type: str
    provider: Optional[str] = None
    message: str
    error_details: Optional[str] = None
    metadata: Optional[str] = None


class ProvisioningLogResponse(BaseModel):
    id: int
    instance_id: int
    event_type: str
    provider: Optional[str]
    message: str
    error_details: Optional[str]
    metadata: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
