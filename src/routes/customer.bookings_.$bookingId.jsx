import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, MapPin, Users, XCircle } from "lucide-react";
import { listMyBookings, cancelBooking } from "@/lib/api/bookings";
import { getTour } from "@/lib/api/tours";
import { formatKes } from "@/lib/format";
import { downloadBookingIcs } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { PayNowCard } from "@/components/PayNowCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/customer/bookings_/$bookingId")({
  component: BookingDetail,
});

const STEPS = ["pending", "confirmed", "completed"];
const STEP_LABEL = { pending: "Pending", confirmed: "Confirmed", completed: "Completed" };

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const queryClient = useQueryClient();

  const {
    data: bookings,
    isLoading: bookingsLoading,
    isError: bookingsError,
  } = useQuery({
    queryKey: ["bookings", "me"],
    queryFn: listMyBookings,
  });

  const booking = bookings?.find((b) => b.id === bookingId);

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(booking.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings", "me"] });
    },
  });

  const { data: tour, isLoading: tourLoading } = useQuery({
    queryKey: ["tour", booking?.tour_id],
    queryFn: () => getTour(booking.tour_id),
    enabled: !!booking?.tour_id,
  });

  if (bookingsLoading) return <p className="text-muted-foreground">Loading booking…</p>;
  if (bookingsError) return <p className="text-red-600">Failed to load this booking.</p>;
  if (!booking) {
    return (
      <div>
        <p className="text-muted-foreground">We couldn't find that booking.</p>
        <Link
          to="/customer/bookings"
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          ← Back to bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/customer/bookings" className="text-sm text-muted-foreground hover:underline">
          ← Back to bookings
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-serif text-3xl font-bold">{booking.tour_title}</h1>
            {tour?.park?.name && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {tour.park.name}
              </p>
            )}
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            Ref: {booking.booking_reference}
          </p>
        </div>
      </div>

      {tour?.images?.[0] && (
        <div className="aspect-[21/9] w-full overflow-hidden rounded-xl bg-muted">
          <img
            src={tour.images[0]}
            alt={booking.tour_title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <StatusTracker status={booking.status} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trip facts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {booking.travel_date || "Date to be confirmed"}
                </span>
                {tour?.duration_days && (
                  <span>
                    {tour.duration_days} day{tour.duration_days !== 1 ? "s" : ""}
                    {tour.duration_nights ? ` / ${tour.duration_nights} nights` : ""}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                  {booking.children
                    ? `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`
                    : ""}
                </span>
              </div>

              {!tourLoading && (tour?.includes?.length > 0 || tour?.excludes?.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {tour?.includes?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Included</p>
                      <ul className="mt-1 flex flex-col gap-1">
                        {tour.includes.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-sm text-muted-foreground"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour?.excludes?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Not included</p>
                      <ul className="mt-1 flex flex-col gap-1">
                        {tour.excludes.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-sm text-muted-foreground"
                          >
                            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Itinerary</CardTitle>
            </CardHeader>
            <CardContent>
              <ItineraryList itinerary={tour?.itinerary} />
            </CardContent>
          </Card>

          {booking.special_requests && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{booking.special_requests}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What to bring</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc text-sm text-muted-foreground [&>li]:mt-1">
                <li>Valid passport (6+ months validity) and any required visas</li>
                <li>Comfortable, neutral-colored clothing and sturdy walking shoes</li>
                <li>Sunscreen, hat, and insect repellent</li>
                <li>Binoculars and a camera for game drives</li>
                <li>Any personal medication and a basic first-aid kit</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <PayNowCard booking={booking} />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatKes(booking.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fees</span>
                <span>{formatKes(booking.fees)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatKes(booking.total_price)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={!booking.travel_date}
                onClick={() => downloadBookingIcs(booking, tour)}
              >
                Add to calendar
              </Button>

              {(booking.status === "pending" || booking.status === "confirmed") && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={cancelMutation.isPending}>
                      {cancelMutation.isPending ? "Cancelling…" : "Cancel booking"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {booking.status === "confirmed"
                          ? "This trip has already been paid for. Cancelling will not automatically refund you — contact support if you need a refund."
                          : "Are you sure you want to cancel this booking? This can't be undone."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep booking</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancelMutation.mutate()}>
                        Yes, cancel it
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {cancelMutation.isError && (
                <p className="text-xs text-red-600">{cancelMutation.error.message}</p>
              )}

              <p className="text-xs text-muted-foreground">
                Questions about this trip?{" "}
                <Link to="/customer/support" className="text-primary hover:underline">
                  Contact us
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusTracker({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <XCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">This booking was cancelled</span>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => (
        <div key={step} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold",
                i <= currentIndex
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "text-xs",
                i <= currentIndex ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {STEP_LABEL[step]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 mb-4 h-0.5 flex-1",
                i < currentIndex ? "bg-primary" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ItineraryList({ itinerary }) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) {
    return <p className="text-sm text-muted-foreground">Itinerary details coming soon.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {itinerary.map((entry, i) => {
        if (typeof entry === "string") {
          return (
            <li key={i} className="flex gap-3">
              <span className="text-sm font-semibold text-primary">Day {i + 1}</span>
              <span className="text-sm text-muted-foreground">{entry}</span>
            </li>
          );
        }

        const day = entry?.day ?? i + 1;
        const title = entry?.title;
        const description = entry?.description;

        return (
          <li key={i} className="flex gap-3">
            <span className="shrink-0 text-sm font-semibold text-primary">Day {day}</span>
            <div>
              {title && <p className="text-sm font-medium">{title}</p>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
              {!title && !description && (
                <p className="text-sm text-muted-foreground">{JSON.stringify(entry)}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
