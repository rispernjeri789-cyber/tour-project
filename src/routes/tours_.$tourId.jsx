import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Minus,
  Plus,
  Star,
  X,
} from "lucide-react";
import { getTour } from "@/lib/api/tours";
import { PayNowCard } from "@/components/PayNowCard";
import { createBooking } from "@/lib/api/bookings";
import { getToken } from "@/lib/api/client";
import { useAuth } from "@/auth/useAuth";
import { formatKes } from "@/lib/format";
import { WishlistButton } from "@/components/WishlistButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toISODateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Keep in sync with HIGH_SEASON_MONTHS in backend/app/routes/bookings.py.
const HIGH_SEASON_MONTHS = new Set([1, 7, 8, 12]);

function isHighSeasonDate(date) {
  return !!date && HIGH_SEASON_MONTHS.has(date.getMonth() + 1);
}

function parseISODateLocal(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function Counter({ label, hint, value, onChange, minimum = 0 }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-4 last:border-0">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="counter-button"
          onClick={() => onChange(Math.max(minimum, value - 1))}
          aria-label={`Remove ${label}`}
        >
          <Minus />
        </button>
        <span className="w-5 text-center font-semibold">{value}</span>
        <button
          type="button"
          className="counter-button"
          onClick={() => onChange(value + 1)}
          aria-label={`Add ${label}`}
        >
          <Plus />
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/tours_/$tourId")({
  component: TourDetail,
});

function TourDetail() {
  const { tourId } = Route.useParams();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const {
    data: tour,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["tour", tourId],
    queryFn: () => getTour(tourId),
  });

  const [selectedDate, setSelectedDate] = useState(undefined);
  const [returnDate, setReturnDate] = useState(undefined);
  const [dateError, setDateError] = useState("");
  const [returnDateError, setReturnDateError] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    if (user) {
      setContactName((prev) => prev || user.full_name || "");
      setContactPhone((prev) => prev || user.phone || "");
      setContactEmail((prev) => prev || user.email || "");
    }
  }, [user]);

  const bookMutation = useMutation({
    mutationFn: (payload) => createBooking(payload),
    onSuccess: (data) => setCreated(data),
    onError: (err) => setFormError(err.message),
  });

  if (isLoading) return <main className="mx-auto max-w-4xl px-4 py-10">Loading…</main>;
  if (isError)
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-destructive">
        Failed to load tour: {error.message}
      </main>
    );
  if (!tour) return null;

  const images = tour.images?.length ? tour.images : [];
  const isPerDay = tour.pricing_unit === "per_day";
  const highSeason = isHighSeasonDate(selectedDate);
  const adultRate =
    highSeason && tour.high_season_price_per_adult != null
      ? tour.high_season_price_per_adult
      : tour.price_per_adult;
  const childRate =
    highSeason && tour.high_season_price_per_child != null
      ? tour.high_season_price_per_child
      : tour.price_per_child || 0;

  let total = 0;
  if (selectedDate && isPerDay) {
    const numDays =
      selectedDate && returnDate
        ? Math.max(Math.round((returnDate - selectedDate) / 86_400_000) + 1, 1)
        : 1;
    total = numDays * adultRate;
  } else if (selectedDate) {
    total = adults * adultRate + children * childRate;
  }

  const hasHighSeasonRate = tour.high_season_price_per_adult != null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nights = tour.duration_nights ?? Math.max((tour.duration_days || 1) - 1, 0);

  const onSelectDate = (value) => {
    setFormError("");
    if (!value) {
      setSelectedDate(undefined);
      setDateError("");
      return;
    }

    const normalized = parseISODateLocal(value);
    normalized.setHours(0, 0, 0, 0);

    if (normalized < today) {
      setSelectedDate(normalized);
      setDateError("That date has already passed. Please choose today or a later date.");
      return;
    }

    setSelectedDate(normalized);
    setDateError("");

    // Suggest a return date based on the tour's duration, but only if none
    // is set yet or the existing one no longer makes sense for this departure.
    setReturnDate((prev) => (!prev || prev < normalized ? addDays(normalized, nights) : prev));
    setReturnDateError("");
  };

  const onSelectReturnDate = (value) => {
    setFormError("");
    if (!value) {
      setReturnDate(undefined);
      setReturnDateError("");
      return;
    }

    const normalized = parseISODateLocal(value);
    normalized.setHours(0, 0, 0, 0);
    setReturnDate(normalized);

    if (selectedDate && normalized < selectedDate) {
      setReturnDateError("Return date cannot be before the departure date.");
    } else {
      setReturnDateError("");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!getToken()) {
      setFormError("Please log in (top right) before booking.");
      return;
    }
    if (!selectedDate || dateError) {
      setFormError("Please select a valid, upcoming departure date.");
      return;
    }
    if (!returnDate || returnDateError) {
      setFormError("Please select a valid return date.");
      return;
    }
    if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      setFormError("Please fill in your name, email and contact number.");
      return;
    }

    if (
      contactName !== (user?.full_name || "") ||
      contactPhone !== (user?.phone || "") ||
      contactEmail !== (user?.email || "")
    ) {
      try {
        await updateProfile({ full_name: contactName, phone: contactPhone, email: contactEmail });
      } catch (err) {
        setFormError(err.message || "Could not save your contact details.");
        return;
      }
    }

    bookMutation.mutate({
      tour_id: tour.id,
      travel_date: toISODateLocal(selectedDate),
      return_date: toISODateLocal(returnDate),
      adults: Number(adults),
      children: Number(children),
    });
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
      <Link to="/tours" className="text-sm text-muted-foreground hover:text-primary">
        ← All tours
      </Link>

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="relative overflow-hidden rounded-[2rem] bg-muted">
            {images[imageIndex] && (
              <img
                src={images[imageIndex]}
                alt={`${tour.title} safari`}
                className="aspect-[16/9] w-full object-cover"
              />
            )}
            <WishlistButton tourId={tour.id} className="absolute right-4 top-4" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-arrow left-4"
                  onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)}
                  aria-label="Previous image"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  className="gallery-arrow right-4"
                  onClick={() => setImageIndex((imageIndex + 1) % images.length)}
                  aria-label="Next image"
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  onClick={() => setImageIndex(index)}
                  className={`overflow-hidden rounded-xl ${
                    index === imageIndex ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                >
                  <img src={image} alt="" className="size-20 object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-10">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {tour.tour_type && (
                <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">
                  {tour.tour_type}
                </span>
              )}
              <span className="flex items-center gap-1 text-primary">
                <Star className="size-4" fill="currentColor" /> {tour.rating || "4.9"}
              </span>
              <span className="flex items-center gap-1">
                <Clock3 className="size-4" /> {tour.duration_days} days / {tour.duration_nights}{" "}
                nights
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl text-balance font-serif text-4xl leading-tight text-foreground sm:text-6xl">
              {tour.title}
            </h1>
            {tour.short_description && (
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                {tour.short_description}
              </p>
            )}
          </div>

          {(tour.includes?.length > 0 || tour.excludes?.length > 0) && (
            <div className="mt-12 grid gap-8 border-y border-border py-8 sm:grid-cols-2">
              <div>
                <h2 className="mb-4 text-xl font-semibold">What&apos;s included</h2>
                <ul className="flex flex-col gap-3">
                  {tour.includes?.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                      <Check className="size-5 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="mb-4 text-xl font-semibold">What&apos;s excluded</h2>
                <ul className="flex flex-col gap-3">
                  {tour.excludes?.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                      <X className="size-5 shrink-0 text-destructive" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tour.itinerary?.length > 0 && (
            <div className="mt-12">
              <p className="eyebrow">THE JOURNEY</p>
              <h2 className="mt-2 font-serif text-3xl">Your itinerary</h2>
              <div className="mt-8 flex flex-col gap-8">
                {tour.itinerary.map((step) => (
                  <div key={step.day} className="relative flex gap-5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                      {step.day}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="mt-2 leading-7 text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="booking-card">
            {!created && (
              <>
                <p className="text-sm text-muted-foreground">From</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <strong className="font-serif text-3xl">{formatKes(tour.price_per_adult)}</strong>
                  <span className="text-sm text-muted-foreground">
                    {isPerDay ? "/ day (vehicle + driver)" : "/ adult"}
                  </span>
                </div>
                {hasHighSeasonRate && (
                  <div className="mt-2 flex items-baseline gap-2">
                    <strong className="font-serif text-3xl text-muted-foreground">
                      {formatKes(tour.high_season_price_per_adult)}
                    </strong>
                    <span className="text-sm text-muted-foreground">
                      {isPerDay ? "/ day" : "/ adult"} in high season
                    </span>
                  </div>
                )}
                {hasHighSeasonRate && (
                  <p className="mt-1 text-xs text-muted-foreground">Jan, Jul–Aug, Dec</p>
                )}
              </>
            )}

            {created ? (
              <div className="mt-6 border-t border-border pt-6">
                <p className="font-medium">Booking received!</p>
                <p className="mt-1 text-sm">
                  Reference: <span className="font-mono">{created.booking_reference}</span>
                </p>

                <div className="mt-4">
                  <PayNowCard booking={created} />
                </div>

                <button
                  onClick={() =>
                    navigate({
                      to: "/customer/bookings/$bookingId",
                      params: { bookingId: created.id },
                    })
                  }
                  className="mt-3 block w-full text-center text-sm text-primary hover:underline"
                >
                  View this booking
                </button>
                <button
                  onClick={() => navigate({ to: "/tours" })}
                  className="mt-2 block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to tours
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="departure_date" className="mb-1 block text-sm font-semibold">
                      Departure Date
                    </Label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="departure_date"
                        type="date"
                        value={selectedDate ? toISODateLocal(selectedDate) : ""}
                        min={toISODateLocal(today)}
                        onChange={(e) => onSelectDate(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="return_date" className="mb-1 block text-sm font-semibold">
                      Return Date
                    </Label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="return_date"
                        type="date"
                        value={returnDate ? toISODateLocal(returnDate) : ""}
                        min={selectedDate ? toISODateLocal(selectedDate) : toISODateLocal(today)}
                        onChange={(e) => onSelectReturnDate(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {dateError && <p className="mt-2 text-sm text-destructive">{dateError}</p>}
                {returnDateError && (
                  <p className="mt-2 text-sm text-destructive">{returnDateError}</p>
                )}

                {selectedDate && returnDate && !dateError && !returnDateError && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {tour.duration_days} day{tour.duration_days !== 1 ? "s" : ""}
                    {nights ? ` / ${nights} night${nights !== 1 ? "s" : ""}` : ""} safari — you can
                    adjust the return date if needed.
                  </p>
                )}

                <div className="mt-6">
                  <Counter
                    label="Adults"
                    hint="12+ years"
                    value={adults}
                    onChange={setAdults}
                    minimum={1}
                  />
                  <Counter
                    label="Children"
                    hint="2–11 years"
                    value={children}
                    onChange={setChildren}
                  />
                </div>

                <div className="mt-6 border-t border-border pt-6">
                  <label className="mb-3 block text-sm font-semibold">Your details</label>
                  <div className="flex flex-col gap-3">
                    <div>
                      <Label htmlFor="contact_name" className="text-xs text-muted-foreground">
                        Full name
                      </Label>
                      <Input
                        id="contact_name"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_email" className="text-xs text-muted-foreground">
                        Email
                      </Label>
                      <Input
                        id="contact_email"
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_phone" className="text-xs text-muted-foreground">
                        Contact number
                      </Label>
                      <Input
                        id="contact_phone"
                        type="tel"
                        required
                        placeholder="0712345678"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-5">
                  {isPerDay && selectedDate && returnDate && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      {Math.max(Math.round((returnDate - selectedDate) / 86_400_000) + 1, 1)} day
                      {Math.max(Math.round((returnDate - selectedDate) / 86_400_000) + 1, 1) !== 1
                        ? "s"
                        : ""}{" "}
                      × {formatKes(adultRate)}/day — vehicle &amp; driver only. Accommodation and
                      park entry fees are paid separately.
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <strong className="font-serif text-2xl">{formatKes(total)}</strong>
                  </div>
                </div>

                {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}

                <button
                  type="submit"
                  disabled={
                    bookMutation.isPending ||
                    !selectedDate ||
                    !!dateError ||
                    !returnDate ||
                    !!returnDateError ||
                    !contactName.trim() ||
                    !contactPhone.trim() ||
                    !contactEmail.trim()
                  }
                  className="mt-5 w-full rounded-full bg-primary px-5 py-4 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {bookMutation.isPending ? "Booking…" : "Book Now"}
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
