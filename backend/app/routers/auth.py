import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RefreshToken, User
from app.schemas import RefreshRequest, TokenResponse, UserLogin, UserRegister
from app.security import (
    create_access_token,
    hash_password,
    refresh_token_expiry,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="username taken")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_tokens(db, user)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    return _issue_tokens(db, user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == payload.refresh_token)
        .first()
    )
    if not record:
        raise HTTPException(status_code=401, detail="invalid refresh token")

    now = datetime.now(timezone.utc)
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(status_code=401, detail="invalid refresh token")

    user = db.get(User, record.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="invalid refresh token")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=record.token,
        role=user.role,
    )


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    refresh_value = secrets.token_urlsafe(32)
    db.add(
        RefreshToken(
            token=refresh_value,
            user_id=user.id,
            expires_at=refresh_token_expiry(),
        )
    )
    db.commit()
    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=refresh_value,
        role=user.role,
    )
