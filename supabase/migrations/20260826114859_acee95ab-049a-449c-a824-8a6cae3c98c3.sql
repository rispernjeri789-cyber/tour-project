-- PARKS
CREATE TABLE public.parks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  circuit text,
  description text,
  hero_image_url text,
  best_time_to_visit text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.parks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parks TO authenticated;
GRANT ALL ON public.parks TO service_role;
ALTER TABLE public.parks ENABLE ROW LEVEL SECURITY;

-- TOURS
CREATE TABLE public.tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id uuid REFERENCES public.parks(id) ON DELETE SET NULL,
  title text NOT NULL,
  tour_type text,
  duration_days int,
  duration_nights int,
  price_per_adult numeric NOT NULL DEFAULT 0,
  price_per_child numeric NOT NULL DEFAULT 0,
  max_travelers int,
  includes text[] NOT NULL DEFAULT '{}',
  excludes text[] NOT NULL DEFAULT '{}',
  itinerary jsonb NOT NULL DEFAULT '[]'::jsonb,
  rating numeric,
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tours TO authenticated;
GRANT ALL ON public.tours TO service_role;
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

-- TOUR AVAILABILITY
CREATE TABLE public.tour_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  seats_total int NOT NULL DEFAULT 0,
  seats_booked int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open'
);
GRANT SELECT ON public.tour_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_availability TO authenticated;
GRANT ALL ON public.tour_availability TO service_role;
ALTER TABLE public.tour_availability ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- BOOKINGS
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tour_id uuid NOT NULL REFERENCES public.tours(id) ON DELETE RESTRICT,
  availability_id uuid REFERENCES public.tour_availability(id) ON DELETE SET NULL,
  adults int NOT NULL DEFAULT 1,
  children int NOT NULL DEFAULT 0,
  travel_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  fees numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  booking_reference text NOT NULL UNIQUE,
  special_requests text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_tours_park ON public.tours(park_id);
CREATE INDEX idx_avail_tour ON public.tour_availability(tour_id);

-- ADMIN CHECK (security definer, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.is_admin = true);
$$;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- POLICIES: parks
CREATE POLICY "parks_public_read" ON public.parks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "parks_admin_write" ON public.parks FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- POLICIES: tours
CREATE POLICY "tours_public_read_active" ON public.tours FOR SELECT TO anon, authenticated
  USING (status = 'active' OR public.is_admin(auth.uid()));
CREATE POLICY "tours_admin_write" ON public.tours FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- POLICIES: availability
CREATE POLICY "avail_public_read" ON public.tour_availability FOR SELECT TO anon, authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.tours t WHERE t.id = tour_id AND t.status = 'active')
  );
CREATE POLICY "avail_admin_write" ON public.tour_availability FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- POLICIES: profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_update_all" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- POLICIES: bookings
CREATE POLICY "bookings_select_own_or_admin" ON public.bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "bookings_insert_own" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookings_update_own" ON public.bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookings_admin_update_all" ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BOOKING REFERENCE SEQUENCE
CREATE SEQUENCE IF NOT EXISTS public.booking_reference_seq START 1;

-- CREATE BOOKING
CREATE OR REPLACE FUNCTION public.create_booking(
  p_tour_id uuid,
  p_availability_id uuid,
  p_adults int,
  p_children int DEFAULT 0,
  p_travel_date date DEFAULT NULL,
  p_special_requests text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tour public.tours%ROWTYPE;
  v_avail public.tour_availability%ROWTYPE;
  v_seats_needed int;
  v_seats_available int;
  v_subtotal numeric;
  v_fees numeric := 0;
  v_total numeric;
  v_ref text;
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to make a booking.';
  END IF;

  p_adults := COALESCE(p_adults, 0);
  p_children := COALESCE(p_children, 0);
  v_seats_needed := p_adults + p_children;

  IF p_adults < 1 THEN
    RAISE EXCEPTION 'At least one adult is required for a booking.';
  END IF;
  IF p_children < 0 THEN
    RAISE EXCEPTION 'Number of children cannot be negative.';
  END IF;

  SELECT * INTO v_tour FROM public.tours WHERE id = p_tour_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This tour is not available for booking.';
  END IF;

  IF v_tour.max_travelers IS NOT NULL AND v_seats_needed > v_tour.max_travelers THEN
    RAISE EXCEPTION 'This tour allows a maximum of % travelers per booking.', v_tour.max_travelers;
  END IF;

  -- lock the departure row so seat counts stay consistent
  SELECT * INTO v_avail FROM public.tour_availability
   WHERE id = p_availability_id AND tour_id = p_tour_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That departure date was not found for this tour.';
  END IF;

  IF v_avail.status <> 'open' THEN
    RAISE EXCEPTION 'That departure is % and cannot be booked.', v_avail.status;
  END IF;

  v_seats_available := v_avail.seats_total - v_avail.seats_booked;
  IF v_seats_available < v_seats_needed THEN
    RAISE EXCEPTION 'Not enough seats: you requested % but only % seat(s) remain on this departure.',
      v_seats_needed, GREATEST(v_seats_available, 0);
  END IF;

  v_subtotal := (p_adults * v_tour.price_per_adult) + (p_children * v_tour.price_per_child);
  v_total := v_subtotal + v_fees;

  -- unique reference NGT-{year}-{5 digits}
  v_ref := 'NGT-' || to_char(now(), 'YYYY') || '-' ||
           lpad(((nextval('public.booking_reference_seq') - 1) % 100000)::text, 5, '0');

  INSERT INTO public.bookings (
    user_id, tour_id, availability_id, adults, children, travel_date,
    subtotal, fees, total_price, status, booking_reference, special_requests
  ) VALUES (
    v_user, p_tour_id, p_availability_id, p_adults, p_children,
    COALESCE(p_travel_date, v_avail.start_date),
    v_subtotal, v_fees, v_total, 'pending', v_ref, p_special_requests
  ) RETURNING * INTO v_booking;

  UPDATE public.tour_availability
     SET seats_booked = seats_booked + v_seats_needed,
         status = CASE WHEN seats_booked + v_seats_needed >= seats_total THEN 'full' ELSE status END
   WHERE id = p_availability_id;

  RETURN v_booking;
END;
$$;
REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid, int, int, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, int, int, date, text) TO authenticated;

-- UPDATE BOOKING STATUS (admins only)
CREATE OR REPLACE FUNCTION public.update_booking_status(p_booking_id uuid, p_status text)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_old public.bookings%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can change a booking status.';
  END IF;

  IF p_status NOT IN ('pending', 'confirmed', 'cancelled', 'completed') THEN
    RAISE EXCEPTION 'Invalid booking status: %', p_status;
  END IF;

  SELECT * INTO v_old FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  UPDATE public.bookings SET status = p_status WHERE id = p_booking_id RETURNING * INTO v_booking;

  -- release seats when a booking is cancelled
  IF p_status = 'cancelled' AND v_old.status <> 'cancelled' AND v_old.availability_id IS NOT NULL THEN
    UPDATE public.tour_availability
       SET seats_booked = GREATEST(seats_booked - (v_old.adults + v_old.children), 0),
           status = CASE WHEN status = 'full' THEN 'open' ELSE status END
     WHERE id = v_old.availability_id;
  END IF;

  RETURN v_booking;
END;
$$;
REVOKE ALL ON FUNCTION public.update_booking_status(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, text) TO authenticated;