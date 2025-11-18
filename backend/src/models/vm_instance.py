from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base


class VMStatus(str, enum.Enum):
    PROVISIONING = "provisioning"
    RUNNING = "running"
    EXPIRED = "expired"
    DESTROYING = "destroying"
    DESTROYED = "destroyed"
    FAILED = "failed"


class VMInstance(Base):
    __tablename__ = "vm_instances"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True, index=True)
    
    # Cloud provider details
    instance_id = Column(String, unique=True, nullable=True)
    provider = Column(String, default="hetzner", nullable=False)
    public_ip = Column(String, nullable=True)
    server_type = Column(String, nullable=True)
    location = Column(String, nullable=True)
    
    # Access credentials (encrypted)
    ssh_username = Column(String, default="root")
    ssh_password_encrypted = Column(Text, nullable=True)
    ssh_private_key_encrypted = Column(Text, nullable=True)
    
    # Lifecycle
    status = Column(SQLEnum(VMStatus), default=VMStatus.PROVISIONING, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    destroyed_at = Column(DateTime, nullable=True)
    
    # Flag for credentials access (one-time display)
    credentials_accessed = Column(Integer, default=False)
    credentials_accessed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="vm_instances")
    challenge = relationship("Challenge", back_populates="vm_instances")
    assignment = relationship("Assignment", back_populates="instances")
    provisioning_logs = relationship("ProvisioningLog", back_populates="vm_instance", cascade="all, delete-orphan")
