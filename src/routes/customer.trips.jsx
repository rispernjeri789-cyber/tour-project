import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plane, Star, MapPin } from "lucide-react";
import { listMyBookings } from "@/lib/api/bookings";
import { listMyReviews, createReview } from "@/lib/api/reviews";
import { classifyBooking } from "@/lib/bookings";
import { formatKes } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/trips")({
  component: Trips,
});

function Trips() {
  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["bookings", "me"],
    queryFn: listMyBookings,
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", "me"],
    queryFn: listMyReviews,
  });

  const reviewedBookingIds = new Set((reviews || []).map((r) => r.booking_id));

  const today = new Date();
  const trips = (bookings || [])
    .filter((b) => classifyBooking(b, today) === "completed")
    .sort((a, b) => new Date(b.travel_date || 0) - new Date(a.travel_date || 0));

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">My Trips</h1>
      <p className="mt-1 text-muted-foreground">A timeline of the safaris you've been on.</p>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading your trips…</p>}
      {isError && <p className="mt-8 text-red-600">Failed to load your trips: {error.message}</p>}

      {!isLoading && trips.length === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-accent p-3">
              <Plane className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">No completed trips yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Once a booked safari's travel date has passed, it'll show up here.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link to="/tours">Browse tours</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {trips.length > 0 && (
        <ol className="relative mt-8 flex flex-col gap-6 border-l border-border pl-6">
          {trips.map((trip) => (
            <li key={trip.id} className="relative">
              <span className="absolute -left-7.25 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
              <TripCard trip={trip} reviewed={reviewedBookingIds.has(trip.id)} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TripCard({ trip, reviewed }) {
  const [reviewing, setReviewing] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">{trip.travel_date}</p>
            <Link
              to="/customer/bookings/$bookingId"
              params={{ bookingId: trip.id }}
              className="text-lg font-semibold hover:underline"
            >
              {trip.tour_title}
            </Link>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {trip.adults} adult{trip.adults !== 1 ? "s" : ""}
              {trip.children ? `, ${trip.children} child${trip.children !== 1 ? "ren" : ""}` : ""}
            </p>
          </div>
          <p className="font-semibold text-primary">{formatKes(trip.total_price)}</p>
        </div>

        {reviewed ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            You reviewed this trip.
          </p>
        ) : reviewing ? (
          <ReviewForm bookingId={trip.id} onDone={() => setReviewing(false)} />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setReviewing(true)}
          >
            Leave a review
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewForm({ bookingId, onDone }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () => createReview(bookingId, { rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", "me"] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-2 rounded-lg border border-border p-3"
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n !== 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "h-5 w-5",
                n <= rating ? "fill-primary text-primary" : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="How was your safari?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting…" : "Submit review"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
