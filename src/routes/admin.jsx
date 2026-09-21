import { createFileRoute, Link, Outlet, redirect, useMatchRoute } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarCheck,
  Compass,
  Users,
  CreditCard,
  Star,
  Bell,
  Home,
  LogOut,
  Shield,
} from "lucide-react";
import { getToken } from "@/lib/api/client";
import { isAdmin } from "@/lib/api/admin";
import { useAuth } from "@/auth/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    if (!getToken()) {
      throw redirect({ to: "/" });
    }
    const admin = await isAdmin();
    if (!admin) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

const NAV_ITEMS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/tours", label: "Tours", icon: Compass },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const matchRoute = useMatchRoute();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="shrink-0 md:sticky md:top-8 md:w-56 md:self-start">
        <div className="mb-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Shield className="h-4 w-4" />
            Admin Panel
          </p>
          <p className="truncate font-semibold">{user?.full_name || user?.email}</p>
        </div>

        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const active = matchRoute({ to, fuzzy: !exact });
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          <Link
            to="/"
            className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            <Home className="h-4 w-4" />
            View site
          </Link>

          <button
            onClick={logout}
            className="mt-2 flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </main>
  );
}
