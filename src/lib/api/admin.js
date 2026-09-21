import { apiFetch, getToken } from "./client";

export async function isAdmin() {
  if (!getToken()) return false;
  try {
    const data = await apiFetch("/api/auth/me");
    return Boolean(data?.user?.is_admin);
  } catch {
    return false;
  }
}

export function listAllBookings(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return apiFetch(`/api/admin/bookings${qs ? `?${qs}` : ""}`);
}

export function updateBookingStatus(bookingId, status) {
  return apiFetch(`/api/admin/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listAdminTours() {
  return apiFetch("/api/admin/tours");
}

export function createTour(payload) {
  return apiFetch("/api/admin/tours", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTour(tourId, payload) {
  return apiFetch(`/api/admin/tours/${tourId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listUsers() {
  return apiFetch("/api/admin/users");
}

export function getUserDetail(userId) {
  return apiFetch(`/api/admin/users/${userId}`);
}

export function setUserAdmin(userId, isAdmin) {
  return apiFetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_admin: isAdmin }),
  });
}

export function listAdminPayments() {
  return apiFetch("/api/admin/payments");
}

export function listAdminReviews() {
  return apiFetch("/api/admin/reviews");
}

export function listAdminNotifications() {
  return apiFetch("/api/admin/notifications");
}
