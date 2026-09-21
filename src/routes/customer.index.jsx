import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  PlaneTakeoff,
  CheckCircle2,
  Wallet,
  Compass,
  ListChecks,
  UserRound,
  MapPin,
  Search,
  Star,
  CalendarDays,
} from "lucide-react";
import { listMyBookings } from "@/lib/api/bookings";
import { listTours, listParks } from "@/lib/api/tours";
import { downloadBookingIcs } from "@/lib/calendar";
import { formatKes } from "@/lib/format";
import {
  classifyBooking,
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_BADGE_VARIANT,
} from "@/lib/bookings";
import { useAuth } from "@/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export const Route = createFileRoute("/customer/")({
  component: CustomerDashboard,
});

const QUICK_ACTIONS = [
  { to: "/tours", label: "Browse Tours", icon: Compass },
  { to: "/customer/bookings", label: "My Bookings", icon: ListChecks },
  { to: "/customer/payments", label: "Payments", icon: Wallet },
  { to: "/customer/profile", label: "Profile", icon: UserRound },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["bookings", "me"],
    queryFn: listMyBookings,
  });

  const { data: parks } = useQuery({ queryKey: ["parks"], queryFn: listParks });
  const { data: tours } = useQuery({ queryKey: ["tours", {}], queryFn: () => listTours() });
  const tourById = new Map((tours || []).map((t) => [t.id, t]));

  const [destination, setDestination] = useState("");
  const [month, setMonth] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    navigate({
      to: "/tours",
      search: {
        park_id: destination || undefined,
        month: month ? Number(month) : undefined,
      },
    });
  };

  if (isLoading) return <p className="text-muted-foreground">Loading your dashboard…</p>;
  if (isError) return <p className="text-red-600">Failed to load your bookings: {error.message}</p>;

  const list = bookings || [];
  const today = new Date();

  const upcomingBookings = list.filter((b) => {
    const bucket = classifyBooking(b, today);
    return bucket === "pending" || bucket === "upcoming";
  });
  const completedBookings = list.filter((b) => classifyBooking(b, today) === "completed");
  const recentBookings = list
    .filter((b) => {
      const bucket = classifyBooking(b, today);
      return bucket === "completed" || bucket === "cancelled";
    })
    .slice(0, 3);

  const totalSpent = list.reduce(
    (sum, b) =>
      b.status === "confirmed" || b.status === "completed" ? sum + Number(b.total_price || 0) : sum,
    0,
  );

  const stats = {
    totalBookings: list.length,
    upcoming: upcomingBookings.length,
    completed: completedBookings.length,
    totalSpent,
  };

  const upcomingBooking = upcomingBookings
    .filter((b) => b.travel_date)
    .sort((a, b) => new Date(a.travel_date) - new Date(b.travel_date))[0];

  const recommendedTours = (tours || []).slice(0, 4);
  const firstName = user?.full_name?.split(" ")[0] || user?.email;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Good morning, {firstName}!
        </h1>
        <p className="mt-1 text-muted-foreground">Ready to find your next amazing safari?</p>
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
            <div>
              <h2 className="font-serif text-2xl font-bold text-primary-foreground">
                Find your perfect safari
              </h2>
              <p className="mb-4 mt-1 text-primary-foreground/80">
                Book your adventure in just a few clicks.
              </p>

              <form onSubmit={handleSearch} className="space-y-3">
                <div>
                  <Label className="mb-1 block text-sm font-medium text-primary-foreground/90">
                    Destination
                  </Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Select value={destination} onValueChange={setDestination}>
                      <SelectTrigger className="w-full bg-background pl-9 text-foreground">
                        <SelectValue placeholder="Where do you want to go?" />
                      </SelectTrigger>
                      <SelectContent>
                        {(parks || []).map((park) => (
                          <SelectItem key={park.id} value={park.id}>
                            {park.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block text-sm font-medium text-primary-foreground/90">
                      Departure Month
                    </Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger className="w-full bg-background text-foreground">
                        <SelectValue placeholder="Any month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((label, index) => (
                          <SelectItem key={label} value={String(index + 1)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1 block text-sm font-medium text-primary-foreground/90">
                      Travelers
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      defaultValue={1}
                      className="bg-background text-foreground"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-background py-2 font-medium text-primary transition-colors hover:bg-background/90"
                >
                  <Search className="h-4 w-4" />
                  Search Tours
                </button>
              </form>
            </div>

            <div className="hidden lg:block">
              <img
                src="/images/lion.jpg"
                alt="Safari"
                className="aspect-[3/2] w-full rounded-lg object-cover shadow-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Total Bookings" value={stats.totalBookings} />
        <StatCard icon={PlaneTakeoff} label="Upcoming" value={stats.upcoming} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} />
        <StatCard icon={Wallet} label="Total Spent" value={formatKes(stats.totalSpent)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {upcomingBooking ? (
            <UpcomingBookingCard
              booking={upcomingBooking}
              tour={tourById.get(upcomingBooking.tour_id)}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <h2 className="mb-2 text-xl font-semibold">No Upcoming Booking</h2>
                <p className="mb-4 text-muted-foreground">
                  You don&apos;t currently have a pending or confirmed trip.
                </p>
                <Button asChild>
                  <Link to="/tours">
                    <Compass className="h-4 w-4" />
                    Browse Tours
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Recent Bookings</CardTitle>
              <Link
                to="/customer/bookings"
                className="text-sm font-medium text-primary hover:underline"
              >
                View All
              </Link>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No completed or cancelled trips yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <RecentBookingRow
                      key={booking.id}
                      booking={booking}
                      tour={tourById.get(booking.tour_id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {completedBookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Leave a Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  How was your recent safari? Share your experience.
                </p>
                <div className="space-y-3">
                  {completedBookings.slice(0, 3).map((booking) => {
                    const tour = tourById.get(booking.tour_id);
                    return (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Thumbnail tour={tour} />
                          <div>
                            <p className="font-medium text-foreground">{booking.tour_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {booking.travel_date || "-"}
                            </p>
                          </div>
                        </div>
                        <Button asChild size="sm">
                          <Link to="/customer/trips">Add Review</Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-4 transition-colors hover:bg-muted"
                  >
                    <Icon className="h-6 w-6 text-primary" />
                    <span className="text-center text-sm font-medium text-foreground">{label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended For You</CardTitle>
            </CardHeader>
            <CardContent>
              {recommendedTours.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tours available right now.</p>
              ) : (
                <div className="space-y-3">
                  {recommendedTours.map((tour) => (
                    <Link
                      key={tour.id}
                      to="/tours/$tourId"
                      params={{ tourId: tour.id }}
                      className="group flex gap-3"
                    >
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {tour.images?.[0] && (
                          <img
                            src={tour.images[0]}
                            alt={tour.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                          {tour.title}
                        </h4>
                        <p className="text-xs capitalize text-muted-foreground">
                          {tour.tour_type || "Safari"}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          <span className="text-xs font-medium text-foreground">
                            {tour.rating || "N/A"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-primary">
                          {formatKes(tour.price_per_adult)} / adult
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Thumbnail({ tour }) {
  if (tour?.images?.[0]) {
    return (
      <img
        src={tour.images[0]}
        alt={tour.title}
        className="h-12 w-16 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
      <Compass className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

function UpcomingBookingCard({ booking, tour }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upcoming Booking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {tour?.images?.[0] ? (
            <img
              src={tour.images[0]}
              alt={booking.tour_title}
              className="h-24 w-32 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">No image</span>
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{booking.tour_title}</h3>
                <Badge variant={BOOKING_STATUS_BADGE_VARIANT[booking.status]} className="mt-1">
                  {BOOKING_STATUS_LABEL[booking.status]}
                </Badge>
              </div>
              <p className="text-lg font-bold text-primary">{formatKes(booking.total_price)}</p>
            </div>

            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>{booking.travel_date || "Date to be confirmed"}</p>
              <p>
                {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                {booking.children
                  ? `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`
                  : ""}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadBookingIcs(booking, tour)}>
                <CalendarDays className="h-4 w-4" />
                Add to Calendar
              </Button>
              <Button asChild size="sm">
                <Link to="/customer/bookings/$bookingId" params={{ bookingId: booking.id }}>
                  View Booking
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentBookingRow({ booking, tour }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
      <div className="flex items-center gap-3">
        <Thumbnail tour={tour} />
        <div>
          <p className="font-medium text-foreground">{booking.tour_title}</p>
          <p className="text-sm text-muted-foreground">{booking.travel_date || "-"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-bold text-primary">{formatKes(booking.total_price)}</p>
          <Badge variant={BOOKING_STATUS_BADGE_VARIANT[booking.status]}>
            {BOOKING_STATUS_LABEL[booking.status]}
          </Badge>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Link
            to="/customer/bookings/$bookingId"
            params={{ bookingId: booking.id }}
            className="text-xs text-primary hover:underline"
          >
            View Booking
          </Link>
          {booking.status === "completed" && (
            <Link
              to="/customer/trips"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
            >
              <Star className="h-3 w-3" />
              Add Review
            </Link>
          )}
        </div>
      </div>
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
