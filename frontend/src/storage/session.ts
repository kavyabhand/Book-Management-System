import { Platform } from "react-native";

const ACCESS_KEY = "bms_access_token";
const REFRESH_KEY = "bms_refresh_token";
const ROLE_KEY = "bms_role";
const USERNAME_KEY = "bms_username";

function webStorage(): Storage | null {
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    return sessionStorage;
  }
  return null;
}

const memory = new Map<string, string>();

export function setSession(tokens: {
  accessToken: string;
  refreshToken: string;
  role: string;
  username: string;
}) {
  const store = webStorage();
  if (store) {
    store.setItem(ACCESS_KEY, tokens.accessToken);
    store.setItem(REFRESH_KEY, tokens.refreshToken);
    store.setItem(ROLE_KEY, tokens.role);
    store.setItem(USERNAME_KEY, tokens.username);
    return;
  }
  memory.set(ACCESS_KEY, tokens.accessToken);
  memory.set(REFRESH_KEY, tokens.refreshToken);
  memory.set(ROLE_KEY, tokens.role);
  memory.set(USERNAME_KEY, tokens.username);
}

export function clearSession() {
  const store = webStorage();
  if (store) {
    store.removeItem(ACCESS_KEY);
    store.removeItem(REFRESH_KEY);
    store.removeItem(ROLE_KEY);
    store.removeItem(USERNAME_KEY);
    return;
  }
  memory.clear();
}

export function getAccessToken() {
  const store = webStorage();
  return store ? store.getItem(ACCESS_KEY) : memory.get(ACCESS_KEY) ?? null;
}

export function getRefreshToken() {
  const store = webStorage();
  return store ? store.getItem(REFRESH_KEY) : memory.get(REFRESH_KEY) ?? null;
}

export function getRole() {
  const store = webStorage();
  return store ? store.getItem(ROLE_KEY) : memory.get(ROLE_KEY) ?? null;
}

export function getUsername() {
  const store = webStorage();
  return store ? store.getItem(USERNAME_KEY) : memory.get(USERNAME_KEY) ?? null;
}

export function setAccessToken(token: string) {
  const store = webStorage();
  if (store) {
    store.setItem(ACCESS_KEY, token);
    return;
  }
  memory.set(ACCESS_KEY, token);
}
