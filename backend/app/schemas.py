from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50, examples=["sam"])
    password: str = Field(min_length=6, max_length=128, examples=["sam12345"])


class UserLogin(BaseModel):
    username: str = Field(examples=["admin"])
    password: str = Field(examples=["admin123"])


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str


SHELVES = ("fiction", "fantasy", "history", "memoir", "science")


class BookWrite(BaseModel):
    title: str = Field(min_length=1, max_length=255, examples=["Circe"])
    author: str = Field(min_length=1, max_length=255, examples=["Madeline Miller"])
    isbn: str | None = Field(default=None, max_length=20, examples=["9780316556347"])
    genre: str = Field(default="fiction", examples=["fantasy"])
    description: str | None = Field(default=None, max_length=400)
    year: int | None = Field(default=None, ge=1000, le=2100)
    copies: int = Field(default=1, ge=1, le=20)


class BookCreate(BookWrite):
    pass


class BookUpdate(BookWrite):
    pass


class MyLoan(BaseModel):
    id: UUID
    due_at: datetime
    late: bool


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    author: str
    isbn: str | None
    genre: str
    description: str | None = None
    year: int | None = None
    copies: int
    available: int
    saved: bool = False
    my_loan: MyLoan | None = None
    created_at: datetime


class BookPage(BaseModel):
    items: list[BookOut]
    next_cursor: str | None


class BorrowRequest(BaseModel):
    book_id: UUID


class LoanOut(BaseModel):
    id: UUID
    book_id: UUID
    title: str
    author: str
    username: str | None = None
    borrowed_at: datetime
    due_at: datetime
    late: bool
