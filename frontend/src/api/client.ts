import { API_URL } from "../config";
import { clearSession, getAccessToken, getRefreshToken, setAccessToken } from "../storage/session";

export async function readBody<T>(res: Response, fallback: string): Promise<T> {
  if (res.status === 401) {
    clearSession();
    throw new Error("session expired");
  }
  if (!res.ok) {
    let detail = fallback;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") {
        detail = data.detail;
      }
    } catch {
      detail = fallback;
    }
    throw new Error(detail);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    return false;
  }

  const data = await res.json();
  setAccessToken(data.access_token);
  return true;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && (await refreshAccessToken())) {
    const retryHeaders = new Headers(options.headers);
    if (!retryHeaders.has("Content-Type") && options.body) {
      retryHeaders.set("Content-Type", "application/json");
    }
    retryHeaders.set("Authorization", `Bearer ${getAccessToken()}`);
    res = await fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders });
  }

  return res;
}
