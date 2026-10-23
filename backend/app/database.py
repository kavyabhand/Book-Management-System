from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL
from app.security import hash_password

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_user(db, username: str, password: str, role: str):
    from app.models import User

    if db.query(User).filter(User.username == username).first():
        return
    db.add(
        User(
            username=username,
            password_hash=hash_password(password),
            role=role,
        )
    )


def seed_users():
    db = SessionLocal()
    try:
        _ensure_user(db, "admin", "admin123", "admin")
        _ensure_user(db, "reader", "reader123", "user")
        db.commit()
    finally:
        db.close()


def seed_books():
    from app.models import Book

    catalog = [
        ("1984", "George Orwell", "9780451524935"),
        ("To Kill a Mockingbird", "Harper Lee", "9780061120084"),
        ("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565"),
        ("Pride and Prejudice", "Jane Austen", "9780141439518"),
        ("The Hobbit", "J.R.R. Tolkien", "9780547928227"),
        ("Harry Potter and the Sorcerer's Stone", "J.K. Rowling", "9780590353423"),
        ("Atomic Habits", "James Clear", "9780735211292"),
        ("Sapiens", "Yuval Noah Harari", "9780062316097"),
        ("The Alchemist", "Paulo Coelho", "9780061122415"),
        ("Dune", "Frank Herbert", "9780441172719"),
        ("The Catcher in the Rye", "J.D. Salinger", "9780316769488"),
        ("Educated", "Tara Westover", "9780399590504"),
        ("Circe", "Madeline Miller", "9780316556347"),
        ("Beloved", "Toni Morrison", "9781400033416"),
        ("Klara and the Sun", "Kazuo Ishiguro", "9780593318171"),
        ("Normal People", "Sally Rooney", "9781984822178"),
        ("The Midnight Library", "Matt Haig", "9780525559474"),
        ("Pachinko", "Min Jin Lee", "9781455563937"),
    ]

    db = SessionLocal()
    try:
        existing = {title for (title,) in db.query(Book.title).all()}
        for title, author, isbn in catalog:
            if title in existing:
                continue
            db.add(Book(title=title, author=author, isbn=isbn))
        db.commit()
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    seed_users()
    seed_books()
