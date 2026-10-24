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


# title, author, isbn, shelf, year, copies, one-line note
CATALOG = [
    ("1984", "George Orwell", "9780451524935", "fiction", 1949, 2, "A clerk starts to doubt the party that watches every room."),
    ("To Kill a Mockingbird", "Harper Lee", "9780061120084", "fiction", 1960, 1, "A child watches a trial in a small southern town."),
    ("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", "fiction", 1925, 1, "A summer on Long Island, told by the neighbor next door."),
    ("Pride and Prejudice", "Jane Austen", "9780141439518", "fiction", 1813, 1, "Two stubborn people take a long time to like each other."),
    ("The Hobbit", "J.R.R. Tolkien", "9780547928227", "fantasy", 1937, 3, "A quiet hobbit is talked into a burglary."),
    ("Harry Potter and the Sorcerer's Stone", "J.K. Rowling", "9780590353423", "fantasy", 1997, 2, "A boy finds out the cupboard was never the whole story."),
    ("Atomic Habits", "James Clear", "9780735211292", "science", 2018, 1, "Small daily changes, stacked until they stick."),
    ("Sapiens", "Yuval Noah Harari", "9780062316097", "history", 2011, 2, "A short tour of how humans ended up running the planet."),
    ("The Alchemist", "Paulo Coelho", "9780061122415", "fiction", 1988, 1, "A shepherd walks toward a dream he heard about a treasure."),
    ("Dune", "Frank Herbert", "9780441172719", "fiction", 1965, 1, "A desert planet, a family, and the spice everyone wants."),
    ("The Catcher in the Rye", "J.D. Salinger", "9780316769488", "fiction", 1951, 1, "A few days in New York after a boy leaves school."),
    ("Educated", "Tara Westover", "9780399590504", "memoir", 2018, 1, "A memoir about leaving home and learning to trust books."),
    ("Circe", "Madeline Miller", "9780316556347", "fantasy", 2018, 1, "The witch from the old story, told in her own voice."),
    ("Beloved", "Toni Morrison", "9781400033416", "fiction", 1987, 1, "A mother in Ohio lives with what slavery took from her."),
    ("Klara and the Sun", "Kazuo Ishiguro", "9780593318171", "fiction", 2021, 1, "An artificial friend watches the family that bought her."),
    ("Normal People", "Sally Rooney", "9781984822178", "fiction", 2018, 1, "Two classmates keep finding and losing each other."),
    ("The Midnight Library", "Matt Haig", "9780525559474", "fiction", 2020, 1, "A library where every book is another life she could have lived."),
    ("Pachinko", "Min Jin Lee", "9781455563937", "history", 2017, 1, "Four generations of a Korean family in Japan."),
]


def _add_missing_book_columns():
    # old sqlite file did not have these columns
    if not DATABASE_URL.startswith("sqlite"):
        return
    wanted = {
        "genre": "VARCHAR(40) DEFAULT 'fiction'",
        "description": "TEXT",
        "year": "INTEGER",
        "copies": "INTEGER DEFAULT 1",
    }
    with engine.begin() as conn:
        have = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(books)")}
        for name, ddl in wanted.items():
            if name not in have:
                conn.exec_driver_sql(f"ALTER TABLE books ADD COLUMN {name} {ddl}")


def seed_books():
    from app.models import Book

    db = SessionLocal()
    try:
        existing = {book.title: book for book in db.query(Book).all()}
        for title, author, isbn, genre, year, copies, note in CATALOG:
            book = existing.get(title)
            if book is None:
                db.add(
                    Book(
                        title=title,
                        author=author,
                        isbn=isbn,
                        genre=genre,
                        year=year,
                        copies=copies,
                        description=note,
                    )
                )
                continue
            # fill shelf info only when the old row has no description
            if book.description is None:
                book.genre = genre
                book.year = year
                book.copies = copies
                book.description = note
        db.commit()
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _add_missing_book_columns()
    seed_users()
    seed_books()
