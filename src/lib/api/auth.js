import { apiFetch, setToken, getToken } from "./client";

export async function signup({ email, password, full_name, phone }) {
  const data = await apiFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name, phone }),
  });
  setToken(data.token);
  return data.user;
}

export async function login({ email, password }) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export function logout() {
  setToken(null);
}

export async function me() {
  if (!getToken()) return null;
  try {
    const data = await apiFetch("/api/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function updateMe(payload) {
  const data = await apiFetch("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.user;
}
