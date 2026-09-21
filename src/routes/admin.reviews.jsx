import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { listAdminReviews } from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

function AdminReviews() {
  const {
    data: reviews,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: listAdminReviews,
  });

  return (
    <div>
      <div>
        <h1 className="font-serif text-3xl font-bold">Reviews</h1>
        <p className="mt-1 text-muted-foreground">Every review left by every customer.</p>
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading reviews…</p>}
      {isError && <p className="mt-8 text-red-600">Failed to load reviews: {error.message}</p>}

      {reviews && (
        <div className="mt-6 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No reviews yet.
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.user_name || r.user_email || "—"}</TableCell>
                    <TableCell>{r.tour_title || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              "h-3.5 w-3.5",
                              n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground",
                            )}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{r.comment || "—"}</TableCell>
                    <TableCell>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("en-KE") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
