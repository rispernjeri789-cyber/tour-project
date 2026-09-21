import { apiFetch } from "./client";

export function initiatePayment(bookingId, { method = "mpesa", phoneNumber } = {}) {
  return apiFetch(`/api/bookings/${bookingId}/pay`, {
    method: "POST",
    body: JSON.stringify({ method, phone_number: phoneNumber }),
  });
}

export function getBookingPayment(bookingId) {
  return apiFetch(`/api/bookings/${bookingId}/payment`);
}

export function cancelPayment(bookingId) {
  return apiFetch(`/api/bookings/${bookingId}/payment/cancel`, { method: "POST" });
}

export function listMyPayments() {
  return apiFetch("/api/payments/me");
}
