import { apiFetch } from "./client";

export function listMyReviews() {
  return apiFetch("/api/reviews/me");
}

export function listTourReviews(tourId) {
  return apiFetch(`/api/tours/${tourId}/reviews`);
}

export function createReview(bookingId, { rating, comment }) {
  return apiFetch(`/api/bookings/${bookingId}/review`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
}
