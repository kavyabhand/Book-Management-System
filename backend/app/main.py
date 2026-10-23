from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.middleware.auth_rbac import JWTAuthMiddleware, RBACMiddleware
from app.routers import auth, books


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Book Management System", lifespan=lifespan)

app.add_middleware(RBACMiddleware)
app.add_middleware(JWTAuthMiddleware)
# added last so it's outermost and 401/403 responses still get CORS headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)


@app.get("/health")
def health():
    return {"status": "ok"}
