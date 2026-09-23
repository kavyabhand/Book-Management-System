from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import init_db
from app.routers import books


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Book Management System", lifespan=lifespan)

app.include_router(books.router)


@app.get("/health")
def health():
    return {"status": "ok"}
