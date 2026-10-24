from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.middleware.auth_rbac import JWTAuthMiddleware, RBACMiddleware
from app.routers import auth, books, loans, saved


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Book Management System",
    version="1.0.0",
    description=(
        "1. POST /auth/login with admin / admin123 or reader / reader123.\n"
        "2. Copy access_token.\n"
        "3. Click Authorize and paste the token only, not the word Bearer.\n"
        "4. Book reads, loans, and the reading list work for any logged-in role. Create, update, and delete need admin. GET /loans (every loan) is admin only."
    ),
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan,
)

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
app.include_router(loans.router)
app.include_router(saved.router)


@app.get("/health")
def health():
    return {"status": "ok"}
