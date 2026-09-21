import { apiFetch } from "./client";

export function listParks() {
  return apiFetch("/api/parks");
}

export function listTours(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return apiFetch(`/api/tours${qs ? `?${qs}` : ""}`);
}

export function getTour(tourId) {
  return apiFetch(`/api/tours/${tourId}`);
}
