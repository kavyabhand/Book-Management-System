from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.lending import due_on, is_late
from app.models import Book, Loan, User
from app.schemas import BorrowRequest, LoanOut

router = APIRouter(
    prefix="/loans",
    tags=["loans"],
    dependencies=[Depends(HTTPBearer())],
)


def _out(db: Session, loan: Loan, with_user: bool) -> LoanOut:
    book = db.get(Book, loan.book_id)
    username = None
    if with_user:
        user = db.get(User, loan.user_id)
        username = user.username if user else None
    return LoanOut(
        id=loan.id,
        book_id=loan.book_id,
        title=book.title if book else "",
        author=book.author if book else "",
        username=username,
        borrowed_at=loan.borrowed_at,
        due_at=loan.due_at,
        late=is_late(loan.due_at),
    )


@router.get("/mine", response_model=list[LoanOut], summary="books this person has out")
def my_loans(request: Request, db: Session = Depends(get_db)):
    rows = (
        db.query(Loan)
        .filter(Loan.user_id == UUID(request.state.user_id), Loan.returned_at.is_(None))
        .order_by(Loan.due_at.asc())
        .all()
    )
    return [_out(db, row, with_user=False) for row in rows]


@router.get("", response_model=list[LoanOut], summary="every book currently out")
def all_loans(request: Request, db: Session = Depends(get_db)):
    if request.state.role != "admin":
        raise HTTPException(status_code=403, detail="admin role required")
    rows = (
        db.query(Loan)
        .filter(Loan.returned_at.is_(None))
        .order_by(Loan.due_at.asc())
        .all()
    )
    return [_out(db, row, with_user=True) for row in rows]


@router.post("", response_model=LoanOut, status_code=201, summary="borrow one copy")
def borrow(payload: BorrowRequest, request: Request, db: Session = Depends(get_db)):
    book = db.get(Book, payload.book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")

    uid = UUID(request.state.user_id)
    already = (
        db.query(Loan)
        .filter(
            Loan.book_id == book.id,
            Loan.user_id == uid,
            Loan.returned_at.is_(None),
        )
        .first()
    )
    if already:
        raise HTTPException(status_code=400, detail="you already have this title")

    out_now = (
        db.query(Loan)
        .filter(Loan.book_id == book.id, Loan.returned_at.is_(None))
        .count()
    )
    if out_now >= (book.copies or 1):
        raise HTTPException(status_code=400, detail="no copies in")

    now = datetime.now(timezone.utc)
    loan = Loan(
        book_id=book.id,
        user_id=uid,
        borrowed_at=now,
        due_at=due_on(now),
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return _out(db, loan, with_user=False)


@router.post("/{loan_id}/return", response_model=LoanOut, summary="bring a copy back")
def return_loan(loan_id: UUID, request: Request, db: Session = Depends(get_db)):
    loan = db.get(Loan, loan_id)
    if not loan or loan.returned_at is not None:
        raise HTTPException(status_code=404, detail="loan not found")

    # borrower or librarian
    if str(loan.user_id) != request.state.user_id and request.state.role != "admin":
        raise HTTPException(status_code=403, detail="not your loan")

    loan.returned_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(loan)
    return _out(db, loan, with_user=request.state.role == "admin")
