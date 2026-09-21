import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { listUsers, setUserAdmin, getUserDetail } from "@/lib/api/admin";
import { useAuth } from "@/auth/useAuth";
import { formatKes } from "@/lib/format";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_BADGE_VARIANT } from "@/lib/bookings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState(null);

  const {
    data: users,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: listUsers,
  });

  const adminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }) => setUserAdmin(userId, isAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  return (
    <div>
      <div>
        <h1 className="font-serif text-3xl font-bold">Users</h1>
        <p className="mt-1 text-muted-foreground">
          Everyone with an account, and who has admin access.
        </p>
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading users…</p>}
      {isError && <p className="mt-8 text-red-600">Failed to load users: {error.message}</p>}

      {users && (
        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No users yet.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isUpdating =
                    adminMutation.isPending && adminMutation.variables?.userId === u.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.full_name || "—"}
                        {isSelf && (
                          <Badge variant="outline" className="ml-2">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{u.email || "—"}</TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>{u.bookings_count}</TableCell>
                      <TableCell>
                        <Switch
                          checked={u.is_admin}
                          disabled={isUpdating || isSelf}
                          onCheckedChange={(checked) =>
                            adminMutation.mutate({ userId: u.id, isAdmin: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedUserId(u.id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {adminMutation.isError && (
        <p className="mt-4 text-sm text-red-600">
          Failed to update admin access: {adminMutation.error.message}
        </p>
      )}

      <UserDetailSheet
        userId={selectedUserId}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      />
    </div>
  );
}

function UserDetailSheet({ userId, onOpenChange }) {
  const {
    data: detail,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: () => getUserDetail(userId),
    enabled: Boolean(userId),
  });

  return (
    <Sheet open={Boolean(userId)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{detail?.user?.full_name || "User details"}</SheetTitle>
          <SheetDescription>
            {detail?.user?.email || (isLoading ? "Loading…" : "—")}
          </SheetDescription>
        </SheetHeader>

        {isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
        {isError && <p className="mt-6 text-red-600">Failed to load user: {error.message}</p>}

        {detail && (
          <Tabs defaultValue="trips" className="mt-6">
            <TabsList>
              <TabsTrigger value="trips">Trips</TabsTrigger>
              <TabsTrigger value="saved">Saved Parks</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="trips">
              <TripsTable trips={detail.trips} />
            </TabsContent>
            <TabsContent value="saved">
              <SavedParksTable savedParks={detail.saved_parks} />
            </TabsContent>
            <TabsContent value="reviews">
              <ReviewsTable reviews={detail.reviews} />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsTable notifications={detail.notifications} />
            </TabsContent>
            <TabsContent value="payments">
              <PaymentsTable payments={detail.payments} />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EmptyRow({ colSpan, children }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

function TripsTable({ trips }) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Tour</TableHead>
            <TableHead>Travel date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!trips || trips.length === 0 ? (
            <EmptyRow colSpan={5}>No trips yet.</EmptyRow>
          ) : (
            trips.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.booking_reference}</TableCell>
                <TableCell>{t.tour_title || "—"}</TableCell>
                <TableCell>{t.travel_date || "—"}</TableCell>
                <TableCell>{formatKes(t.total_price)}</TableCell>
                <TableCell>
                  <Badge variant={BOOKING_STATUS_BADGE_VARIANT[t.status]}>
                    {BOOKING_STATUS_LABEL[t.status] || t.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function SavedParksTable({ savedParks }) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tour</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Price / adult</TableHead>
            <TableHead>Saved</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!savedParks || savedParks.length === 0 ? (
            <EmptyRow colSpan={4}>No saved parks yet.</EmptyRow>
          ) : (
            savedParks.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.tour?.title || "—"}</TableCell>
                <TableCell>{s.tour?.tour_type || "—"}</TableCell>
                <TableCell>{formatKes(s.tour?.price_per_adult)}</TableCell>
                <TableCell>
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ReviewsTable({ reviews }) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tour</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!reviews || reviews.length === 0 ? (
            <EmptyRow colSpan={4}>No reviews yet.</EmptyRow>
          ) : (
            reviews.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.tour_title || "—"}</TableCell>
                <TableCell>{r.rating} / 5</TableCell>
                <TableCell className="max-w-xs truncate">{r.comment || "—"}</TableCell>
                <TableCell>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function NotificationsTable({ notifications }) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Read</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!notifications || notifications.length === 0 ? (
            <EmptyRow colSpan={4}>No notifications yet.</EmptyRow>
          ) : (
            notifications.map((n) => (
              <TableRow key={n.id}>
                <TableCell>{n.title}</TableCell>
                <TableCell>{n.type}</TableCell>
                <TableCell>
                  <Badge variant={n.is_read ? "outline" : "secondary"}>
                    {n.is_read ? "Read" : "Unread"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {n.created_at ? new Date(n.created_at).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function PaymentsTable({ payments }) {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!payments || payments.length === 0 ? (
            <EmptyRow colSpan={5}>No payments yet.</EmptyRow>
          ) : (
            payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.booking_reference || "—"}</TableCell>
                <TableCell>{formatKes(p.amount)}</TableCell>
                <TableCell className="capitalize">{p.method}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      p.status === "succeeded"
                        ? "default"
                        : p.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
