import { API_URL } from "../config";
import { setSession } from "../storage/session";

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "login failed"));
  }

  const data = await res.json();
  setSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    role: data.role,
    username,
  });
  return data;
}

async function errorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") {
      return data.detail;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export async function register(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "registration failed"));
  }

  const data = await res.json();
  setSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    role: data.role,
    username,
  });
  return data;
}
