import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listAdminPayments } from "@/lib/api/admin";
import { formatKes } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const STATUS_LABEL = {
  pending: "Pending",
  succeeded: "Paid",
  failed: "Failed",
};

const STATUS_BADGE_VARIANT = {
  pending: "secondary",
  succeeded: "default",
  failed: "destructive",
};

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  const {
    data: payments,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: listAdminPayments,
  });

  return (
    <div>
      <div>
        <h1 className="font-serif text-3xl font-bold">Payments</h1>
        <p className="mt-1 text-muted-foreground">Every payment across every customer.</p>
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading payments…</p>}
      {isError && <p className="mt-8 text-red-600">Failed to load payments: {error.message}</p>}

      {payments && (
        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No payments yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      {p.booking_reference || "—"}
                    </TableCell>
                    <TableCell>{p.user_name || p.user_email || "—"}</TableCell>
                    <TableCell>{p.tour_title || "—"}</TableCell>
                    <TableCell>{formatKes(p.amount)}</TableCell>
                    <TableCell className="capitalize">{p.method}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[p.status]}>
                        {STATUS_LABEL[p.status] || p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-KE") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
