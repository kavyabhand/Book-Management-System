from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.security import decode_access_token

PUBLIC_PREFIXES = (
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
)


def _is_public(path: str) -> bool:
    return any(path == p or path.startswith(p + "/") for p in PUBLIC_PREFIXES)


class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if _is_public(request.url.path) or request.method == "OPTIONS":
            return await call_next(request)

        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return JSONResponse({"detail": "missing bearer token"}, status_code=401)

        token = auth.removeprefix("Bearer ").strip()
        try:
            payload = decode_access_token(token)
            request.state.user_id = payload["sub"]
            request.state.role = payload["role"]
        except ValueError:
            return JSONResponse({"detail": "invalid or expired token"}, status_code=401)

        return await call_next(request)


class RBACMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if _is_public(request.url.path) or request.method == "OPTIONS":
            return await call_next(request)

        role = getattr(request.state, "role", None)
        if request.url.path.startswith("/books") and request.method in {
            "POST",
            "PUT",
            "DELETE",
        }:
            if role != "admin":
                return JSONResponse({"detail": "admin role required"}, status_code=403)

        return await call_next(request)
