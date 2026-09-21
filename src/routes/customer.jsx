import { createFileRoute, Link, Outlet, redirect, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Compass,
  CalendarCheck,
  Heart,
  CreditCard,
  Bell,
  User,
  Settings,
  MessageCircle,
  LogOut,
  Plane,
  Star,
} from "lucide-react";
import { getToken } from "@/lib/api/client";
import { listMyNotifications } from "@/lib/api/notifications";
import { useAuth } from "@/auth/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer")({
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: "/signin" });
    }
  },
  component: CustomerLayout,
});

const BOOKING_TABS = [
  { tab: "upcoming", label: "Upcoming" },
  { tab: "active", label: "Active" },
  { tab: "completed", label: "Completed" },
  { tab: "cancelled", label: "Cancelled" },
];

const NAV_ITEMS = [
  { to: "/customer", label: "Dashboard", icon: Home, exact: true },
  { to: "/tours", label: "Browse parks and reserves", icon: Compass },
  { to: "/customer/bookings", label: "My Bookings", icon: CalendarCheck, children: BOOKING_TABS },
  { to: "/customer/trips", label: "My Trips", icon: Plane },
  { to: "/customer/wishlist", label: "Saved parks", icon: Heart },
  { to: "/customer/payments", label: "Payments", icon: CreditCard },
  { to: "/customer/notifications", label: "Notifications", icon: Bell, badge: "unread" },
  { to: "/customer/reviews", label: "Reviews", icon: Star },
  { to: "/customer/profile", label: "Profile", icon: User },
  { to: "/customer/settings", label: "Settings", icon: Settings },
  { to: "/customer/support", label: "Help & Support", icon: MessageCircle },
];

function CustomerLayout() {
  const { user, logout } = useAuth();
  const matchRoute = useMatchRoute();

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", "me"],
    queryFn: listMyNotifications,
    refetchInterval: 60000,
  });
  const unreadCount = notificationsData?.unread_count || 0;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="shrink-0 md:sticky md:top-20 md:w-60 md:self-start">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <p className="truncate font-semibold">{user?.full_name || user?.email}</p>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact, children, badge }) => {
            const active = matchRoute({ to, fuzzy: !exact });
            return (
              <div key={to}>
                <Link
                  to={to}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {badge === "unread" && unreadCount > 0 && (
                    <span
                      className={cn(
                        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        active
                          ? "bg-primary-foreground text-primary"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {children && active && (
                  <div className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                    {children.map(({ tab, label: tabLabel }) => (
                      <Link
                        key={tab}
                        to={to}
                        search={{ tab }}
                        className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[active=true]:font-semibold data-[active=true]:text-foreground"
                        activeOptions={{ includeSearch: true }}
                        activeProps={{ "data-active": "true" }}
                      >
                        {tabLabel}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={logout}
            className="mt-2 flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </main>
  );
}
