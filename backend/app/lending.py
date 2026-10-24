from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Book, Loan, SavedBook
from app.schemas import BookOut, MyLoan

LOAN_DAYS = 14  # two weeks, same for every loan


def as_utc(value: datetime) -> datetime:
    # sqlite often hands back a naive datetime
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def is_late(due_at: datetime) -> bool:
    return as_utc(due_at) < datetime.now(timezone.utc)


def due_on(start: datetime) -> datetime:
    return start + timedelta(days=LOAN_DAYS)


def annotate_books(db: Session, books: list[Book], user_id: str) -> list[BookOut]:
    if not books:
        return []

    ids = [book.id for book in books]
    uid = UUID(user_id)
    loans = (
        db.query(Loan)
        .filter(Loan.book_id.in_(ids), Loan.returned_at.is_(None))
        .all()
    )
    taken: dict[str, int] = {}
    mine: dict[str, Loan] = {}
    for loan in loans:
        key = str(loan.book_id)
        taken[key] = taken.get(key, 0) + 1
        if loan.user_id == uid:
            mine[key] = loan

    saved_ids = {
        str(row[0])
        for row in db.query(SavedBook.book_id).filter(
            SavedBook.user_id == uid,
            SavedBook.book_id.in_(ids),
        )
    }

    result = []
    for book in books:
        copies = book.copies or 1
        key = str(book.id)
        loan = mine.get(key)
        result.append(
            BookOut(
                id=book.id,
                title=book.title,
                author=book.author,
                isbn=book.isbn,
                genre=book.genre or "fiction",
                description=book.description,
                year=book.year,
                copies=copies,
                available=max(copies - taken.get(key, 0), 0),
                saved=key in saved_ids,
                my_loan=(
                    MyLoan(id=loan.id, due_at=loan.due_at, late=is_late(loan.due_at))
                    if loan
                    else None
                ),
                created_at=book.created_at,
            )
        )
    return result
