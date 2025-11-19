from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.challenge import ChallengeResponse
from ..services.challenge_service import ChallengeService
from ..utils.auth import get_current_user
from ..models.user import UserRole

router = APIRouter(prefix="/api", tags=["challenges"])


@router.get("/challenges", response_model=List[ChallengeResponse])
def get_challenges(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get all available challenges"""
    if user.role == UserRole.ADMIN:
        challenges = ChallengeService.get_all_challenges(db)
    else:
        challenges = ChallengeService.get_user_challenges(db, user.id)
    return challenges
