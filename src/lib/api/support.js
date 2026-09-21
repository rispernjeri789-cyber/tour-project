import { apiFetch } from "./client";

export function listMySupportMessages() {
  return apiFetch("/api/support/me");
}

export function createSupportMessage({ subject, message }) {
  return apiFetch("/api/support", {
    method: "POST",
    body: JSON.stringify({ subject, message }),
  });
}
