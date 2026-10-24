import base64
import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.security import HTTPBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.lending import annotate_books
from app.models import Book, Loan, SavedBook
from app.schemas import SHELVES, BookCreate, BookOut, BookPage, BookUpdate

# shows the authorize button in /docs; the jwt middleware still checks the token
router = APIRouter(
    prefix="/books",
    tags=["books"],
    dependencies=[Depends(HTTPBearer())],
)

MAX_LIMIT = 50
SORTS = ("newest", "title", "author")


def _encode_cursor(sort: str, key: str, book_id: UUID) -> str:
    payload = {"s": sort, "k": key, "id": str(book_id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_cursor(cursor: str) -> dict:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        data = json.loads(raw)
        if not {"s", "k", "id"} <= data.keys():
            raise ValueError("missing")
        return data
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="invalid cursor") from exc


def _sort_key(book: Book, sort: str) -> str:
    if sort == "title":
        return book.title
    if sort == "author":
        return book.author
    return book.created_at.isoformat()


def _apply_book(book: Book, payload: BookCreate | BookUpdate) -> None:
    if payload.genre not in SHELVES:
        raise HTTPException(status_code=400, detail="unknown shelf")
    book.title = payload.title
    book.author = payload.author
    book.isbn = payload.isbn
    book.genre = payload.genre
    book.description = payload.description
    book.year = payload.year
    book.copies = payload.copies


@router.get("", response_model=BookPage)
def list_books(
    request: Request,
    db: Session = Depends(get_db),
    limit: int = Query(default=10, ge=1, le=MAX_LIMIT),
    cursor: str | None = None,
    q: str | None = Query(default=None, max_length=100),
    genre: str | None = None,
    sort: str = Query(default="newest"),
):
    if sort not in SORTS:
        raise HTTPException(status_code=400, detail="unknown sort")
    if genre and genre not in SHELVES:
        raise HTTPException(status_code=400, detail="unknown shelf")

    query = db.query(Book)
    if genre:
        query = query.filter(Book.genre == genre)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Book.title.ilike(pattern), Book.author.ilike(pattern)))

    if sort == "title":
        query = query.order_by(Book.title.asc(), Book.id.asc())
    elif sort == "author":
        query = query.order_by(Book.author.asc(), Book.id.asc())
    else:
        query = query.order_by(Book.created_at.desc(), Book.id.desc())

    if cursor:
        data = _decode_cursor(cursor)
        # cursor is only valid for the same sort
        if data["s"] != sort:
            raise HTTPException(status_code=400, detail="cursor does not match sort")
        cursor_id = UUID(data["id"])
        key = data["k"]
        if sort == "newest":
            when = datetime.fromisoformat(key)
            query = query.filter(
                (Book.created_at < when)
                | ((Book.created_at == when) & (Book.id < cursor_id))
            )
        elif sort == "title":
            query = query.filter(
                (Book.title > key) | ((Book.title == key) & (Book.id > cursor_id))
            )
        else:
            query = query.filter(
                (Book.author > key) | ((Book.author == key) & (Book.id > cursor_id))
            )

    rows = query.limit(limit + 1).all()
    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1]
        next_cursor = _encode_cursor(sort, _sort_key(last, sort), last.id)
        rows = rows[:limit]

    return BookPage(
        items=annotate_books(db, rows, request.state.user_id),
        next_cursor=next_cursor,
    )


@router.get("/{book_id}", response_model=BookOut)
def get_book(book_id: UUID, request: Request, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")
    return annotate_books(db, [book], request.state.user_id)[0]


@router.post("", response_model=BookOut, status_code=201)
def create_book(payload: BookCreate, request: Request, db: Session = Depends(get_db)):
    book = Book()
    _apply_book(book, payload)
    db.add(book)
    db.commit()
    db.refresh(book)
    return annotate_books(db, [book], request.state.user_id)[0]


@router.put("/{book_id}", response_model=BookOut)
def update_book(
    book_id: UUID,
    payload: BookUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")
    active = (
        db.query(Loan)
        .filter(Loan.book_id == book.id, Loan.returned_at.is_(None))
        .count()
    )
    if payload.copies < active:
        raise HTTPException(status_code=400, detail="copies are lower than current loans")
    _apply_book(book, payload)
    db.commit()
    db.refresh(book)
    return annotate_books(db, [book], request.state.user_id)[0]


@router.delete("/{book_id}", status_code=204)
def delete_book(book_id: UUID, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="book not found")
    # sqlite will not cascade this for us
    db.query(Loan).filter(Loan.book_id == book.id).delete()
    db.query(SavedBook).filter(SavedBook.book_id == book.id).delete()
    db.delete(book)
    db.commit()
