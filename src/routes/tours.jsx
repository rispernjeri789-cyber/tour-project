import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { listTours } from "@/lib/api/tours";
import { formatKes } from "@/lib/format";
import { WishlistButton } from "@/components/WishlistButton";

const toursSearchSchema = z.object({
  park_id: z.string().optional().catch(undefined),
  month: z.coerce.number().int().min(1).max(12).optional().catch(undefined),
});

export const Route = createFileRoute("/tours")({
  validateSearch: toursSearchSchema,
  component: ToursList,
});

function ToursList() {
  const { park_id, month } = Route.useSearch();
  const {
    data: tours,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["tours", { park_id, month }],
    queryFn: () => listTours({ park_id, month }),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="eyebrow">CHOOSE YOUR ADVENTURE</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Safari Tours</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Choose your departure and let&apos;s take you into the wild.
      </p>

      {isLoading && <p className="mt-10 text-muted-foreground">Loading tours…</p>}
      {isError && <p className="mt-10 text-destructive">Failed to load tours: {error.message}</p>}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tours?.map((tour) => (
          <Link
            key={tour.id}
            to="/tours/$tourId"
            params={{ tourId: tour.id }}
            className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
              {tour.images?.[0] && (
                <img
                  src={tour.images[0]}
                  alt={tour.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              )}
            </div>
            <WishlistButton tourId={tour.id} className="absolute right-3 top-3" />
            <div className="p-5">
              <h2 className="font-serif text-xl">{tour.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {tour.duration_days} days · {tour.tour_type}
              </p>
              <p className="mt-3 font-serif text-lg text-primary">
                {formatKes(tour.price_per_adult)}{" "}
                <span className="font-sans text-sm text-muted-foreground">/ adult</span>
              </p>
            </div>
          </Link>
        ))}
      </div>

      {tours && tours.length === 0 && (
        <p className="mt-10 text-muted-foreground">No tours available right now.</p>
      )}
    </main>
  );
}
