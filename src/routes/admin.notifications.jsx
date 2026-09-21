import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listAdminNotifications } from "@/lib/api/admin";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

function AdminNotifications() {
  const {
    data: notifications,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: listAdminNotifications,
  });

  return (
    <div>
      <div>
        <h1 className="font-serif text-3xl font-bold">Notifications</h1>
        <p className="mt-1 text-muted-foreground">Every notification sent to every customer.</p>
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading notifications…</p>}
      {isError && (
        <p className="mt-8 text-red-600">Failed to load notifications: {error.message}</p>
      )}

      {notifications && (
        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Read</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No notifications yet.
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{n.user_name || n.user_email || "—"}</TableCell>
                    <TableCell>{n.title}</TableCell>
                    <TableCell>{n.type}</TableCell>
                    <TableCell>
                      <Badge variant={n.is_read ? "outline" : "secondary"}>
                        {n.is_read ? "Read" : "Unread"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {n.created_at ? new Date(n.created_at).toLocaleDateString("en-KE") : "—"}
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
