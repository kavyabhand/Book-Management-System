# Book Management System

Simple full-stack app to list and add books.

## Stack

- **Frontend:** React Native (Expo) — mobile, web, desktop
- **Backend:** Python FastAPI
- **Database:** SQL (SQLite locally; AWS RDS in production)

## Project layout

```
bms/
├── backend/     # FastAPI API
└── frontend/    # Expo app
```

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

Optional: copy `.env.example` to `.env` and set `DATABASE_URL` (defaults to `sqlite:///./bms.db`).

## Frontend

```bash
cd frontend
npm install
npm start
```

Set the API base URL in `frontend/src/config.ts`. Use your machine’s LAN IP when testing on a physical device (not `127.0.0.1`).

Run the backend before the app so list/add requests succeed.

## API (books)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/books` | List books |
| GET | `/books/{id}` | Get one book |
| POST | `/books` | Create book |
| PUT | `/books/{id}` | Update book |
| DELETE | `/books/{id}` | Delete book |
