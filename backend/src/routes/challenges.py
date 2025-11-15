from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.challenge import ChallengeResponse
from ..services.challenge_service import ChallengeService
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api", tags=["challenges"])


@router.get("/challenges", response_model=List[ChallengeResponse])
def get_challenges(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get all available challenges"""
    challenges = ChallengeService.get_all_challenges(db)
    return challenges
