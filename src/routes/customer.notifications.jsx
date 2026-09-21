import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bell, CalendarCheck, XCircle, CreditCard, AlertTriangle } from "lucide-react";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/notifications")({
  component: Notifications,
});

const TYPE_ICON = {
  booking_created: CalendarCheck,
  booking_confirmed: CalendarCheck,
  booking_completed: CalendarCheck,
  booking_cancelled: XCircle,
  payment_succeeded: CreditCard,
  payment_failed: AlertTriangle,
};

function Notifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["notifications", "me"],
    queryFn: listMyNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", "me"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", "me"] }),
  });

  const notifications = data?.notifications || [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Updates about your bookings and trips.</p>
        </div>
        {data?.unread_count > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading notifications…</p>}
      {isError && (
        <p className="mt-8 text-red-600">Failed to load notifications: {error.message}</p>
      )}

      {!isLoading && notifications.length === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-accent p-3">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">No notifications yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              We'll let you know here when there's an update on your bookings or payments.
            </p>
          </CardContent>
        </Card>
      )}

      {notifications.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] || Bell;

            const openNotification = () => {
              if (!n.is_read) markReadMutation.mutate(n.id);
              if (n.booking_id) {
                navigate({
                  to: "/customer/bookings/$bookingId",
                  params: { bookingId: n.booking_id },
                });
              }
            };

            return (
              <Card
                key={n.id}
                role={n.booking_id ? "button" : undefined}
                tabIndex={n.booking_id ? 0 : undefined}
                onClick={n.booking_id ? openNotification : undefined}
                onKeyDown={
                  n.booking_id
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openNotification();
                        }
                      }
                    : undefined
                }
                className={cn(
                  !n.is_read && "border-primary/40 bg-accent/40",
                  n.booking_id && "cursor-pointer transition hover:shadow-md",
                )}
              >
                <CardContent className="flex items-start gap-3 pt-6">
                  <div className="rounded-full bg-accent p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.created_at ? new Date(n.created_at).toLocaleString("en-KE") : ""}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(n.id);
                      }}
                      disabled={markReadMutation.isPending}
                      className="shrink-0"
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
