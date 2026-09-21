import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { initiatePayment, getBookingPayment, cancelPayment } from "@/lib/api/payments";
import { formatKes } from "@/lib/format";
import { useAuth } from "@/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

export function PayNowCard({ booking }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState("mpesa");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [polling, setPolling] = useState(false);
  const [payment, setPayment] = useState(null);
  const [pollError, setPollError] = useState("");
  const pollTimeoutRef = useRef(null);
  const pollDeadlineRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(pollTimeoutRef.current);
  }, []);

  const payMutation = useMutation({
    mutationFn: () => initiatePayment(booking.id, { method, phoneNumber }),
    onSuccess: (data) => {
      setPollError("");
      if (data.status === "succeeded") {
        setPayment({ status: "succeeded", method });
        queryClient.invalidateQueries({ queryKey: ["bookings", "me"] });
        queryClient.invalidateQueries({ queryKey: ["payments", "me"] });
        return;
      }
      setPayment({ status: "pending", method });
      pollDeadlineRef.current = Date.now() + POLL_TIMEOUT_MS;
      setPolling(true);
      schedulePoll();
    },
  });

  const schedulePoll = () => {
    pollTimeoutRef.current = setTimeout(async () => {
      try {
        const { payment: latest } = await getBookingPayment(booking.id);
        if (latest) setPayment(latest);

        if (latest?.status === "succeeded") {
          setPolling(false);
          queryClient.invalidateQueries({ queryKey: ["bookings", "me"] });
          queryClient.invalidateQueries({ queryKey: ["payments", "me"] });
          return;
        }
        if (latest?.status === "failed") {
          setPolling(false);
          return;
        }
        if (Date.now() > pollDeadlineRef.current) {
          setPolling(false);
          setPollError(
            "We haven't heard back from M-Pesa yet. Check your phone — if you already paid, this page will update shortly.",
          );
          return;
        }
        schedulePoll();
      } catch (err) {
        setPolling(false);
        setPollError(err.message);
      }
    }, POLL_INTERVAL_MS);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    payMutation.mutate();
  };

  const cancelMutation = useMutation({
    mutationFn: () => cancelPayment(booking.id),
    onSuccess: () => {
      clearTimeout(pollTimeoutRef.current);
      setPolling(false);
      setPayment(null);
      setPollError("");
    },
  });

  // Once the booking itself is confirmed — whether that happened just now
  // in this session or on a previous visit — treat payment as settled even
  // if we don't have a local record of how it was paid. This keeps the
  // success message on screen instead of the card vanishing the moment
  // `booking.status` flips away from "pending".
  const status = payment?.status || (booking.status === "confirmed" ? "succeeded" : undefined);
  const disableInputs = payMutation.isPending || polling;

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-lg">Pay now</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === "succeeded" ? (
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" />
            {payment?.method === "cash"
              ? "Booking confirmed — pay in cash on the day of travel."
              : "Payment received — your booking is confirmed."}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Pay {formatKes(booking.total_price)} to confirm this booking.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMethod("mpesa")}
                disabled={disableInputs}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50",
                  method === "mpesa"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                M-Pesa
              </button>
              <button
                type="button"
                onClick={() => setMethod("cash")}
                disabled={disableInputs}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50",
                  method === "cash"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                Cash
              </button>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-2">
              {method === "mpesa" && (
                <>
                  <Label htmlFor="phone_number">M-Pesa phone number</Label>
                  <Input
                    id="phone_number"
                    placeholder="0712345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={disableInputs}
                    required
                  />
                </>
              )}

              {method === "cash" && (
                <p className="text-xs text-muted-foreground">
                  Your booking will be confirmed now. Pay {formatKes(booking.total_price)} in cash
                  on the day of travel.
                </p>
              )}

              <Button type="submit" disabled={disableInputs} className="mt-1">
                {payMutation.isPending || polling ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {payMutation.isPending ? "Sending prompt…" : "Waiting for confirmation…"}
                  </span>
                ) : method === "cash" ? (
                  "Confirm cash payment"
                ) : (
                  "Pay with M-Pesa"
                )}
              </Button>

              {polling && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  {cancelMutation.isPending ? "Cancelling…" : "Cancel payment"}
                </Button>
              )}
            </form>

            {polling && (
              <p className="text-xs text-muted-foreground">
                Check your phone for the M-Pesa prompt and enter your PIN to complete payment. If
                you didn't get it or entered the wrong number, cancel and try again.
              </p>
            )}
            {cancelMutation.isError && (
              <p className="text-xs text-red-600">{cancelMutation.error.message}</p>
            )}
            {status === "failed" && (
              <p className="text-xs text-red-600">
                {payment?.result_desc || "Payment failed. Please try again."}
              </p>
            )}
            {payMutation.isError && (
              <p className="text-xs text-red-600">{payMutation.error.message}</p>
            )}
            {pollError && <p className="text-xs text-red-600">{pollError}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
