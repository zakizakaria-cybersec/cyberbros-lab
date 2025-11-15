from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base


class VMStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    EXPIRED = "expired"
    FAILED = "failed"


class VMInstance(Base):
    __tablename__ = "vm_instances"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.id"), nullable=False)
    
    # Cloud provider details
    instance_id = Column(String, unique=True, nullable=True)
    public_ip = Column(String, nullable=True)
    
    # Access credentials
    ssh_username = Column(String, default="root")
    ssh_password = Column(String, nullable=True)
    ssh_key = Column(Text, nullable=True)
    
    # Lifecycle
    status = Column(SQLEnum(VMStatus), default=VMStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    destroyed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="vm_instances")
    challenge = relationship("Challenge", back_populates="vm_instances")
