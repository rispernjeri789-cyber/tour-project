// Buckets a booking for display purposes only — derived from the real
// `status` enum (pending/confirmed/cancelled/completed) plus `travel_date`.
// There is no "active"/"upcoming" status in the backend.
export function classifyBooking(booking, today = new Date()) {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "completed") return "completed";

  const travelDate = booking.travel_date ? new Date(booking.travel_date) : null;
  if (booking.status === "confirmed" && travelDate && travelDate < today) {
    return "completed";
  }
  if (booking.status === "pending") return "pending";
  return "upcoming";
}

export const BOOKING_STATUS_LABEL = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const BOOKING_STATUS_BADGE_VARIANT = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
};
