import { API_URL } from "../config";
import { getAccessToken, getRefreshToken, setAccessToken } from "../storage/session";

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
