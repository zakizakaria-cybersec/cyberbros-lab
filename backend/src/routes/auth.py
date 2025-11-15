from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.user import UserCreate, UserLogin, UserResponse, Token
from ..services.auth_service import AuthService
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    user = AuthService.register_user(db, user_data)
    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token"""
    user = AuthService.authenticate_user(db, credentials.email, credentials.password)
    token = AuthService.create_user_token(user)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(user = Depends(get_current_user)):
    """Get current user information"""
    return user
