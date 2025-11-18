from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ...models import Challenge
from ...schemas import ChallengeCreate, ChallengeUpdate, ChallengeResponse
from ...utils.auth import get_current_admin_user
from ...models.user import User

router = APIRouter(prefix="/api/admin/challenges", tags=["admin-challenges"])


@router.post("", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
def create_challenge(
    challenge_data: ChallengeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Create a new challenge (Admin only)"""
    challenge = Challenge(
        **challenge_data.dict(),
        created_by=admin.id
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


@router.get("", response_model=List[ChallengeResponse])
def list_all_challenges(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    include_inactive: bool = True
):
    """List all challenges including inactive ones (Admin only)"""
    query = db.query(Challenge)
    if not include_inactive:
        query = query.filter(Challenge.is_active == True)
    return query.all()


@router.get("/{challenge_id}", response_model=ChallengeResponse)
def get_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get challenge details (Admin only)"""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    return challenge


@router.put("/{challenge_id}", response_model=ChallengeResponse)
def update_challenge(
    challenge_id: int,
    challenge_data: ChallengeUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Update a challenge (Admin only)"""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Update only provided fields
    update_data = challenge_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(challenge, field, value)
    
    db.commit()
    db.refresh(challenge)
    return challenge


@router.delete("/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Delete a challenge (Admin only)"""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    db.delete(challenge)
    db.commit()
    return None


@router.post("/{challenge_id}/activate", response_model=ChallengeResponse)
def activate_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Activate a challenge (Admin only)"""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    challenge.is_active = True
    db.commit()
    db.refresh(challenge)
    return challenge


@router.post("/{challenge_id}/deactivate", response_model=ChallengeResponse)
def deactivate_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Deactivate a challenge (Admin only)"""
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    challenge.is_active = False
    db.commit()
    db.refresh(challenge)
    return challenge
