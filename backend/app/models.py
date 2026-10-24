import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="user")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Book(Base):
    __tablename__ = "books"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    isbn: Mapped[str] = mapped_column(String(20), nullable=True)
    genre: Mapped[str] = mapped_column(String(40), default="fiction")
    description: Mapped[str] = mapped_column(String(400), nullable=True)
    year: Mapped[int] = mapped_column(Integer, nullable=True)
    copies: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    borrowed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    returned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)  # null means still out


class SavedBook(Base):
    __tablename__ = "saved_books"
    __table_args__ = (UniqueConstraint("user_id", "book_id"),)  # one save per person per title

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    book_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("books.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
