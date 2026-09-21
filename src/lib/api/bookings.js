import { apiFetch } from "./client";

export function createBooking(payload) {
  return apiFetch("/api/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listMyBookings() {
  return apiFetch("/api/bookings/me");
}

export function cancelBooking(bookingId) {
  return apiFetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
}
