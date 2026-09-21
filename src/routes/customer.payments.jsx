import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMyPayments } from "@/lib/api/payments";
import { formatKes } from "@/lib/format";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/customer/payments")({
  component: Payments,
});

const PAYMENT_STATUS_LABEL = {
  pending: "Pending",
  succeeded: "Paid",
  failed: "Failed",
};

const PAYMENT_STATUS_BADGE_VARIANT = {
  pending: "secondary",
  succeeded: "default",
  failed: "destructive",
};

function Payments() {
  const {
    data: payments,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["payments", "me"],
    queryFn: listMyPayments,
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">Payments</h1>
      <p className="mt-1 text-muted-foreground">Your payment history and receipts, in one place.</p>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading payments…</p>}
      {isError && <p className="mt-8 text-red-600">Failed to load payments: {error.message}</p>}

      {payments && payments.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">No payments yet.</p>
      )}

      {payments && payments.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{p.tour_title || "Safari booking"}</p>
                    <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[p.status]}>
                      {PAYMENT_STATUS_LABEL[p.status] || p.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString("en-KE") : ""}
                    {p.booking_reference ? ` · Ref: ${p.booking_reference}` : ""}
                  </p>
                  {p.mpesa_receipt_number && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Receipt: <span className="font-mono">{p.mpesa_receipt_number}</span>
                    </p>
                  )}
                  {p.status === "failed" && p.result_desc && (
                    <p className="mt-1 text-xs text-red-600">{p.result_desc}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p className="font-semibold text-primary">{formatKes(p.amount)}</p>
                  {p.status === "succeeded" && <ReceiptDialog payment={p} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
