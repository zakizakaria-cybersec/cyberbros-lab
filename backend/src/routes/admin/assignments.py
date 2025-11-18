from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ...database import get_db
from ...models import Assignment, User, Challenge, AssignmentStatus
from ...schemas import AssignmentCreate, AssignmentUpdate, AssignmentResponse, AssignmentWithDetails, BulkAssignmentCreate
from ...utils.auth import get_current_admin_user

router = APIRouter(prefix="/api/admin/assignments", tags=["admin-assignments"])


@router.post("", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    assignment_data: AssignmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Assign a challenge to a user (Admin only)"""
    # Verify user exists
    user = db.query(User).filter(User.id == assignment_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify challenge exists
    challenge = db.query(Challenge).filter(Challenge.id == assignment_data.challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Check for existing active assignment
    existing = db.query(Assignment).filter(
        Assignment.user_id == assignment_data.user_id,
        Assignment.challenge_id == assignment_data.challenge_id,
        Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS])
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active assignment for this challenge"
        )
    
    assignment = Assignment(
        **assignment_data.dict(),
        assigned_by=admin.id
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/bulk", response_model=List[AssignmentResponse], status_code=status.HTTP_201_CREATED)
def bulk_create_assignments(
    bulk_data: BulkAssignmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Assign a challenge to multiple users at once (Admin only)"""
    # Verify challenge exists
    challenge = db.query(Challenge).filter(Challenge.id == bulk_data.challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found"
        )
    
    # Verify all users exist
    users = db.query(User).filter(User.id.in_(bulk_data.user_ids)).all()
    found_user_ids = {user.id for user in users}
    missing_user_ids = set(bulk_data.user_ids) - found_user_ids
    
    if missing_user_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Users not found: {', '.join(map(str, missing_user_ids))}"
        )
    
    created_assignments = []
    skipped_users = []
    
    for user_id in bulk_data.user_ids:
        # Check for existing active assignment
        existing = db.query(Assignment).filter(
            Assignment.user_id == user_id,
            Assignment.challenge_id == bulk_data.challenge_id,
            Assignment.status.in_([AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS])
        ).first()
        
        if existing:
            skipped_users.append(user_id)
            continue
        
        assignment = Assignment(
            user_id=user_id,
            challenge_id=bulk_data.challenge_id,
            notes=bulk_data.notes,
            expires_at=bulk_data.expires_at,
            assigned_by=admin.id
        )
        db.add(assignment)
        created_assignments.append(assignment)
    
    if created_assignments:
        db.commit()
        for assignment in created_assignments:
            db.refresh(assignment)
    
    return created_assignments


@router.get("", response_model=List[AssignmentWithDetails])
def list_assignments(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    challenge_id: Optional[int] = Query(None, description="Filter by challenge ID"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """List all assignments with filters (Admin only)"""
    query = db.query(
        Assignment,
        User.email.label("user_email"),
        Challenge.name.label("challenge_name"),
        User.email.label("admin_email")
    ).join(
        User, Assignment.user_id == User.id
    ).join(
        Challenge, Assignment.challenge_id == Challenge.id
    ).join(
        User, Assignment.assigned_by == User.id, isouter=True
    )
    
    if user_id:
        query = query.filter(Assignment.user_id == user_id)
    if challenge_id:
        query = query.filter(Assignment.challenge_id == challenge_id)
    if status:
        query = query.filter(Assignment.status == status)
    
    results = query.all()
    
    # Format response
    assignments = []
    for assignment, user_email, challenge_name, admin_email in results:
        assignment_dict = {
            **assignment.__dict__,
            "user_email": user_email,
            "challenge_name": challenge_name,
            "admin_email": admin_email
        }
        assignments.append(assignment_dict)
    
    return assignments


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get assignment details (Admin only)"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    return assignment


@router.put("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: int,
    assignment_data: AssignmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Update an assignment (Admin only)"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Update only provided fields
    update_data = assignment_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assignment, field, value)
    
    # Update completed_at if status changed to completed
    if assignment_data.status == AssignmentStatus.COMPLETED.value and not assignment.completed_at:
        assignment.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Delete an assignment (Admin only)"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    db.delete(assignment)
    db.commit()
    return None
