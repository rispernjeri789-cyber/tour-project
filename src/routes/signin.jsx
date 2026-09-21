import { useState } from "react";
import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { getToken } from "@/lib/api/client";
import { useAuth } from "@/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signin")({
  beforeLoad: () => {
    if (getToken()) {
      throw redirect({ to: "/customer" });
    }
  },
  component: SignIn,
});

function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      navigate({ to: user.is_admin ? "/admin" : "/customer" });
    } catch (err) {
      setError(err.message || "Sign in failed. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Welcome back. Enter your details to access your account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting ? "Signing in..." : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Register
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
