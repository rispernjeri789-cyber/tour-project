import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { getToken } from "@/lib/api/client";
import { listMyWishlist, addToWishlist, removeFromWishlist } from "@/lib/api/wishlist";
import { cn } from "@/lib/utils";

export function WishlistButton({ tourId, className }) {
  const queryClient = useQueryClient();
  const loggedIn = !!getToken();

  const { data: saved } = useQuery({
    queryKey: ["wishlist", "me"],
    queryFn: listMyWishlist,
    enabled: loggedIn,
  });

  const isSaved = (saved || []).some((s) => s.tour_id === tourId);

  const mutation = useMutation({
    mutationFn: () => (isSaved ? removeFromWishlist(tourId) : addToWishlist(tourId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist", "me"] }),
  });

  if (!loggedIn) return null;

  return (
    <button
      type="button"
      aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate();
      }}
      disabled={mutation.isPending}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur transition hover:bg-background disabled:opacity-60",
        className,
      )}
    >
      <Heart
        className={cn("h-4 w-4", isSaved ? "fill-destructive text-destructive" : "text-foreground")}
      />
    </button>
  );
}
