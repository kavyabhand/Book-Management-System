from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.lending import annotate_books
from app.models import Book, SavedBook
from app.schemas import BookOut

router = APIRouter(
    prefix="/saved",
    tags=["saved"],
    dependencies=[Depends(HTTPBearer())],
)


@router.get("", response_model=list[BookOut], summary="this person's reading list")
def list_saved(request: Request, db: Session = Depends(get_db)):
    uid = UUID(request.state.user_id)
    rows = (
        db.query(Book)
        .join(SavedBook, SavedBook.book_id == Book.id)
        .filter(SavedBook.user_id == uid)
        .order_by(SavedBook.created_at.desc())
        .all()
    )
    return annotate_books(db, rows, request.state.user_id)


@router.post("/{book_id}", response_model=BookOut, summary="save a title for later")
def save_book(book_id: UUID, request: Request, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")

    uid = UUID(request.state.user_id)
    existing = (
        db.query(SavedBook)
        .filter(SavedBook.user_id == uid, SavedBook.book_id == book_id)
        .first()
    )
    if not existing:
        db.add(SavedBook(user_id=uid, book_id=book_id))
        db.commit()
    return annotate_books(db, [book], request.state.user_id)[0]


@router.delete("/{book_id}", status_code=204, summary="take a title off the reading list")
def unsave_book(book_id: UUID, request: Request, db: Session = Depends(get_db)):
    uid = UUID(request.state.user_id)
    row = (
        db.query(SavedBook)
        .filter(SavedBook.user_id == uid, SavedBook.book_id == book_id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
