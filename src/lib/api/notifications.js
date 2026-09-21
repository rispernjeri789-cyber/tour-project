import { apiFetch } from "./client";

export function listMyNotifications() {
  return apiFetch("/api/notifications/me");
}

export function markNotificationRead(notificationId) {
  return apiFetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return apiFetch("/api/notifications/read-all", { method: "POST" });
}
