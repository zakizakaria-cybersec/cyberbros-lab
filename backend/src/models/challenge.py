from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from ..database import Base


class Challenge(Base):
    __tablename__ = "challenges"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    snapshot_id = Column(String, nullable=False)
    difficulty = Column(String, default="medium")
    cpu_count = Column(Integer, default=2)
    memory_gb = Column(Integer, default=4)
    
    # Relationships
    vm_instances = relationship("VMInstance", back_populates="challenge")
