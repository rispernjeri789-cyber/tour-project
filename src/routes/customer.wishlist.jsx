import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { listMyWishlist, removeFromWishlist } from "@/lib/api/wishlist";
import { formatKes } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/customer/wishlist")({
  component: Wishlist,
});

function Wishlist() {
  const queryClient = useQueryClient();

  const {
    data: saved,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["wishlist", "me"],
    queryFn: listMyWishlist,
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWishlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist", "me"] }),
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">Wishlist</h1>
      <p className="mt-1 text-muted-foreground">Save tours you're dreaming about for later.</p>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading your wishlist…</p>}
      {isError && (
        <p className="mt-8 text-red-600">Failed to load your wishlist: {error.message}</p>
      )}

      {!isLoading && saved?.length === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-accent p-3">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">Your wishlist is empty</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Tap the heart on any tour to save it here.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link to="/tours">Browse tours</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {saved && saved.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <Link to="/tours/$tourId" params={{ tourId: s.tour_id }}>
                <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                  {s.tour?.images?.[0] && (
                    <img
                      src={s.tour.images[0]}
                      alt={s.tour.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </Link>
              <CardContent className="flex flex-col gap-2 pt-4">
                <Link
                  to="/tours/$tourId"
                  params={{ tourId: s.tour_id }}
                  className="hover:underline"
                >
                  <p className="font-semibold">{s.tour?.title}</p>
                </Link>
                <p className="text-sm text-muted-foreground">
                  {s.tour?.duration_days ? `${s.tour.duration_days} days · ` : ""}
                  {s.tour?.tour_type}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="font-semibold text-primary">{formatKes(s.tour?.price_per_adult)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate(s.tour_id)}
                    disabled={removeMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
