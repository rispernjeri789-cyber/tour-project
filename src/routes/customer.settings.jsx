import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/customer/settings")({
  component: Settings,
});

function Settings() {
  const { user, updateProfile } = useAuth();
  const [notifyEmail, setNotifyEmail] = useState(user?.notify_email ?? true);
  const [notifySms, setNotifySms] = useState(user?.notify_sms ?? true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) {
      setNotifyEmail(user.notify_email ?? true);
      setNotifySms(user.notify_sms ?? true);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: (payload) => updateProfile(payload),
    onSuccess: () => {
      setMessage("Preferences saved.");
      setTimeout(() => setMessage(""), 3000);
    },
  });

  const onToggleEmail = (checked) => {
    setNotifyEmail(checked);
    mutation.mutate({ notify_email: checked });
  };

  const onToggleSms = (checked) => {
    setNotifySms(checked);
    mutation.mutate({ notify_sms: checked });
  };

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-muted-foreground">Notification and account preferences.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify_email">Email notifications</Label>
              <p className="text-sm text-muted-foreground">
                Booking, payment, and trip updates by email.
              </p>
            </div>
            <Switch id="notify_email" checked={notifyEmail} onCheckedChange={onToggleEmail} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify_sms">SMS notifications</Label>
              <p className="text-sm text-muted-foreground">
                Text messages for time-sensitive updates like payment confirmations.
              </p>
            </div>
            <Switch id="notify_sms" checked={notifySms} onCheckedChange={onToggleSms} />
          </div>

          {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your name, phone number, and password are managed on the{" "}
            <Link to="/customer/profile" className="text-primary hover:underline">
              Profile
            </Link>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
