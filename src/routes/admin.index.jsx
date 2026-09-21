import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hourglass, CheckCircle2, XCircle, Wallet } from "lucide-react";
import { listAllBookings } from "@/lib/api/admin";
import { formatKes } from "@/lib/format";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_BADGE_VARIANT } from "@/lib/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "bookings", "all"],
    queryFn: () => listAllBookings(),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading admin dashboard…</p>;
  if (isError) return <p className="text-red-600">Failed to load bookings: {error.message}</p>;

  const list = bookings || [];
  const buckets = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
  let totalRevenue = 0;
  for (const b of list) {
    if (buckets[b.status] !== undefined) buckets[b.status]++;
    if (b.status === "confirmed" || b.status === "completed") {
      totalRevenue += Number(b.total_price || 0);
    }
  }

  // created_at is assumed present on the booking for "recent" ordering;
  // if the API omits it, this falls back to whatever order it returned.
  const recent = [...list]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Admin Overview</h1>
        <p className="mt-1 text-muted-foreground">A snapshot of bookings across all customers.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Hourglass} label="Pending" value={buckets.pending} />
        <StatCard icon={CheckCircle2} label="Confirmed" value={buckets.confirmed} />
        <StatCard icon={XCircle} label="Cancelled" value={buckets.cancelled} />
        <StatCard
          icon={Wallet}
          label="Revenue (confirmed + completed)"
          value={formatKes(totalRevenue)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recent.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{b.tour_title}</p>
                    <p className="text-sm text-muted-foreground">
                      Ref: <span className="font-mono">{b.booking_reference}</span>
                    </p>
                  </div>
                  <Badge variant={BOOKING_STATUS_BADGE_VARIANT[b.status]}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Link to="/admin/bookings" className="text-sm text-primary hover:underline">
              Manage all bookings →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="rounded-full bg-accent p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
