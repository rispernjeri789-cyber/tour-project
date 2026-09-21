import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { listMyBookings } from "@/lib/api/bookings";
import { initiatePayment, getBookingPayment, cancelPayment } from "@/lib/api/payments";
import { formatKes } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  classifyBooking,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_BADGE_VARIANT,
} from "@/lib/bookings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const bookingsSearchSchema = z.object({
  tab: z.enum(["upcoming", "active", "completed", "cancelled"]).catch("upcoming"),
});

export const Route = createFileRoute("/customer/bookings")({
  validateSearch: bookingsSearchSchema,
  component: MyBookings,
});

const TABS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function bucketFor(booking, today) {
  const base = classifyBooking(booking, today);
  if (base === "pending") return "upcoming";
  if (base === "upcoming" && booking.travel_date) {
    const travelDate = new Date(booking.travel_date);
    if (
      travelDate.getFullYear() === today.getFullYear() &&
      travelDate.getMonth() === today.getMonth() &&
      travelDate.getDate() === today.getDate()
    ) {
      return "active";
    }
  }
  return base;
}

function MyBookings() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["bookings", "me"],
    queryFn: listMyBookings,
  });

  const today = new Date();

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">My Bookings</h1>
      <p className="mt-1 text-muted-foreground">
        Every safari you've booked with us, in one place.
      </p>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading your bookings…</p>}
      {isError && <p className="mt-8 text-red-600">Failed to load bookings: {error.message}</p>}

      {bookings && (
        <Tabs
          value={tab}
          onValueChange={(value) => navigate({ search: { tab: value } })}
          className="mt-6"
        >
          <TabsList className="flex-wrap">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => {
            const filtered = bookings
              .filter((b) => bucketFor(b, today) === t.value)
              .sort((a, b) => {
                const dateA = a.travel_date ? new Date(a.travel_date) : new Date(a.created_at);
                const dateB = b.travel_date ? new Date(b.travel_date) : new Date(b.created_at);
                return dateA - dateB;
              });
            return (
              <TabsContent key={t.value} value={t.value} className="flex flex-col gap-4">
                {filtered.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Nothing here yet — your first safari is one click away.{" "}
                    <Link to="/tours" className="text-primary hover:underline">
                      Explore tours
                    </Link>
                  </p>
                ) : (
                  filtered.map((b) => <BookingCard key={b.id} booking={b} />)
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

function BookingCard({ booking }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{booking.tour_title}</p>
            <Badge variant={BOOKING_STATUS_BADGE_VARIANT[booking.status]}>
              {BOOKING_STATUS_LABEL[booking.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.travel_date || "Date to be confirmed"} · {booking.adults} adult
            {booking.adults !== 1 ? "s" : ""}
            {booking.children
              ? `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`
              : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ref: <span className="font-mono">{booking.booking_reference}</span>
          </p>
          {booking.special_requests && (
            <p className="mt-2 text-sm text-muted-foreground">Note: {booking.special_requests}</p>
          )}
          <Link
            to="/customer/bookings/$bookingId"
            params={{ bookingId: booking.id }}
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            View details →
          </Link>
        </div>

        <div className="text-right">
          <p className="font-semibold text-primary">{formatKes(booking.total_price)}</p>
          <p className="text-xs text-muted-foreground">
            {formatKes(booking.subtotal)} + {formatKes(booking.fees)} fees
          </p>
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <PaymentAction booking={booking} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentAction({ booking }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState("mpesa");
  const [phone, setPhone] = useState("");
  const [polling, setPolling] = useState(false);
  const [cashConfirmed, setCashConfirmed] = useState(false);

  const payMutation = useMutation({
    mutationFn: () => initiatePayment(booking.id, { method, phoneNumber: phone }),
    onSuccess: (data) => {
      if (data.status === "succeeded") {
        setCashConfirmed(true);
        queryClient.invalidateQueries({ queryKey: ["bookings", "me"] });
        queryClient.invalidateQueries({ queryKey: ["payments", "me"] });
      } else {
        setPolling(true);
      }
    },
  });

  const { data: paymentData } = useQuery({
    queryKey: ["payment", booking.id],
    queryFn: () => getBookingPayment(booking.id),
    enabled: polling,
    refetchInterval: (query) => {
      const status = query.state.data?.payment?.status;
      return status === "pending" ? 3000 : false;
    },
  });

  const payment = paymentData?.payment;

  useEffect(() => {
    if (payment?.status === "succeeded") {
      queryClient.invalidateQueries({ queryKey: ["bookings", "me"] });
    }
  }, [payment?.status, queryClient]);

  const cancelMutation = useMutation({
    mutationFn: () => cancelPayment(booking.id),
    onSuccess: () => {
      setPolling(false);
      queryClient.setQueryData(["payment", booking.id], null);
    },
  });

  // Once the booking itself is confirmed — this session's payment or a
  // previous one — always show the persistent success message instead of
  // letting the widget vanish the instant `booking.status` changes.
  if (booking.status === "confirmed" || payment?.status === "succeeded" || cashConfirmed) {
    return (
      <p className="mt-2 text-xs text-primary">
        {cashConfirmed || payment?.method === "cash"
          ? "Confirmed — pay by cash on the day of travel."
          : "Payment received — confirmed."}
      </p>
    );
  }

  if (payment?.status === "pending" || (polling && !payment)) {
    return (
      <div className="mt-2 flex flex-col items-end gap-1">
        <p className="max-w-55 text-right text-xs text-muted-foreground">
          Check your phone and enter your M-Pesa PIN to complete payment…
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={cancelMutation.isPending}
          onClick={() => cancelMutation.mutate()}
        >
          {cancelMutation.isPending ? "Cancelling…" : "Cancel"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col items-end gap-1">
      {payment?.status === "failed" && (
        <p className="max-w-55 text-right text-xs text-red-600">
          {payment.result_desc || "Payment failed. Please try again."}
        </p>
      )}
      {payMutation.isError && (
        <p className="max-w-55 text-right text-xs text-red-600">{payMutation.error.message}</p>
      )}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMethod("mpesa")}
          className={cn(
            "rounded-md border px-2 py-1 text-xs font-medium",
            method === "mpesa"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          M-Pesa
        </button>
        <button
          type="button"
          onClick={() => setMethod("cash")}
          className={cn(
            "rounded-md border px-2 py-1 text-xs font-medium",
            method === "cash"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          Cash
        </button>
      </div>
      <div className="flex items-center gap-1">
        {method === "mpesa" && (
          <Input
            type="tel"
            placeholder="0712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-8 w-32 text-xs"
          />
        )}
        <Button
          size="sm"
          disabled={payMutation.isPending || (method === "mpesa" && !phone)}
          onClick={() => {
            setPolling(false);
            payMutation.mutate();
          }}
        >
          {payMutation.isPending
            ? "Sending…"
            : method === "cash"
              ? "Confirm cash"
              : "Pay with M-Pesa"}
        </Button>
      </div>
    </div>
  );
}
