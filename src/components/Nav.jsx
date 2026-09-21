import { Link } from "@tanstack/react-router";
import { useAuth } from "@/auth/useAuth";

export function Nav() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-[86px] max-w-6xl items-center justify-between px-4 sm:px-8">
        <Link to="/" className="flex flex-col leading-none text-primary">
          <span className="text-[19px] font-black tracking-[0.12em]">NO AGE</span>
          <small className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.28em] text-accent">
            Tour and Travel
          </small>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/tours" className="text-sm font-medium text-foreground hover:text-primary">
            Tours
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              {user.is_admin ? (
                <Link
                  to="/admin"
                  className="text-sm font-medium text-foreground hover:text-primary"
                >
                  Admin Panel
                </Link>
              ) : (
                <Link
                  to="/customer"
                  className="text-sm font-medium text-foreground hover:text-primary"
                >
                  Dashboard
                </Link>
              )}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Hi, {user.full_name || user.email}
              </span>
              <button
                onClick={logout}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/signup" className="text-sm font-medium text-foreground hover:text-primary">
                Register
              </Link>
              <Link
                to="/signin"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Sign in
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
