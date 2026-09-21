import { apiFetch } from "./client";

export function listMyWishlist() {
  return apiFetch("/api/wishlist/me");
}

export function addToWishlist(tourId) {
  return apiFetch("/api/wishlist", {
    method: "POST",
    body: JSON.stringify({ tour_id: tourId }),
  });
}

export function removeFromWishlist(tourId) {
  return apiFetch(`/api/wishlist/${tourId}`, { method: "DELETE" });
}
