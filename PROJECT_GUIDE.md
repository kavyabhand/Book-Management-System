# Book Management System — full project guide

This file is a walkthrough of the repo as it exists right now. It is meant to be enough to explain any file, any request, and any screen.

The short README at the root only covers how to start the servers. This guide covers how the code works.

Nothing here is deployed. There is no EC2, no RDS instance, and no GitHub Actions. The database in use is a local SQLite file. The code is written so a Postgres URL can be dropped in later.

---

## 1. What the project is

A small library catalog with two kinds of account.

- A **librarian** (database role `admin`) can list, search, add, edit, and delete books.
- A **reader** (database role `user`) can list and search. Create, update, and delete are rejected.

The app name on screen is **bookstack**. The Expo app name is **Book Management System**.

### Required features, and where they live

| Feature | Where it is implemented |
|---|---|
| Full CRUD for books | `backend/app/routers/books.py`. The UI uses all of it except “get one book by id”. |
| RBAC in middleware | `backend/app/middleware/auth_rbac.py`, class `RBACMiddleware`. |
| JWT access token + refresh token | Access token: `backend/app/security.py`. Refresh token: `backend/app/routers/auth.py` plus the `refresh_tokens` table. |
| Cursor pagination | `list_books` in `backend/app/routers/books.py`. The UI asks for 8 books at a time and shows a “show more” button. |
| Debounced search | `frontend/src/hooks/useDebouncedValue.ts`, used in `HomeScreen.tsx` with a 400 ms delay. |

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
│       ├── middleware/
│       │   ├── __init__.py    empty
│       │   └── auth_rbac.py   JWT check and role check
│       └── routers/
│           ├── __init__.py    empty
│           ├── auth.py        register, login, refresh
│           └── books.py       CRUD and cursor pages
└── frontend/
    ├── .gitignore
    ├── LICENSE                Expo's MIT license from the template
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── app.json               Expo name, icons, orientation
    ├── index.ts               registers the root component
    ├── App.tsx                login vs home
    ├── assets/                default Expo icons and favicon
    └── src/
        ├── config.ts          API base URL
        ├── theme.ts           colors, type, shadows
        ├── api/
        │   ├── auth.ts        login and register
        │   ├── books.ts       book HTTP calls
        │   └── client.ts      bearer token and refresh retry
        ├── storage/
        │   └── session.ts     sessionStorage on web, memory elsewhere
        ├── types/
        │   └── book.ts        Book and BookPage types
        ├── hooks/
        │   └── useDebouncedValue.ts
        ├── components/
        │   ├── BookCover.tsx
        │   └── BookRow.tsx
        └── screens/
            ├── LoginScreen.tsx
            └── HomeScreen.tsx
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
  1. `Base.metadata.create_all` creates missing tables. It does **not** alter tables that already exist. Adding a column later does not migrate old databases.
  2. `seed_users()` inserts `admin` and `reader` if those usernames are absent.
  3. `seed_books()` inserts any catalog title that is not already in `books`.

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
| created_at | timestamptz | `server_default=func.now()`. Newest books sort first. |

Books are not owned by a user. There is no `user_id` on `books`. The catalog is shared.

`models.py` imports `relationship` and does not use it. There is no SQLAlchemy `relationship()` between users and tokens or users and books. The link is only the foreign-key column.

### Seeded titles

1984, To Kill a Mockingbird, The Great Gatsby, Pride and Prejudice, The Hobbit, Harry Potter and the Sorcerer's Stone, Atomic Habits, Sapiens, The Alchemist, Dune, The Catcher in the Rye, Educated, Circe, Beloved, Klara and the Sun, Normal People, The Midnight Library, Pachinko.

Seeding skips a title that is already present, so restarting the server does not duplicate them.

### Useful SQL while demoing

From `backend/`:

```bash
sqlite3 bms.db "SELECT username, role FROM users;"
sqlite3 bms.db "SELECT title, author, isbn FROM books ORDER BY created_at DESC;"
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

There is no Alembic. Schema changes are `create_all` only.

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
| `BookCreate` | `POST /books` | title and author 1–255, isbn optional, max 20. |
| `BookUpdate` | `PUT /books/{id}` | same fields as create. All three are required in the body (isbn may be null). This is not a partial PATCH. |
| `BookOut` | one book in a response | id, title, author, isbn, created_at. `from_attributes=True` lets Pydantic read a SQLAlchemy object. |
| `BookPage` | `GET /books` | `items: BookOut[]`, `next_cursor: string or null`. |

Validation failures are HTTP 422 with a `detail` array. The UI mostly looks for `detail` as a string, so a 422 often shows the generic fallback message.

### `backend/app/main.py`

- `lifespan` calls `init_db()` on startup, then yields. Nothing runs on shutdown.
- `FastAPI(title="Book Management System")` is the object Uvicorn loads as `app.main:app`.
- Middleware order is documented in section 2.
- CORS allows every origin, method, and header (`*`). That is acceptable for a local demo. It is open if this process is ever exposed publicly.
- Routers: `auth.router`, then `books.router`.
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

`_encode_cursor(created_at, book_id)` JSON-encodes `{"t": "<iso timestamp>", "id": "<uuid>"}` and base64-url-encodes it. The client treats it as an opaque string.

`_decode_cursor` reverses that. Bad input is **400** `invalid cursor`.

**`GET /books`** — query params:

| Param | Default | Rule |
|---|---|---|
| `limit` | 10 | integer 1–50. The UI sends 8. |
| `cursor` | none | opaque string from a previous `next_cursor`. |
| `q` | none | search string, max 100 characters. |

Search: if `q` is set, `title ILIKE %q%` OR `author ILIKE %q%`. ISBN is not searched. The user’s text is not escaped, so a literal `%` or `_` in the query acts as a SQL LIKE wildcard.

Order: `created_at DESC`, then `id DESC`. The id tie-break makes the order stable when two books share a timestamp.

If a cursor is present, keep rows strictly “after” that position in this ordering:

```
created_at < cursor_time
OR (created_at == cursor_time AND id < cursor_id)
```

The query asks for `limit + 1` rows. If that extra row exists, there is another page. `next_cursor` is built from the last row **actually returned** (index `limit - 1`), and the extra row is dropped. If there is no extra row, `next_cursor` is null. This avoids a `COUNT(*)`.

Why a cursor instead of `OFFSET`: offset skips rows by count. If someone inserts a book at the top while you are paging, offset can skip or repeat a row. A cursor says “give me what comes after this exact book”, so inserts at the top do not shift the next page.

**`GET /books/{book_id}`** — one book, or 404 `book not found`. The UI never calls this. It exists so CRUD is complete.

**`POST /books`** — 201, body `BookCreate`. Admin only, enforced by middleware, not by this function.

**`PUT /books/{book_id}`** — replaces title, author, and isbn. 404 if missing. Admin only.

**`DELETE /books/{book_id}`** — 204 empty body. 404 if missing. Admin only.

---

## 7. Frontend, file by file

The UI is React Native components (`View`, `Text`, `Pressable`, `TextInput`, `FlatList`). On web, React Native Web turns those into DOM nodes. There is no React Navigation and no Expo Router. `App.tsx` picks a screen with a boolean.

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

If `authed` is false, render `LoginScreen`. On success, set `authed` true. If true, render `HomeScreen`. Logout sets `authed` false. The root view uses the warm background color so the page is not white at the edges.

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
| `bg` | `#E6E0D4` | page background |
| `paper` | `#F7F4EE` | cards |
| `ink` | `#1A1814` | main text |
| `muted` | `#6F675C` | secondary text |
| `line` | `#E3DCD0` | borders |
| `forest` | `#1B332C` | buttons, login panel |
| `forestMid` | `#2A4A40` | reader note text, edit link |
| `gold` | `#A68445` | small accents, isbn line |
| `goldSoft` | `#F3E7CF` | librarian pill |
| `sage` | `#E4EFE7` | reader pill and reader note |
| `danger` | `#8E3A2F` | remove, errors |
| `dangerSoft` | `#F8E7E3` | error background |
| `cream` | `#F3EEE4` | text on the dark green panel |

`spacing` is 6, 10, 16, 24, 36. `radius` is 10, 16, 28.

`serif` is Georgia (and Palatino on web). `sans` is the system UI font on web, and the default React Native font on a phone.

`fieldReset` removes the browser’s blue focus outline on web inputs. Focus is shown by our own border instead.

`cardShadow` and `liftShadow` use CSS `boxShadow` on web (React Native Web warns on the old `shadow*` props) and the native shadow props on iOS/Android.

### `frontend/src/types/book.ts`

`Book` matches `BookOut`: `id`, `title`, `author`, `isbn` (string or null), `created_at` (ISO string).

`BookPage` is `items` plus `next_cursor`.

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
| `fetchBookPage({ limit, cursor, q })` | GET `/books?...` | failed to load books |
| `createBook({ title, author, isbn })` | POST `/books` | failed to add book |
| `updateBook(id, payload)` | PUT `/books/{id}` | failed to update book |
| `deleteBook(id)` | DELETE `/books/{id}` | failed to delete book |

`fetchBookPage` always sends `limit` (default 10 if the caller omits it). The screen passes 8. It adds `cursor` only when present, and `q` only when the trimmed query is non-empty.

### `frontend/src/hooks/useDebouncedValue.ts`

```ts
useDebouncedValue(value, delayMs = 400)
```

Keeps an internal copy of `value`. Every time `value` changes, it waits `delayMs`, then copies it. If `value` changes again before the timer fires, the cleanup clears the old timer. The returned value only updates after the user pauses.

`HomeScreen` stores what the user is typing in `search`, and passes `useDebouncedValue(search, 400)` into the loader. The network request uses the debounced string. Typing “austen” does not fire five searches.

While `search.trim() !== debouncedSearch.trim()`, the screen shows the word “searching…”.

### `frontend/src/components/BookCover.tsx`

A 62×88 colored block. The letter is the first character of the title, uppercased. Empty title falls back to `b`. The color is picked from a fixed palette of 8 dark colors by a small hash of the title (`hash * 33 + charCode`, mod 997, then mod 8). The same title always gets the same color, even if the list order changes. A short cream line sits near the bottom of the cover. These are not downloaded images.

### `frontend/src/components/BookRow.tsx`

One catalog card: cover, title (max 2 lines), author (1 line), then isbn and the added date if they exist, joined with a dot.

`addedOn` formats `created_at` with the browser locale as day + short month, then lowercases it. In an en-IN locale that looks like `23 oct`.

`canEdit` false: no buttons. That is the reader view.

`canEdit` true: “edit” and “remove”. Remove does not delete immediately. The parent sets `confirming` for that book id, and the card swaps to “remove this title? / yes / keep”. Yes calls `onConfirmDelete`. This state lives in `HomeScreen` (`pendingDeleteId`), not inside the row, so a recycled `FlatList` cell cannot keep a confirm state stuck on the wrong book.

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

Props: `onLogout()`.

Reads `getRole()` and `getUsername()` once per render from storage. `canEdit` is `role === "admin"`. The screen mounts fresh after login, so the role is the one just saved.

The column is centered and `maxWidth` 760, on the same warm page background. Wide monitors show empty background on the sides.

**Header (stays put while the list scrolls)**

- Wordmark “bookstack”, username under it.
- Pill: “librarian” (gold) or “reader” (sage). These words are display labels. The stored role is still `admin` or `user`.
- “sign out” calls `clearSession()` then `onLogout()`.
- Search field. Focus turns the border forest green. “clear” appears when the field is non-empty.
- A one-line status that says “searching…” during the debounce wait, and a blank line otherwise, so the layout does not jump.

**List header (scrolls away)**

- Admin, desk closed: a full-width “add a title” button.
- Admin, desk open: a form with title, author, optional isbn, cancel, and save. Save is disabled until title and author are non-empty. Button text is “add to catalog” or “save changes”.
- Reader: a sage note. No add button, no edit, no remove.
- Section title “catalog”, or “matches” when the debounced query is non-empty. The right side says `showing N`, which is how many are loaded, not how many exist in the database.

**Data loading**

State: `books`, `nextCursor`, `loading`, `refreshing`, `loadingMore`, `error`, form fields, `editingId`, `deskOpen`, `pendingDeleteId`.

`loadFirstPage(query)` increments `requestId`. When the response arrives, it is ignored if a newer request has started. Fast typing cannot paint an older result on top of a newer one.

A `useEffect` calls `loadFirstPage(debouncedSearch)` whenever the debounced query changes. An `active` flag ignores the result if the effect was cleaned up.

Errors go through `fail`. If the message is `"session expired"`, it calls `onLogout()` instead of showing a banner.

Pull to refresh calls `loadFirstPage` again.

**Show more**

`onLoadMore` runs only if `nextCursor` is set and nothing is already loading. It fetches with that cursor and appends `page.items`. It does not use `FlatList`’s `onEndReached`, so paging is a deliberate tap. That tap is one row in the browser Network tab.

When `nextCursor` is null and there is at least one book, the footer says “end of the catalog”.

**Save**

Trims title and author. ISBN is trimmed, and an empty string is sent as `null`. Edit calls `updateBook`. Create calls `createBook`. Then the form closes and the first page reloads, so the new or edited book shows up in the right order.

**Delete**

“remove” sets `pendingDeleteId`. “yes” calls `deleteBook`, then reloads the first page. If you were editing that book, the form closes too.

**Empty and loading**

First load with no rows yet: a spinner and “opening the catalog…”. After that, an empty result says “nothing on this shelf”, with different copy when a search is active.

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
| PUT | `/books/{id}` | bearer | admin | 200 book | 403, 404, 401, 422 |
| DELETE | `/books/{id}` | bearer | admin | 204 empty | 403, 404, 401 |

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
{ "title": "Circe", "author": "Madeline Miller", "isbn": "9780316556347" }
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
      "created_at": "2026-10-23T..."
    }
  ],
  "next_cursor": "eyJ0IjoiLi4uIiwiaWQiOiIuLi4ifQ"
}
```

`next_cursor` is base64. Decoded it is JSON `{"t":"<iso time>","id":"<uuid>"}`.

Authorized call:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

Swagger at `/docs` lists the same routes and can send them. You paste the access token in the Authorize box as `Bearer <token>` if the UI asks for a bearer value. The middleware wants the header itself to start with `Bearer `.

---

## 9. Screen behavior, side by side

| | Librarian (`admin`) | Reader (`user`) |
|---|---|---|
| How you get the account | seeded `admin`, or you cannot self-register into this role | seeded `reader`, or the register tab |
| Pill on the home screen | librarian | reader |
| Search | yes, debounced | yes, debounced |
| Show more | yes | yes |
| Add / edit / delete | yes | no controls, and the API returns 403 if they try anyway |
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
- No book ownership, loans, copies, or genres.
- No “get one book” button. The route exists. The UI does not call it.
- No infinite scroll. Paging is the “show more” button.
- No React Router / Expo Router. One boolean in `App.tsx`.
- No global state library (no Redux, no Zustand). State sits in the two screens.
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
`GET /books` orders by `created_at` desc, `id` desc, and returns `limit` rows plus a `next_cursor` that points at the last row of this page. The next request says “rows that sort after this timestamp and id”. The handler fetches `limit + 1` rows to know whether another page exists. The UI uses `limit=8` and a “show more” button. The API default if you omit `limit` is 10. The maximum is 50.

**What does debounce mean here?**  
`search` updates on every keystroke. `debouncedSearch` updates 400 ms after the user stops. The `useEffect` that calls the API depends on `debouncedSearch`, not on `search`.

**What is in session storage?**  
On web only: `bms_access_token`, `bms_refresh_token`, `bms_role`, `bms_username`. It is `sessionStorage`, so it lasts for the tab, not forever. Native uses a `Map` in memory instead.

**What happens when the access token expires?**  
The next book call gets 401. `apiFetch` posts the refresh token to `/auth/refresh`, saves the new access token, and retries once. If that fails, `books.ts` clears the session and the screen treats `"session expired"` as a logout.

**Why does the home screen say librarian if the database says admin?**  
Display label versus stored role. `canEdit` checks `role === "admin"`. The pill text is chosen in `HomeScreen` from that boolean.

**Why might two books with the same timestamp still page correctly?**  
The sort and the cursor both include `id` as a tie-break.

**Does search look at ISBN?**  
No. Only `title` and `author`.

**Is the database on AWS?**  
No. It is `backend/bms.db`. SQLAlchemy will talk to Postgres if `DATABASE_URL` is a `postgresql://` URL, because `psycopg2` is installed. Nothing in this project creates an RDS instance.

**What does `create_all` not do?**  
It does not change an existing table. If you add a column to a model, an old `bms.db` keeps the old shape until you delete the file or migrate it.

**Are there tests?**  
No.

---

## 12. A demo path that shows each requirement

1. Open http://localhost:8081 with DevTools.
2. **UI.** Tap the librarian card, then sign in. The catalog and “add a title” are the admin UI.
3. **Session storage.** Application → Session Storage. Four `bms_` keys. `bms_role` is `admin`.
4. **Network and API.** Search `austen`. After a short pause, one `GET /books?limit=8&q=austen`. That pause is the debounce. Open the response: `items` and `next_cursor`.
5. Clear the search. Press **show more**. The next `GET /books` includes a `cursor` query param. That is cursor pagination.
6. **CRUD.** Add a title. Network shows `POST /books` and 201. Edit it (`PUT`). Remove it (`DELETE`, status 204).
7. **Database.** `sqlite3 backend/bms.db` and select from `users` and `books`. The new book is a row. Passwords are hashes.
8. Sign out. Sign in as `reader` / `reader123`. The note replaces the form. No edit or remove. `bms_role` is `user`.
9. **RBAC.** In `/docs` or with curl, send `POST /books` with the reader’s access token. The body is `{"detail":"admin role required"}` and the status is 403.
10. **Register.** On the login screen, switch to register, create a new username. That row appears in `users` with role `user`, and you land on the reader screen.
