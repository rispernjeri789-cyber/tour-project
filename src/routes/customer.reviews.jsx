import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { listMyReviews } from "@/lib/api/reviews";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/reviews")({
  component: Reviews,
});

function Reviews() {
  const {
    data: reviews,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["reviews", "me"],
    queryFn: listMyReviews,
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">Reviews</h1>
      <p className="mt-1 text-muted-foreground">Reviews you've left for completed safaris.</p>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading reviews…</p>}
      {isError && <p className="mt-8 text-red-600">Failed to load reviews: {error.message}</p>}

      {!isLoading && reviews?.length === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-accent p-3">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">No reviews yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              You can leave a review from a completed trip on the{" "}
              <Link to="/customer/trips" className="text-primary hover:underline">
                My Trips
              </Link>{" "}
              page.
            </p>
          </CardContent>
        </Card>
      )}

      {reviews && reviews.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-2 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{r.tour_title}</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          "h-4 w-4",
                          n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground",
                        )}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                <p className="text-xs text-muted-foreground">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("en-KE") : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reviews && reviews.length > 0 && (
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link to="/customer/trips">Leave another review</Link>
        </Button>
      )}
    </div>
  );
}
