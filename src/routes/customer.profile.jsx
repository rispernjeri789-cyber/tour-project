import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/customer/profile")({
  component: Profile,
});

function Profile() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: (payload) => updateProfile(payload),
    onSuccess: () => {
      setMessage("Profile updated.");
      setPassword("");
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    setMessage("");
    const payload = { full_name: fullName, phone };
    if (password) payload.password = password;
    mutation.mutate(payload);
  };

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-3xl font-bold">Profile</h1>
      <p className="mt-1 text-muted-foreground">Manage your account details.</p>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Account</CardTitle>
            {user?.is_admin && <Badge>Administrator</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled className="mt-1" />
            </div>

            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Leave blank to keep your current password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>

            {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}
            {message && <p className="text-sm text-primary">{message}</p>}

            <Button type="submit" disabled={mutation.isPending} className="self-start">
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
