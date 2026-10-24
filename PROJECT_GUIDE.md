# Book Management System — full project guide

This file is a walkthrough of the repo as it exists right now. It is meant to be enough to explain any file, any request, and any screen.

The short README at the root only covers how to start the servers. This guide covers how the code works.

Nothing here is deployed. There is no EC2, no RDS instance, and no GitHub Actions. The database in use is a local SQLite file. The code is written so a Postgres URL can be dropped in later.

---

## 1. What the project is

A small library catalog with two kinds of account.

- A **librarian** (database role `admin`) can list, search, add, edit, and delete books, and can see every loan.
- A **reader** (database role `user`) can list, search, borrow, return their own copies, and keep a reading list. Create, update, and delete are rejected.

The app name on screen is **bookstack**. The Expo app name is **Book Management System**.

### Required features, and where they live

| Feature | Where it is implemented |
|---|---|
| Full CRUD for books | `backend/app/routers/books.py`. The catalog uses list, create, update, and delete. The book page uses get-one. |
| RBAC in middleware | `backend/app/middleware/auth_rbac.py`, class `RBACMiddleware`. Book writes only. Loan “see everyone” is checked inside `loans.py`. |
| JWT access token + refresh token | Access token: `backend/app/security.py`. Refresh token: `backend/app/routers/auth.py` plus the `refresh_tokens` table. |
| Cursor pagination | `list_books` in `backend/app/routers/books.py`. The UI asks for 8 books at a time and shows a “show more” button. The cursor includes the current sort. |
| Debounced search | `frontend/src/hooks/useDebouncedValue.ts`, used in `HomeScreen.tsx` with a 400 ms delay. |
| Shelves | `genre` on `books`. Filter chips on the catalog. Allowed values live in `SHELVES` in `schemas.py`: fiction, fantasy, history, memoir, science. |
| Copies, borrow, return, due date | `loans` table and `backend/app/routers/loans.py`. `backend/app/lending.py` sets the due date 14 days out and marks a loan late. |
| Reading list | `saved_books` table and `backend/app/routers/saved.py`. Saving does not take a copy. |
| Sort | Query param `sort` is `newest`, `title`, or `author`. |

### Stack

| Layer | What is actually used |
|---|---|
| UI | React 19, React Native 0.86, Expo SDK 57, React Native Web. One codebase for phone, web, and desktop. |
| API | Python, FastAPI 0.115.6, served by Uvicorn 0.34.0. |
| Database access | SQLAlchemy 2.0.36. Models are Python classes. There is no raw SQL in the routers. |
| Local database | SQLite file `backend/bms.db`. |
| Later database | `psycopg2-binary` is installed so `DATABASE_URL` can be a Postgres URL (the shape AWS RDS would use). It is not connected to RDS. |
| Auth | `bcrypt` for passwords. `python-jose` for the access JWT. Refresh tokens are random strings, not JWTs. |
| Version control | Git. Remote is whatever `origin` points at. This guide does not change git history. |

---

## 2. How a request moves through the app

Example: the librarian adds a book.

1. `HomeScreen` calls `createBook` in `frontend/src/api/books.ts`.
2. That calls `apiFetch("/books", { method: "POST", body })` in `frontend/src/api/client.ts`.
3. `apiFetch` reads `bms_access_token` from session storage and sets `Authorization: Bearer <token>`.
4. The browser sends `POST http://127.0.0.1:8000/books`.
5. FastAPI middleware runs in this order (outermost first):
   - `CORSMiddleware` — allows the browser to call the API.
   - `JWTAuthMiddleware` — checks the bearer token and stores `user_id` and `role` on `request.state`.
   - `RBACMiddleware` — if the method is POST, PUT, or DELETE on `/books`, the role must be `admin`.
6. `create_book` in `books.py` inserts a row and returns the book as JSON.
7. The screen clears the form and reloads the first page.

A reader doing the same POST gets **403** with `{"detail": "admin role required"}` from the RBAC middleware. The route function never runs.

Why middleware is added in that order in `main.py`: Starlette runs the **last added** middleware first. CORS is added last, so it is outermost. Error responses from JWT (401) and RBAC (403) still pass back through CORS and get the headers the browser needs. JWT is outside RBAC, so the role is already on `request.state` when RBAC reads it.

---

## 3. Folder tree (source only)

Generated folders are not part of the design. They appear after you install and run.

```
bms/
├── .gitignore
├── README.md                  short start instructions
├── PROJECT_GUIDE.md           this file
├── backend/
│   ├── .env.example           sample DATABASE_URL, not loaded automatically
│   ├── requirements.txt       pinned Python packages
│   ├── bms.db                 local SQLite database (gitignored)
│   ├── .venv/                 virtualenv (gitignored)
│   └── app/
│       ├── __init__.py        empty, marks app as a package
│       ├── main.py            FastAPI app, middleware, routers
│       ├── config.py          env settings
│       ├── database.py        engine, sessions, seed data
│       ├── models.py          users, refresh_tokens, books
│       ├── schemas.py         request and response shapes
│       ├── security.py        bcrypt and JWT
│       ├── lending.py         due date, late check, book extras for the response
│       ├── middleware/
│       │   ├── __init__.py    empty
│       │   └── auth_rbac.py   JWT check and role check
│       └── routers/
│           ├── __init__.py    empty
│           ├── auth.py        register, login, refresh
│           ├── books.py       CRUD, shelves, sort, cursor pages
│           ├── loans.py       borrow, return, my loans, all loans
│           └── saved.py       reading list
└── frontend/
    ├── .gitignore
    ├── LICENSE                Expo's MIT license from the template
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── app.json               Expo name, icons, orientation
    ├── index.ts               registers the root component
    ├── App.tsx                login, then catalog / book / loans / saved
    ├── assets/                default Expo icons and favicon
    └── src/
        ├── config.ts          API base URL
        ├── theme.ts           colors, type, shadows
        ├── api/
        │   ├── auth.ts        login and register
        │   ├── books.ts       book HTTP calls
        │   ├── loans.ts       borrow, return, loan lists
        │   ├── saved.ts       reading list
        │   └── client.ts      bearer token, refresh retry, readBody
        ├── storage/
        │   └── session.ts     sessionStorage on web, memory elsewhere
        ├── types/
        │   ├── book.ts        Book, shelves, sort
        │   └── loan.ts        Loan
        ├── format.ts          short dates on cards
        ├── hooks/
        │   └── useDebouncedValue.ts
        ├── components/
        │   ├── BookCover.tsx
        │   ├── BookRow.tsx
        │   └── TopBar.tsx     dark library band, role, tabs
        └── screens/
            ├── LoginScreen.tsx
            ├── HomeScreen.tsx
            ├── BookScreen.tsx
            ├── LoansScreen.tsx
            └── SavedScreen.tsx
```

Also created when you run the tools, and not source:

- `backend/.venv/` — Python packages.
- `backend/app/**/__pycache__/` — compiled Python.
- `frontend/node_modules/` — JavaScript packages.
- `frontend/.expo/` — Expo cache.

`.gitignore` at the repo root ignores `__pycache__`, `.venv`, `.env`, `*.db`, `.DS_Store`, `node_modules`, and `.expo`. The SQLite file is local only. It is not committed.

---

## 4. How to run it

Backend, from `backend/`:

```bash
python3 -m venv .venv
source .venv/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health → `{"status": "ok"}`

Frontend, from `frontend/`:

```bash
npm install
npm start
```

Web UI: http://localhost:8081

The API URL is hardcoded in `frontend/src/config.ts` as `http://127.0.0.1:8000`. A phone on the same Wi‑Fi cannot use `127.0.0.1` (that is the phone itself). For a device, change `API_URL` to the computer’s LAN address, for example `http://192.168.1.11:8000`. Android emulator often uses `http://10.0.2.2:8000`.

Start the backend first. The UI has nothing to show if the API is down.

### Seeded logins

Created on startup if those usernames are missing. Passwords are stored only as bcrypt hashes.

| Username | Password | Database role | On screen |
|---|---|---|---|
| admin | admin123 | `admin` | librarian |
| reader | reader123 | `user` | reader |

Register always creates role `user`. There is no way in the API to register an admin.

---

## 5. Database

Engine and session live in `backend/app/database.py`.

- `DATABASE_URL` defaults to `sqlite:///./bms.db`. The path is relative to the process working directory. Uvicorn is started inside `backend/`, so the file is `backend/bms.db`.
- SQLite connections get `check_same_thread: False` because FastAPI may touch the connection from more than one thread. Postgres does not get that argument.
- `SessionLocal` is a session factory. `get_db()` opens a session, yields it to the route, and always closes it.
- `Base` is the SQLAlchemy declarative base. Every model inherits from it.
- `init_db()` runs once at startup from `main.py`’s lifespan:
  1. `Base.metadata.create_all` creates missing tables. It does **not** alter columns on tables that already exist.
  2. `_add_missing_book_columns()` is a small SQLite-only fix: if `books` is missing `genre`, `description`, `year`, or `copies`, it `ALTER TABLE`s them in. Postgres is not given this helper.
  3. `seed_users()` inserts `admin` and `reader` if those usernames are absent.
  4. `seed_books()` inserts any catalog title that is not already in `books`. If an old row has no description, it fills genre, year, copies, and the one-line note. It does not overwrite a description you already saved.

`create_all` imports `app.models` so the model classes are registered on `Base` before the tables are created. The import is inside the function to avoid a circular import (`models` imports `Base` from `database`).

### Table `users`

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key. Generated in Python with `uuid.uuid4`, not by the database. |
| username | string, max 50 | Unique, indexed. |
| password_hash | string, max 255 | bcrypt hash. Never the raw password. |
| role | string, max 20 | `"admin"` or `"user"`. Default `"user"`. |

### Table `refresh_tokens`

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key. |
| token | string, max 64 | Unique, indexed. Random URL-safe string, not a JWT. |
| user_id | UUID | Foreign key to `users.id`, declared `ON DELETE CASCADE`. |
| expires_at | timestamptz | 7 days from when the token was issued. |

SQLite does not enforce foreign keys unless `PRAGMA foreign_keys = ON`. This project does not set that pragma. On the local file, deleting a user may leave refresh-token rows behind. On Postgres (RDS), the same model would cascade.

### Table `books`

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key. |
| title | string, max 255 | Required. |
| author | string, max 255 | Required. |
| isbn | string, max 20 | Optional. |
| genre | string, max 40 | Shelf. One of fiction, fantasy, history, memoir, science. Default `fiction`. |
| description | string, max 400 | Optional one-line note. |
| year | integer | Optional publication year. |
| copies | integer | How many physical copies. Default 1. Minimum 1 in the API. |
| created_at | timestamptz | `server_default=func.now()`. “Newest” sort uses this. |

Books are not owned by a user. There is no `user_id` on `books`. Who has a copy out lives in `loans`.

### Table `loans`

One row is one copy that someone took.

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key. |
| book_id | UUID | Which title. Indexed. |
| user_id | UUID | Who borrowed it. Indexed. |
| borrowed_at | timestamptz | Set in Python when they borrow. |
| due_at | timestamptz | `borrowed_at` plus 14 days. The 14 is `LOAN_DAYS` in `lending.py`. |
| returned_at | timestamptz, null | Null means the copy is still out. That is how “available” is counted. |

A person cannot have two open loans for the same title. Available copies are `copies` minus rows for that book where `returned_at` is null. A loan is late when `due_at` is in the past and `returned_at` is still null. Late is calculated when you read the loan, not stored as its own column.

The borrower or an admin can return it. Returning sets `returned_at` to now.

### Table `saved_books`

| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key. |
| user_id | UUID | Indexed. |
| book_id | UUID | Indexed. |
| created_at | timestamptz | When they saved it. |

Unique on `(user_id, book_id)`. Saving does not change `available`.

Deleting a book also deletes its loan rows and saved rows in the delete route. SQLite will not do that from the foreign key alone, so `delete_book` deletes those rows first.

`models.py` imports `relationship` and does not use it. There is no SQLAlchemy `relationship()` between users and tokens or users and books. The link is only the foreign-key column.

### Seeded titles

1984, To Kill a Mockingbird, The Great Gatsby, Pride and Prejudice, The Hobbit, Harry Potter and the Sorcerer's Stone, Atomic Habits, Sapiens, The Alchemist, Dune, The Catcher in the Rye, Educated, Circe, Beloved, Klara and the Sun, Normal People, The Midnight Library, Pachinko.

Seeding skips a title that is already present, so restarting the server does not duplicate them.

### Useful SQL while demoing

From `backend/`:

```bash
sqlite3 bms.db "SELECT username, role FROM users;"
sqlite3 bms.db "SELECT title, genre, copies FROM books ORDER BY created_at DESC;"
sqlite3 bms.db "SELECT book_id, user_id, due_at, returned_at FROM loans;"
sqlite3 bms.db "SELECT user_id, book_id FROM saved_books;"
sqlite3 bms.db "SELECT token, user_id, expires_at FROM refresh_tokens;"
```

`password_hash` is a bcrypt string starting with `$2b$`. You cannot read the password back out of it.

---

## 6. Backend, file by file

### `backend/requirements.txt`

| Package | Why it is here |
|---|---|
| fastapi==0.115.6 | The web framework. Routes, validation, JSON, docs. |
| uvicorn[standard]==0.34.0 | ASGI server. The `[standard]` extra adds reload, watchfiles, and related tools. |
| sqlalchemy==2.0.36 | ORM and the query API (`select` style is not used; the code uses `db.query` / `db.get`). |
| python-jose[cryptography]==3.3.0 | Encodes and decodes the access JWT. The cryptography extra supplies the crypto backend. |
| bcrypt==4.2.0 | Password hashing. |
| psycopg2-binary==2.9.10 | Postgres driver. Unused while `DATABASE_URL` is SQLite. |

There is no Alembic. New tables come from `create_all`. The extra book columns on an old SQLite file come from `_add_missing_book_columns()`.

### `backend/.env.example`

One line:

```
DATABASE_URL=sqlite:///./bms.db
```

The comment says a Postgres URL would look like `postgresql://user:pass@host:5432/dbname`.

`config.py` does **not** load a `.env` file. It only reads variables already in the process environment (`os.getenv`). Copying `.env.example` to `.env` does nothing unless you export the variables yourself or start uvicorn with `--env-file .env`. If `DATABASE_URL` is unset, the code falls back to SQLite.

### `backend/app/__init__.py`

Empty. It exists so `app` is a regular Python package and `uvicorn app.main:app` can import it.

### `backend/app/config.py`

| Name | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./bms.db` | SQLAlchemy URL. |
| `JWT_SECRET` | `dev-secret-change-in-production` | HMAC secret for access tokens. Fine for a class demo. Not fine for a real deployment. |
| `JWT_ALGORITHM` | `HS256` | Symmetric HMAC. The same secret signs and verifies. |
| `ACCESS_TOKEN_MINUTES` | `15` | Access JWT lifetime. |
| `REFRESH_TOKEN_DAYS` | `7` | Refresh-token lifetime. |

All of these can be overridden with environment variables of the same name, except `JWT_ALGORITHM`, which is fixed in code.

### `backend/app/security.py`

`hash_password(password)` — `bcrypt.hashpw` with a random salt (`gensalt`). Returns a string.

`verify_password(password, password_hash)` — `bcrypt.checkpw`. Login uses this. The code never compares plaintext to plaintext.

`create_access_token(user_id, role)` — builds a JWT:

```json
{
  "sub": "<user uuid>",
  "role": "admin or user",
  "type": "access",
  "exp": "<utc now + 15 minutes>"
}
```

`sub` is the standard JWT subject. `role` is custom. `type` stops a token of some other kind from being accepted as an access token. `exp` is the expiry `python-jose` checks on decode.

`decode_access_token(token)` — verifies the signature and expiry. Raises `ValueError("invalid token")` on any JWT error, and `ValueError("invalid token type")` if `type` is not `"access"`. Middleware turns that into HTTP 401.

`refresh_token_expiry()` — UTC now plus 7 days. Used when a refresh row is inserted.

The refresh token is **not** created here. It is a random string from `secrets.token_urlsafe(32)` in the auth router, stored in the database. That is deliberate: the server can see refresh tokens and could delete them. A JWT cannot be revoked before `exp` without an extra blocklist.

### `backend/app/schemas.py`

Pydantic models. FastAPI uses them to validate JSON and to document `/docs`.

| Class | Used for | Rules |
|---|---|---|
| `UserRegister` | `POST /auth/register` | username 3–50 chars, password 6–128 chars. |
| `UserLogin` | `POST /auth/login` | username and password, no length rules. |
| `TokenResponse` | login, register, refresh responses | `access_token`, `refresh_token`, `token_type` default `"bearer"`, `role`. |
| `RefreshRequest` | `POST /auth/refresh` | `refresh_token` string. |
| `BookCreate` / `BookUpdate` | `POST` and `PUT /books` | Both use `BookWrite`: title, author, optional isbn, genre, optional description, optional year, copies (1–20). Not a partial PATCH. Genre must be one of `SHELVES` or the route returns 400 `unknown shelf`. |
| `BookOut` | one book in a response | The columns above, plus `available` (copies still in), `saved` (this user saved it), and `my_loan` (`id`, `due_at`, `late`) or null. |
| `BookPage` | `GET /books` | `items: BookOut[]`, `next_cursor: string or null`. |
| `BorrowRequest` | `POST /loans` | `book_id`. |
| `LoanOut` | loan responses | id, book_id, title, author, optional username, borrowed_at, due_at, late. |
| `MyLoan` | nested in `BookOut` | id, due_at, late. |

Validation failures are HTTP 422 with a `detail` array. The UI mostly looks for `detail` as a string, so a 422 often shows the generic fallback message.

### `backend/app/main.py`

- `lifespan` calls `init_db()` on startup, then yields. Nothing runs on shutdown.
- `FastAPI(title="Book Management System")` is the object Uvicorn loads as `app.main:app`.
- Middleware order is documented in section 2.
- CORS allows every origin, method, and header (`*`). That is acceptable for a local demo. It is open if this process is ever exposed publicly.
- Routers: `auth`, `books`, `loans`, `saved`.
- `GET /health` returns `{"status": "ok"}` and is public.

### `backend/app/middleware/__init__.py`

Empty.

### `backend/app/middleware/auth_rbac.py`

Public paths, matched exactly or as a prefix plus `/`:

- `/health`
- `/docs`, `/openapi.json`, `/redoc` (so Swagger works without a token)
- `/auth/login`, `/auth/register`, `/auth/refresh`

`OPTIONS` is also public, so browser CORS preflight is not asked for a token.

**`JWTAuthMiddleware`**

- No `Authorization` header, or one that does not start with `Bearer `: **401** `missing bearer token`.
- Token that fails `decode_access_token`: **401** `invalid or expired token`.
- Success: `request.state.user_id = payload["sub"]`, `request.state.role = payload["role"]`.

The middleware does not load the user from the database. A still-valid access token keeps the role that was baked into it, even if the row in `users` later changes. The next refresh builds a new access token from the current row.

**`RBACMiddleware`**

Only one rule: path starts with `/books` and method is POST, PUT, or DELETE. Role must be exactly `"admin"`. Otherwise **403** `admin role required`.

GET `/books` and GET `/books/{id}` are allowed for every logged-in role. There is no “anonymous read”. A missing token is already 401 from the JWT middleware.

### `backend/app/routers/__init__.py`

Empty. `from app.routers import auth, books` still works because `auth.py` and `books.py` are modules inside the package.

### `backend/app/routers/auth.py`

Router prefix `/auth`.

**`POST /auth/register`** — 201

- 400 `username taken` if that username exists. Comparison is exact. `Admin` and `admin` are different.
- Inserts a user with role `"user"` and the bcrypt hash.
- Calls `_issue_tokens` and returns a `TokenResponse`. The new user is logged in immediately. The UI does the same.

**`POST /auth/login`** — 200

- Looks up the username.
- If missing, or `verify_password` fails: **401** `invalid credentials`. The message does not say which of the two was wrong.
- Success: `_issue_tokens`.

**`POST /auth/refresh`** — 200

- Looks up the refresh string in `refresh_tokens`.
- Missing row, or `expires_at` in the past: **401** `invalid refresh token`.
- Naive datetimes (SQLite sometimes returns them without a timezone) are treated as UTC before the comparison.
- Loads the user. If the user row is gone: 401.
- Returns a **new** access token and the **same** refresh token. Refresh tokens are not rotated and not deleted on use.
- There is no logout route. Signing out only deletes the browser’s session storage. Old refresh rows stay until they expire.

**`_issue_tokens`**

- `secrets.token_urlsafe(32)` is about 43 characters, which fits the 64-character column.
- Inserts a `RefreshToken` row.
- Each login or register adds another row. Old refresh tokens for that user are not revoked. Several valid refresh tokens can exist at once.

### `backend/app/routers/books.py`

Router prefix `/books`. `MAX_LIMIT = 50`.

**Cursor helpers**

`_encode_cursor(sort, key, book_id)` JSON-encodes `{"s": "<sort>", "k": "<sort value>", "id": "<uuid>"}` and base64-url-encodes it. For `newest`, `k` is the ISO timestamp. For `title` or `author`, `k` is that string. The client treats it as an opaque string.

`_decode_cursor` reverses that. Bad input is **400** `invalid cursor`. If `s` in the cursor is not the `sort` on this request, **400** `cursor does not match sort`. Changing sort on the screen starts again at the first page, so it never sends the old cursor.

**`GET /books`** — query params:

| Param | Default | Rule |
|---|---|---|
| `limit` | 10 | integer 1–50. The UI sends 8. |
| `cursor` | none | opaque string from a previous `next_cursor`. |
| `q` | none | search string, max 100 characters. |
| `genre` | none | one shelf, or omit for every shelf. Unknown value is 400. |
| `sort` | `newest` | `newest`, `title`, or `author`. Unknown value is 400. |

Search: if `q` is set, `title ILIKE %q%` OR `author ILIKE %q%`. ISBN is not searched. Genre is an extra AND filter. The user’s text is not escaped, so a literal `%` or `_` in the query acts as a SQL LIKE wildcard.

Order:

- `newest`: `created_at DESC`, then `id DESC`. The next page is rows older than the cursor, or the same time with a smaller id.
- `title`: `title ASC`, then `id ASC`. The next page is titles after the cursor, or the same title with a larger id.
- `author`: same idea with `author`.

The query asks for `limit + 1` rows. If that extra row exists, there is another page. `next_cursor` is built from the last row **actually returned** (index `limit - 1`), and the extra row is dropped. If there is no extra row, `next_cursor` is null. This avoids a `COUNT(*)`.

Why a cursor instead of `OFFSET`: offset skips rows by count. If someone inserts a book while you are paging, offset can skip or repeat a row. A cursor says “give me what comes after this exact book”.

Each book in the page is passed through `annotate_books` in `lending.py`, which adds `available`, `saved`, and `my_loan` for the caller.

**`GET /books/{book_id}`** — one book, or 404 `book not found`. `BookScreen` calls this.

**`POST /books`** — 201, body `BookCreate`. Admin only, enforced by middleware, not by this function.

**`PUT /books/{book_id}`** — replaces the writable fields. 404 if missing. 400 if the new `copies` is lower than the number of open loans. Admin only.

**`DELETE /books/{book_id}`** — 204 empty body. 404 if missing. Also deletes that book’s loans and saves. Admin only.

### `backend/app/lending.py`

Shared loan math so the book routes and the loan routes do not each invent a due date.

- `LOAN_DAYS = 14`
- `due_on(start)` adds those 14 days
- `is_late(due_at)` compares with now. SQLite sometimes returns a datetime with no timezone; `as_utc` treats that as UTC
- `annotate_books` counts open loans per book, finds this user’s open loan, and finds which of these books they saved

### `backend/app/routers/loans.py`

All of these need a bearer token. Swagger shows the lock because the router depends on `HTTPBearer`, same as books.

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/loans/mine` | any logged-in user | their open loans, soonest due date first |
| GET | `/loans` | admin | every open loan, with `username` |
| POST | `/loans` | any logged-in user | body `{ "book_id" }`. 404 unknown book. 400 if they already have it out, or if `available` is 0. 201 and a `LoanOut` |
| POST | `/loans/{id}/return` | the borrower or an admin | sets `returned_at`. 404 if missing or already returned. 403 `not your loan` otherwise |

A reader who calls `GET /loans` gets 403 from this file, not from the RBAC middleware. The middleware only special-cases `/books` writes.

### `backend/app/routers/saved.py`

| Method | Path | What |
|---|---|---|
| GET | `/saved` | this user’s saved books, newest save first, as `BookOut` list |
| POST | `/saved/{book_id}` | save it. If it is already saved, the row is left as it is and the book is returned. 404 if the book does not exist |
| DELETE | `/saved/{book_id}` | 204. Missing row is still 204 |

---

## 7. Frontend, file by file

The UI is React Native components (`View`, `Text`, `Pressable`, `TextInput`, `FlatList`). On web, React Native Web turns those into DOM nodes. There is no React Navigation and no Expo Router. `App.tsx` picks login versus the library, then catalog, book, loans, or saved.

### `frontend/package.json`

Dependencies: `expo` ~57, `expo-status-bar`, `react` 19.2.3, `react-dom` 19.2.3, `react-native` 0.86.3, `react-native-web`.

Dev: `@types/react`, `typescript` ~6.

Scripts: `npm start` is `expo start`. `npm run web` is `expo start --web`. Same for android and ios. There is no separate production build script in use.

`"main": "index.ts"` is the Expo entry.

### `frontend/package-lock.json`

Locked install tree for npm. Not hand-edited.

### `frontend/tsconfig.json`

Extends `expo/tsconfig.base` and turns on `"strict": true`.

### `frontend/app.json`

Expo config. Display name “Book Management System”, slug `bms`, portrait, light UI. Points at `assets/icon.png`, Android adaptive icons, and `assets/favicon.png`. Tablet is allowed on iOS. These icons are the Expo template images, not custom artwork.

### `frontend/LICENSE`

MIT license from the Expo template (650 Industries). It covers the template, not a separate license for this coursework.

### `frontend/.gitignore`

Ignores `node_modules`, `.expo`, native `ios/` and `android/` folders, keystores, and local env files. Native projects are not checked in. Expo would generate them if you made a dev build. This project runs in Expo Go / web, so those folders are absent.

### `frontend/index.ts`

Calls `registerRootComponent(App)`. That is Expo’s way of registering the root with React Native, on web and on a device.

### `frontend/App.tsx`

State `authed` starts as `true` if `getAccessToken()` returns a string. On web that reads `sessionStorage`. Refreshing the browser tab keeps you logged in. Closing the tab clears `sessionStorage`, so you are logged out. (sessionStorage is per tab, and it dies with the tab. It is not `localStorage`.)

If `authed` is false, render `LoginScreen`. On success, set `authed` true. If true, `page` is `catalog`, `loans`, `saved`, or `book`. Logout clears that back to the catalog and shows login. The root view uses the warm background color so the page is not white at the edges.

There is no router, no deep link, and no URL path per screen. Both screens are the same web URL.

### `frontend/src/config.ts`

```ts
export const API_URL = "http://127.0.0.1:8000";
```

Every fetch prepends this. There is no environment switch for production.

### `frontend/src/theme.ts`

Shared look. Screens should not invent one-off hex colors when a token exists.

| Token | Value | Used for |
|---|---|---|
| `bg` | `#F3F4F6` | page background |
| `paper` | `#FFFFFF` | the sheet the catalog sits on |
| `ink` | `#111111` | main text, buttons, the login panel |
| `muted` | `#5F6670` | secondary text |
| `line` | `#D5D8DE` | borders |
| `forest` | `#111111` | buttons and the login panel. The name is old. The color is black. |
| `forestMid` | `#2A2E35` | edit link, stock line |
| `gold` | `#D61F26` | the red mark: active tab, shelf line, cover stripe |
| `goldSoft` | `#111111` | kept so older styles still resolve |
| `sage` | `#EEF0F3` | reader note |
| `danger` | `#D61F26` | remove, errors |
| `dangerSoft` | `#FDECEC` | error background |
| `cream` | `#FFFFFF` | text on a black button or the black login panel |

`spacing` is 6, 10, 16, 24, 36. `radius` is 0. Corners are square.

`serif` and `sans` are both the system UI font. `serif` still exists so older style objects compile. It no longer loads Georgia.

`fieldReset` removes the browser’s blue focus outline on web inputs. Focus is shown by our own border instead.

`cardShadow` and `liftShadow` are empty. The screens use borders instead of drop shadows.

### `frontend/src/types/book.ts`

`Book` matches `BookOut`: the catalog fields, plus `available`, `saved`, and `my_loan`. `shelves` is the same five names as `SHELVES` on the server. `SortKey` is `newest`, `title`, or `author`.

`BookPage` is `items` plus `next_cursor`. `Loan` in `types/loan.ts` matches `LoanOut`.

UUIDs and datetimes arrive as JSON strings. TypeScript types them as `string`, not as a `Date`.

### `frontend/src/storage/session.ts`

Keys:

| Key | Value |
|---|---|
| `bms_access_token` | JWT |
| `bms_refresh_token` | random refresh string |
| `bms_role` | `admin` or `user` |
| `bms_username` | the name typed at login or register |

On web (`Platform.OS === "web"`), the store is `sessionStorage`. In DevTools: Application → Session Storage → the page origin.

On iOS/Android there is no `sessionStorage`. The same functions use an in-memory `Map`. That map dies when the JS bundle reloads, and it is not secure storage. It is enough for a demo in Expo Go. It is not the system keychain.

Functions: `setSession`, `clearSession`, `getAccessToken`, `getRefreshToken`, `getRole`, `getUsername`, `setAccessToken`. `setAccessToken` is used after a refresh so the new JWT replaces the old one without wiping the refresh token, role, or username.

### `frontend/src/api/client.ts`

`apiFetch(path, options)` is the only function book calls should use.

- Adds `Content-Type: application/json` when there is a body and the caller did not set one.
- Adds the bearer token if one is stored.
- `fetch(API_URL + path)`.
- If the response is **401**, it tries `POST /auth/refresh` with the stored refresh token. That call uses raw `fetch`, not `apiFetch`, so a failed refresh cannot recurse.
- If refresh works, it stores the new access token and **retries the original request once**.
- If refresh fails, the 401 is returned to the caller. `books.ts` then clears the session and throws `"session expired"`.

Login and register do not go through `apiFetch`. They are public and must work with no token. They live in `auth.ts`.

### `frontend/src/api/auth.ts`

`login(username, password)` — POST `/auth/login`. On success, `setSession` with tokens, role, and the username the person typed (the API does not return the username). Throws an `Error` whose message is the API `detail` string when it is a string, otherwise `"login failed"`.

`register` is the same against `/auth/register`, fallback `"registration failed"`.

`errorMessage` is a helper under `login` in the file. Function declarations are hoisted, so `login` can call it.

### `frontend/src/api/books.ts`

`readBody` handles status codes for every book call:

- 401 → `clearSession()` and throw `"session expired"`.
- other non-OK → throw `detail` if it is a string, else the fallback.
- 204 → return nothing (delete).
- otherwise → `res.json()`.

| Function | HTTP | Fallback error |
|---|---|---|
| `fetchBookPage({ limit, cursor, q, genre, sort })` | GET `/books?...` | failed to load books |
| `fetchBook(id)` | GET `/books/{id}` | book not found |
| `createBook(payload)` | POST `/books` | failed to add book |
| `updateBook(id, payload)` | PUT `/books/{id}` | failed to update book |
| `deleteBook(id)` | DELETE `/books/{id}` | failed to delete book |

`fetchBookPage` always sends `limit` (default 10 if the caller omits it) and `sort` (default `newest`). The screen passes 8. It adds `cursor` only when present, `q` only when the trimmed query is non-empty, and `genre` only when a shelf is selected.

`loans.ts`: `fetchMyLoans`, `fetchAllLoans`, `borrowBook`, `returnLoan`.

`saved.ts`: `fetchSaved`, `saveBook`, `unsaveBook`.

`readBody` lives in `client.ts` and is shared by those three files. 401 still clears the session and throws `"session expired"`.

### `frontend/src/hooks/useDebouncedValue.ts`

```ts
useDebouncedValue(value, delayMs = 400)
```

Keeps an internal copy of `value`. Every time `value` changes, it waits `delayMs`, then copies it. If `value` changes again before the timer fires, the cleanup clears the old timer. The returned value only updates after the user pauses.

`HomeScreen` stores what the user is typing in `search`, and passes `useDebouncedValue(search, 400)` into the loader. The network request uses the debounced string. Typing “austen” does not fire five searches.

While `search.trim() !== debouncedSearch.trim()`, the screen shows the word “searching…”.

### `frontend/src/components/BookCover.tsx`

A 44×58 white square with a black border and a red stripe across the top. The letter is the first character of the title, uppercased. Empty title falls back to `b`. These are not downloaded images.

### `frontend/src/components/BookRow.tsx`

One catalog card: cover, title (max 2 lines), author (1 line), then isbn and the added date if they exist, joined with a dot.

`addedOn` formats `created_at` with the browser locale as day + short month, then lowercases it. In an en-IN locale that looks like `23 oct`.

`canEdit` false: no buttons. That is the reader view.

The card also shows the shelf, `in` / `out` (or `2 of 3 in` when there is more than one copy), and `due …` plus `late` when `my_loan` is set. Pressing the title calls `onOpen`.

`canEdit` true: “edit” and “remove”. Remove does not delete immediately. The parent sets `confirming` for that book id, and the card swaps to “remove this title? / yes / keep”. Yes calls `onConfirmDelete`. This state lives in `HomeScreen` (`pendingDeleteId`), not inside the row, so a recycled `FlatList` cell cannot keep a confirm state stuck on the wrong book.

### `frontend/src/components/TopBar.tsx`

A full-width white bar with a black bottom rule. Inside it: the wordmark, username, librarian or reader label, sign out, and the tabs. The active tab has a red underline. A reader sees catalog, loans, and saved. A librarian sees catalog and out. “Out” is the same loans screen, labeled as the desk rather than a personal checkout. Sign out calls `clearSession()` and then `onLogout()`. The label still reads `getRole() === "admin"`. The word on screen is the label. The stored role is still `admin` or `user`.

### `frontend/src/screens/LoginScreen.tsx`

Props: `onSuccess()`.

Local state: `mode` (`"login"` or `"register"`), `username`, `password`, `loading`, `error`.

`useWindowDimensions`. If width ≥ 860, the card is a row: dark green story on the left, form on the right (`maxWidth` 920). Narrower than that, they stack, and padding is tighter so the sign-in button fits a phone height.

Left panel copy explains the two roles. In login mode it shows two pressable accounts:

- librarian — `admin` / `admin123` — can add and edit books
- reader — `reader` / `reader123` — can browse and search

Pressing one only fills the fields. It does not submit. That is so a demo can show the values before the request.

Register mode hides those cards and explains that a new account is always a reader.

Right side: a two-part switch, “sign in” and “register”. Switching to register clears the fields. Labels, inputs, error banner, and one button: “sign in” or “create account”.

`submit`:

- Empty username or password → “enter a username and password”.
- Register and username shorter than 3 → “username needs at least 3 characters”.
- Register and password shorter than 6 → “password needs at least 6 characters”.
- Otherwise `login()` or `register()`, then `onSuccess()`.
- Errors from the API (`invalid credentials`, `username taken`, and so on) are shown in the banner.

The password field submits on the keyboard’s done key (`onSubmitEditing`).

### `frontend/src/screens/HomeScreen.tsx`

Props: `onLogout`, `onOpenBook(id)`, `onTab`.

Reads `getRole()` from storage. `canEdit` is `role === "admin"`. The screen mounts fresh after login, so the role is the one just saved.

The column is centered and `maxWidth` 760, on a white sheet. Wide monitors show gray around it. Search sits under the bar.

**Header (stays put while the list scrolls)**

- `TopBar` with the catalog tab selected.
- Search field. Focus turns the border black. “clear” appears when the field is non-empty.
- A one-line status that says “searching…” during the debounce wait, and a blank line otherwise, so the layout does not jump.

**List header (scrolls away)**

- Admin, desk closed: a full-width “add a title” button.
- Admin, desk open: a form with title, author, isbn, shelf, year, copies, a short note, cancel, and save. Save stays disabled until title and author are non-empty. Copies must be an integer of at least 1. Year, if filled in, must be an integer of at least 1000. Button text is “add to catalog” or “save changes”.
- Reader: a sage note. No add button, no edit, no remove.
- Section title “catalog”, or “matches” when the debounced query is non-empty. The right side says `showing N`, which is how many are loaded, not how many exist in the database.

**Data loading**

State: `books`, `nextCursor`, `loading`, `refreshing`, `loadingMore`, `error`, form fields, `editingId`, `deskOpen`, `pendingDeleteId`.

`loadFirstPage(query)` increments `requestId`. When the response arrives, it is ignored if a newer request has started. Fast typing cannot paint an older result on top of a newer one.

A `useEffect` calls `loadFirstPage(debouncedSearch)` whenever the debounced query changes. An `active` flag ignores the result if the effect was cleaned up.

Errors go through `fail`. If the message is `"session expired"`, it calls `onLogout()` instead of showing a banner.

Pull to refresh calls `loadFirstPage` again.

Above the list, shelf chips (`all` plus the five shelves) and a sort row (`newest`, `title`, `author`). Changing either reloads the first page, because `loadFirstPage` depends on `shelf` and `sort`.

**Show more**

`onLoadMore` runs only if `nextCursor` is set and nothing is already loading. It fetches with that cursor and appends `page.items`. It does not use `FlatList`’s `onEndReached`, so paging is a deliberate tap. That tap is one row in the browser Network tab.

When `nextCursor` is null and there is at least one book, the footer says “end of the catalog”.

**Save**

Trims title and author. ISBN is trimmed, and an empty string is sent as `null`. Edit calls `updateBook`. Create calls `createBook`. Then the form closes and the first page reloads, so the new or edited book shows up in the right order.

**Delete**

“remove” sets `pendingDeleteId`. “yes” calls `deleteBook`, then reloads the first page. If you were editing that book, the form closes too.

**Empty and loading**

First load with no rows yet: a spinner and “opening the catalog…”. After that, an empty result says “nothing on this shelf”, with different copy when a search is active.

### `frontend/src/screens/BookScreen.tsx`

Opened from a catalog card or a loan or a saved title. `App` stores `bookId` and sets `page` to `"book"`.

`GET /books/{id}` fills the page. For a reader:

- borrow, if you do not already have it and `available` is above 0. Calls `POST /loans`.
- return, if `my_loan` is set. Calls `POST /loans/{id}/return`.
- save / remove from reading list. `POST` or `DELETE /saved/{book_id}`.

A librarian does not get borrow or save on this page. The note points them at the out tab. The `POST /loans` route still accepts an admin token. The screen just does not offer it.

After any of those, it loads the book again so the stock line and the due date match the database. “back to the catalog” calls `onBack`.

### `frontend/src/screens/LoansScreen.tsx`

Admin calls `GET /loans` and the heading is “out on loan”. Each row includes the username. Reader calls `GET /loans/mine` and the heading is “my loans”. Either person can press return on a row they are allowed to return. The copy on the page says a loan is due in 14 days.

### `frontend/src/screens/SavedScreen.tsx`

`GET /saved`. Opening a title goes to `BookScreen`. Remove calls `DELETE /saved/{id}` and drops that row from the list. The note says saving is not the same as borrowing.

### `frontend/src/format.ts`

`shortDate` turns an ISO string into a short local date for due dates on the cards and the book page.

---

## 8. API cheat sheet

Base URL `http://127.0.0.1:8000`.

| Method | Path | Auth | Who | Success | Failure you should know |
|---|---|---|---|---|---|
| GET | `/health` | no | anyone | 200 `{"status":"ok"}` | |
| POST | `/auth/register` | no | anyone | 201 tokens + role `user` | 400 username taken, 422 bad body |
| POST | `/auth/login` | no | anyone | 200 tokens + role | 401 invalid credentials |
| POST | `/auth/refresh` | no (body carries the refresh token) | anyone with a valid refresh token | 200 new access token, same refresh token | 401 invalid refresh token |
| GET | `/books` | bearer | any logged-in role | 200 `{items, next_cursor}` | 401 |
| GET | `/books/{id}` | bearer | any logged-in role | 200 book | 404, 401 |
| POST | `/books` | bearer | admin | 201 book | 403 reader, 401, 422 |
| PUT | `/books/{id}` | bearer | admin | 200 book | 403, 404, 400 if copies are below open loans, 401, 422 |
| DELETE | `/books/{id}` | bearer | admin | 204 empty | 403, 404, 401 |
| GET | `/loans/mine` | bearer | any logged-in role | 200 loan list | 401 |
| GET | `/loans` | bearer | admin | 200 every open loan, with username | 403 reader, 401 |
| POST | `/loans` | bearer | any logged-in role | 201 loan | 400 already borrowed or none in, 404 |
| POST | `/loans/{id}/return` | bearer | borrower or admin | 200 loan | 403 not your loan, 404 |
| GET | `/saved` | bearer | any logged-in role | 200 book list | 401 |
| POST | `/saved/{book_id}` | bearer | any logged-in role | 200 book | 404 |
| DELETE | `/saved/{book_id}` | bearer | any logged-in role | 204 | 401 |

Login body:

```json
{ "username": "admin", "password": "admin123" }
```

Login response:

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<random>",
  "token_type": "bearer",
  "role": "admin"
}
```

Create body:

```json
{
  "title": "Circe",
  "author": "Madeline Miller",
  "isbn": "9780316556347",
  "genre": "fantasy",
  "description": "a witch tells her own story",
  "year": 2018,
  "copies": 1
}
```

List response shape:

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Pachinko",
      "author": "Min Jin Lee",
      "isbn": "9781455563937",
      "genre": "history",
      "description": "a family across generations",
      "year": 2017,
      "copies": 1,
      "available": 1,
      "saved": false,
      "my_loan": null,
      "created_at": "2026-10-23T..."
    }
  ],
  "next_cursor": "eyJzIjoibmV3ZXN0Iiwia..."
}
```

`next_cursor` is base64. Decoded it is JSON `{"s":"newest","k":"<iso time or title or author>","id":"<uuid>"}`. `my_loan`, when set, is `{ "id", "due_at", "late" }`.

Authorized call:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

Swagger is at http://127.0.0.1:8000/docs. ReDoc is at http://127.0.0.1:8000/redoc. Both are public.

Book routes declare `HTTPBearer` so the docs page shows **Authorize**. Paste `access_token` only. Swagger adds the word `Bearer` itself. The token is remembered in that browser (`persistAuthorization`). Auth routes stay open, so you can log in before you authorize. The middleware still does the real check. The `HTTPBearer` dependency is there so the docs know about the header.

---

## 9. Screen behavior, side by side

| | Librarian (`admin`) | Reader (`user`) |
|---|---|---|
| How you get the account | seeded `admin`, or you cannot self-register into this role | seeded `reader`, or the register tab |
| Pill | librarian | reader |
| Search, shelves, sort, show more | yes | yes |
| Add / edit / delete | yes | no controls, and the API returns 403 if they try anyway |
| Borrow and save on a title | no. the page points at the out tab | yes |
| Loans tab | labeled “out”: every open loan, with the username, and return | “my loans”, their own only |
| Saved tab | not shown | their own reading list |
| Session keys | same four keys, `bms_role=admin` | `bms_role=user` |

The word “librarian” never goes to the API. The middleware compares against `"admin"`.

---

## 10. What is intentionally not in this repo

Say these plainly if you are asked. Guessing that they exist will not match the code.

- No AWS account, EC2, RDS, security group, or deploy script. `psycopg2` and the `DATABASE_URL` comment are the only preparation for RDS.
- No Docker, no `docker-compose`.
- No Alembic migrations.
- No test suite.
- No logout endpoint and no refresh-token rotation.
- No password reset, email, or profile screen.
- No book ownership. A loan is a checkout, not a private copy of the catalog row.
- No infinite scroll. Paging is the “show more” button.
- No React Router / Expo Router. `App.tsx` switches screens with `page`.
- No global state library (no Redux, no Zustand). State sits in each screen.
- The access token’s role is not re-read from the database on every request.
- CORS is `*`.
- The JWT secret in `config.py` is a development default.
- `.env` is not auto-loaded by `config.py`.

---

## 11. Questions you should be able to answer

**Why two tokens?**  
The access token is a short-lived JWT (15 minutes) sent on every API call. The server can check it with the secret and does not need a database read. The refresh token is a random string in `refresh_tokens`, valid 7 days, used only to get a new access token. If the access token leaks, it dies quickly. The refresh token can be rejected by deleting its row. This code does not delete that row on logout.

**Why is the refresh token not a JWT?**  
So the server has a copy it can look up and, in principle, revoke. The current logout button does not revoke it. It only clears the browser.

**Where is the password stored?**  
Nowhere in plaintext. `users.password_hash` is a bcrypt hash. Login uses `bcrypt.checkpw`.

**Where is RBAC?**  
`RBACMiddleware` in `backend/app/middleware/auth_rbac.py`. It is not a decorator on each route. POST, PUT, and DELETE under `/books` require `request.state.role == "admin"`. That role was put there by `JWTAuthMiddleware`, which read the JWT.

**Can a reader call the API directly and add a book?**  
They can send the request. They get 403. The UI also hides the controls.

**What is cursor pagination?**  
`GET /books` returns `limit` rows plus a `next_cursor` that points at the last row of this page, including which sort was used. Newest order is `created_at` desc, `id` desc. Title and author are ascending, with `id` as the tie-break. The handler fetches `limit + 1` rows to know whether another page exists. A cursor from one sort is rejected if you send it with another sort. The UI uses `limit=8` and a “show more” button. The API default if you omit `limit` is 10. The maximum is 50.

**What does debounce mean here?**  
`search` updates on every keystroke. `debouncedSearch` updates 400 ms after the user stops. The `useEffect` that calls the API depends on `debouncedSearch`, not on `search`.

**What is in session storage?**  
On web only: `bms_access_token`, `bms_refresh_token`, `bms_role`, `bms_username`. It is `sessionStorage`, so it lasts for the tab, not forever. Native uses a `Map` in memory instead.

**What happens when the access token expires?**  
The next API call gets 401. `apiFetch` posts the refresh token to `/auth/refresh`, saves the new access token, and retries once. If that fails, `readBody` clears the session and the screen treats `"session expired"` as a logout.

**Why does the screen say librarian if the database says admin?**  
Display label versus stored role. `canEdit` checks `role === "admin"`. The pill text is chosen in `TopBar` from `getRole()`.

**Why might two books with the same timestamp still page correctly?**  
The sort and the cursor both include `id` as a tie-break.

**Does search look at ISBN?**  
No. Only `title` and `author`.

**Is the database on AWS?**  
No. It is `backend/bms.db`. SQLAlchemy will talk to Postgres if `DATABASE_URL` is a `postgresql://` URL, because `psycopg2` is installed. Nothing in this project creates an RDS instance.

**What does `create_all` not do?**  
It does not change columns on a table that already exists. This project’s extra step is `_add_missing_book_columns()` in `database.py`, and it only adds `genre`, `description`, `year`, and `copies` on SQLite. A new table such as `loans` is created by `create_all` because the table was missing.

**How many copies can one person take?**  
One open loan per person per title, even when `copies` is greater than 1. The other copies stay for other people. Available is `copies` minus open loans.

**When is a loan late?**  
`due_at` is 14 days after `borrowed_at`. `is_late` in `lending.py` is true when that time has passed and `returned_at` is still null. Nothing in the app charges a fine.

**Does saving a book take a copy?**  
No. `saved_books` is only a list. Borrow is `POST /loans`.

**Who can return a loan?**  
The person who borrowed it, or an admin. A reader who returns someone else’s id gets 403 `not your loan`.

**Where is “see all loans” blocked?**  
Inside `GET /loans` in `loans.py`, not in `RBACMiddleware`. The middleware only blocks non-admin writes under `/books`.

**Are there tests?**  
No.

---

## 12. A demo path that shows each requirement

1. Open http://localhost:8081 with DevTools.
2. **UI.** Tap the librarian card, then sign in. The catalog and “add a title” are the admin UI.
3. **Session storage.** Application → Session Storage. Four `bms_` keys. `bms_role` is `admin`.
4. **Network and API.** Search `austen`. After a short pause, one `GET /books?limit=8&q=austen`. That pause is the debounce. Open the response: `items` and `next_cursor`.
5. Clear the search. Press a shelf, then **title** or **author**. The next `GET /books` includes `genre` and `sort`. Press **show more**. That request includes a `cursor`. That is cursor pagination.
6. **CRUD.** Add a title, with a shelf and a copy count. Network shows `POST /books` and 201. Edit it (`PUT`). Remove it (`DELETE`, status 204).
7. **Database.** `sqlite3 backend/bms.db` and select from `users` and `books`. The new book is a row. Passwords are hashes.
8. Sign out. Sign in as `reader` / `reader123`. The note replaces the form. No edit or remove. `bms_role` is `user`.
9. Open a title. **Borrow** it. Network shows `POST /loans`. The loans tab lists it with a due date. `sqlite3` on `loans` shows `returned_at` null. Return it. That column is filled in.
10. Save a title, open the saved tab, then remove it. That is `saved_books`, separate from `loans`.
11. Sign back in as admin and open loans. You see who has each copy. `GET /loans` as the reader is 403.
12. **RBAC.** In `/docs` or with curl, send `POST /books` with the reader’s access token. The body is `{"detail":"admin role required"}` and the status is 403.
13. **Register.** On the login screen, switch to register, create a new username. That row appears in `users` with role `user`, and you land on the reader screen.
