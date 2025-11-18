from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base
import enum


class ProvisioningEventType(str, enum.Enum):
    PROVISIONING_STARTED = "provisioning_started"
    PROVISIONING_SUCCESS = "provisioning_success"
    PROVISIONING_FAILED = "provisioning_failed"
    PROVIDER_FALLBACK = "provider_fallback"
    VM_STARTING = "vm_starting"
    VM_RUNNING = "vm_running"
    VM_STOPPING = "vm_stopping"
    VM_EXPIRED = "vm_expired"
    VM_DESTROYING = "vm_destroying"
    VM_DESTROYED = "vm_destroyed"
    ERROR = "error"


class ProvisioningLog(Base):
    __tablename__ = "provisioning_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    instance_id = Column(Integer, ForeignKey("vm_instances.id"), nullable=False, index=True)
    event_type = Column(Enum(ProvisioningEventType), nullable=False, index=True)
    provider = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    error_details = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    vm_instance = relationship("VMInstance", back_populates="provisioning_logs")
