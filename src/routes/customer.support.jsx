import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { listMySupportMessages, createSupportMessage } from "@/lib/api/support";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/customer/support")({
  component: Support,
});

const FAQS = [
  {
    q: "How do I pay for a booking?",
    a: "Open the booking from My Bookings and use the Pay Now card to send an M-Pesa STK push to your phone.",
  },
  {
    q: "Can I cancel a booking?",
    a: "Yes — from the booking detail page, as long as it hasn't already been completed. Paid bookings aren't automatically refunded on cancellation; contact us below if you need a refund.",
  },
  {
    q: "When will my booking be confirmed?",
    a: "Bookings are confirmed automatically once payment succeeds. You'll get a notification either way.",
  },
];

function Support() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["support", "me"],
    queryFn: listMySupportMessages,
  });

  const mutation = useMutation({
    mutationFn: () => createSupportMessage({ subject, message }),
    onSuccess: () => {
      setSubject("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["support", "me"] });
    },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">Support</h1>
      <p className="mt-1 text-muted-foreground">Get help with a booking or ask us a question.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact us</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  className="mt-1"
                />
              </div>
              {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}
              {mutation.isSuccess && (
                <p className="text-sm text-primary">Message sent — we'll get back to you soon.</p>
              )}
              <Button type="submit" disabled={mutation.isPending} className="self-start">
                {mutation.isPending ? "Sending…" : "Send message"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Frequently asked questions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {FAQS.map((f) => (
              <div key={f.q}>
                <p className="text-sm font-medium">{f.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Your requests</h2>

        {isLoading && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && messages?.length === 0 && (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="rounded-full bg-accent p-3">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">No requests yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Send us a message above and we'll show it here.
              </p>
            </CardContent>
          </Card>
        )}

        {messages && messages.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {messages.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex flex-col gap-1 pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{m.subject}</p>
                    <Badge variant={m.status === "open" ? "secondary" : "outline"}>
                      {m.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{m.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.created_at ? new Date(m.created_at).toLocaleString("en-KE") : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
