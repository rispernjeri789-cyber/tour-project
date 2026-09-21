import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { listAllBookings, updateBookingStatus } from "@/lib/api/admin";
import { formatKes } from "@/lib/format";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_BADGE_VARIANT } from "@/lib/bookings";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "completed"];

const adminBookingsSearchSchema = z.object({
  status: z.enum(["all", ...STATUS_OPTIONS]).catch("all"),
});

export const Route = createFileRoute("/admin/bookings")({
  validateSearch: adminBookingsSearchSchema,
  component: AdminBookings,
});

function AdminBookings() {
  const { status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    // Assumes /api/admin/bookings honors a `status` querystring filter;
    // if not, drop the filter here and filter `bookings` client-side instead.
    queryKey: ["admin", "bookings", status],
    queryFn: () => listAllBookings(status === "all" ? {} : { status }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ bookingId, status: newStatus }) => updateBookingStatus(bookingId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Bookings</h1>
          <p className="mt-1 text-muted-foreground">
            Review and update bookings from every customer.
          </p>
        </div>

        <Select value={status} onValueChange={(value) => navigate({ search: { status: value } })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {BOOKING_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading bookings…</p>}
      {isError && <p className="mt-8 text-red-600">Failed to load bookings: {error.message}</p>}

      {bookings && (
        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Travel date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Update status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No bookings match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((b) => {
                  const isUpdating =
                    statusMutation.isPending && statusMutation.variables?.bookingId === b.id;
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.booking_reference}</TableCell>
                      <TableCell>{b.tour_title}</TableCell>
                      <TableCell>{b.customer_name || b.customer_email || "—"}</TableCell>
                      <TableCell>{b.travel_date || "—"}</TableCell>
                      <TableCell>{formatKes(b.total_price)}</TableCell>
                      <TableCell>
                        <Badge variant={BOOKING_STATUS_BADGE_VARIANT[b.status]}>
                          {BOOKING_STATUS_LABEL[b.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={b.status}
                          disabled={isUpdating}
                          onValueChange={(newStatus) =>
                            statusMutation.mutate({ bookingId: b.id, status: newStatus })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {BOOKING_STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {statusMutation.isError && (
        <p className="mt-4 text-sm text-red-600">
          Failed to update status: {statusMutation.error.message}
        </p>
      )}
    </div>
  );
}
