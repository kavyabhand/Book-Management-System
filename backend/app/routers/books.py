import base64
import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Book
from app.schemas import BookCreate, BookOut, BookPage, BookUpdate

router = APIRouter(prefix="/books", tags=["books"])

MAX_LIMIT = 50


def _encode_cursor(created_at: datetime, book_id: UUID) -> str:
    payload = {"t": created_at.isoformat(), "id": str(book_id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, UUID]:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        data = json.loads(raw)
        return datetime.fromisoformat(data["t"]), UUID(data["id"])
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="invalid cursor") from exc


@router.get("", response_model=BookPage)
def list_books(
    db: Session = Depends(get_db),
    limit: int = Query(default=10, ge=1, le=MAX_LIMIT),
    cursor: str | None = None,
    q: str | None = Query(default=None, max_length=100),
):
    query = db.query(Book)

    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(Book.title.ilike(pattern), Book.author.ilike(pattern))
        )

    query = query.order_by(Book.created_at.desc(), Book.id.desc())

    if cursor:
        cursor_time, cursor_id = _decode_cursor(cursor)
        query = query.filter(
            (Book.created_at < cursor_time)
            | ((Book.created_at == cursor_time) & (Book.id < cursor_id))
        )

    rows = query.limit(limit + 1).all()
    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1]
        next_cursor = _encode_cursor(last.created_at, last.id)
        rows = rows[:limit]

    return BookPage(items=rows, next_cursor=next_cursor)


@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: UUID, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")
    return book


@router.post("", response_model=BookOut, status_code=201)
def create_book(payload: BookCreate, db: Session = Depends(get_db)):
    book = Book(title=payload.title, author=payload.author, isbn=payload.isbn)
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.put("/{book_id}", response_model=BookOut)
def update_book(book_id: UUID, payload: BookUpdate, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")
    book.title = payload.title
    book.author = payload.author
    book.isbn = payload.isbn
    db.commit()
    db.refresh(book)
    return book


@router.delete("/{book_id}", status_code=204)
def delete_book(book_id: UUID, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")
    db.delete(book)
    db.commit()
