const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("ngt_token");
}
export function setToken(token) {
  if (token) localStorage.setItem("ngt_token", token);
  else localStorage.removeItem("ngt_token");
}

export async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ignore non-JSON */
  }

  if (!res.ok) {
    if (res.status === 401) setToken(null);

    const message = (data && (data.error || data.message)) || res.statusText || "Request failed";
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}
