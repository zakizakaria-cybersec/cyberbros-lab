from pydantic import BaseModel


class ChallengeResponse(BaseModel):
    id: int
    name: str
    description: str
    difficulty: str
    cpu_count: int
    memory_gb: int
    
    class Config:
        from_attributes = True
