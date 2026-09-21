from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text

from ..extensions import db
from ..models import Booking, Tour, TourAvailability, User
from .helpers import admin_required, notify

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api")

# Kenya's standard peak safari months (wildebeest migration + festive season).
# Tours with high_season_price_per_adult/child set charge that rate instead
# of the normal price_per_adult/price_per_child when travel_date falls here.
HIGH_SEASON_MONTHS = {1, 7, 8, 12}


@bookings_bp.post("/bookings")
@jwt_required()
def create_booking():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    tour_id = data.get("tour_id")
    availability_id = data.get("availability_id")
    adults = data.get("adults", 1)
    children = data.get("children", 0)
    travel_date = data.get("travel_date")
    return_date = data.get("return_date")
    special_requests = data.get("special_requests")

    # Validate input types server-side.
    try:
        adults = int(adults)
        children = int(children)
    except (TypeError, ValueError):
        return jsonify(error="adults and children must be integers"), 400

    if adults < 1:
        return jsonify(error="At least one adult is required"), 400
    if children < 0:
        return jsonify(error="Number of children cannot be negative"), 400

    seats_needed = adults + children

    parsed_travel_date = None
    if travel_date:
        try:
            parsed_travel_date = _parse_date(travel_date)
        except ValueError:
            return jsonify(error="Invalid travel date"), 400

    parsed_return_date = None
    if return_date:
        try:
            parsed_return_date = _parse_date(return_date)
        except ValueError:
            return jsonify(error="Invalid return date"), 400
        if parsed_travel_date and parsed_return_date < parsed_travel_date:
            return jsonify(error="Return date cannot be before the departure date"), 400

    # Single DB transaction: lock the availability row (if one was chosen),
    # verify seats, compute price from the tours table, reserve seats,
    # insert booking.
    try:
        avail = None
        if availability_id:
            # Lock the availability row for the duration of this transaction.
            avail = (
                db.session.query(TourAvailability)
                .filter_by(id=availability_id, tour_id=tour_id)
                .with_for_update()
                .first()
            )
            if not avail:
                db.session.rollback()
                return jsonify(error="That departure was not found for this tour"), 404

            if avail.status != "open":
                db.session.rollback()
                return (
                    jsonify(error=f"That departure is {avail.status} and cannot be booked"),
                    400,
                )

            seats_available = (avail.seats_total or 0) - (avail.seats_booked or 0)
            if seats_available < seats_needed:
                db.session.rollback()
                return (
                    jsonify(
                        error=(
                            f"Not enough seats: you requested {seats_needed} "
                            f"but only {max(seats_available, 0)} seat(s) remain on this departure."
                        )
                    ),
                    400,
                )
        elif not parsed_travel_date:
            db.session.rollback()
            return jsonify(error="A travel date is required"), 400
        elif parsed_travel_date < date.today():
            db.session.rollback()
            return jsonify(error="Travel date cannot be in the past"), 400

        # Price is ALWAYS taken from the server-side tours table. Never trust
        # a price sent from the client.
        tour = db.session.get(Tour, tour_id)
        if not tour or tour.status != "active":
            db.session.rollback()
            return jsonify(error="This tour is not available for booking"), 400

        if tour.max_travelers is not None and seats_needed > tour.max_travelers:
            db.session.rollback()
            return (
                jsonify(
                    error=f"This tour allows a maximum of {tour.max_travelers} travelers per booking."
                ),
                400,
            )

        resolved_travel_date = parsed_travel_date or (avail.start_date if avail else None)
        is_high_season = bool(
            resolved_travel_date and resolved_travel_date.month in HIGH_SEASON_MONTHS
        )

        if is_high_season and tour.high_season_price_per_adult is not None:
            adult_rate = tour.high_season_price_per_adult
        else:
            adult_rate = tour.price_per_adult

        if is_high_season and tour.high_season_price_per_child is not None:
            child_rate = tour.high_season_price_per_child
        else:
            child_rate = tour.price_per_child

        if tour.pricing_unit == "per_day":
            # Flat vehicle-hire rate: charged per day of the trip, regardless
            # of how many travelers are riding (up to max_travelers).
            if resolved_travel_date and parsed_return_date:
                num_days = max((parsed_return_date - resolved_travel_date).days + 1, 1)
            else:
                num_days = 1
            subtotal = num_days * float(adult_rate or 0)
        else:
            subtotal = (adults * float(adult_rate or 0)) + (children * float(child_rate or 0))
        fees = 0.0
        total = subtotal + fees

        # Generate a unique reference: NGT-{year}-{5 digit}.
        seq = db.session.execute(
            text("SELECT nextval('public.booking_reference_seq')")
        ).scalar()
        ref_year = date.today().year
        ref_number = f"{(int(seq) - 1) % 100000:05d}"
        booking_reference = f"NGT-{ref_year}-{ref_number}"

        # Ensure no collision on the unique column.
        while db.session.query(Booking).filter_by(booking_reference=booking_reference).first():
            seq = db.session.execute(
                text("SELECT nextval('public.booking_reference_seq')")
            ).scalar()
            ref_number = f"{(int(seq) - 1) % 100000:05d}"
            booking_reference = f"NGT-{ref_year}-{ref_number}"

        booking = Booking(
            user_id=user_id,
            tour_id=tour_id,
            availability_id=avail.id if avail else None,
            adults=adults,
            children=children,
            travel_date=resolved_travel_date,
            return_date=parsed_return_date,
            subtotal=subtotal,
            fees=fees,
            total_price=total,
            status="pending",
            booking_reference=booking_reference,
            special_requests=special_requests,
        )
        db.session.add(booking)

        # Reserve the seats within the same transaction, if this booking is
        # tied to a specific scheduled departure.
        if avail:
            avail.seats_booked = (avail.seats_booked or 0) + seats_needed
            if avail.seats_booked >= avail.seats_total:
                avail.status = "full"

        db.session.commit()
    except Exception as exc:  # noqa: BLE001
        db.session.rollback()
        if isinstance(exc, (ValueError,)) or getattr(exc, "code", None) == "400":
            raise
        return jsonify(error="Could not create booking. Please try again."), 500

    notify(
        user_id,
        "booking_created",
        "Booking received",
        f"Your booking {booking.booking_reference} has been received and is pending confirmation.",
        booking_id=booking.id,
    )

    customer = db.session.get(User, user_id)
    customer_label = (customer.full_name or customer.email) if customer else "A customer"
    tour_label = booking.tour.title if booking.tour else "a tour"
    admins = db.session.query(User).filter_by(is_admin=True).all()
    for admin in admins:
        notify(
            admin.id,
            "admin_new_booking",
            "New booking received",
            (
                f"{customer_label} booked {tour_label} "
                f"({booking.booking_reference}) for KES {float(booking.total_price):,.0f}."
            ),
            booking_id=booking.id,
        )

    db.session.commit()

    return (
        jsonify(
            {
                "id": booking.id,
                "booking_reference": booking.booking_reference,
                "subtotal": float(booking.subtotal),
                "fees": float(booking.fees),
                "total_price": float(booking.total_price),
                "status": booking.status,
                "adults": booking.adults,
                "children": booking.children,
                "travel_date": booking.travel_date.isoformat()
                if booking.travel_date
                else None,
                "return_date": booking.return_date.isoformat()
                if booking.return_date
                else None,
            }
        ),
        201,
    )


@bookings_bp.get("/bookings/me")
@jwt_required()
def list_my_bookings():
    user_id = get_jwt_identity()
    bookings = (
        db.session.query(Booking)
        .filter_by(user_id=user_id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return jsonify([_booking_payload(b) for b in bookings])


@bookings_bp.post("/bookings/<booking_id>/cancel")
@jwt_required()
def cancel_my_booking(booking_id):
    user_id = get_jwt_identity()
    booking = db.session.get(Booking, booking_id)
    if not booking or booking.user_id != user_id:
        return jsonify(error="Booking not found"), 404

    if booking.status not in ("pending", "confirmed"):
        return jsonify(error="This booking can no longer be cancelled."), 400

    booking.status = "cancelled"
    _release_seats(booking)
    notify(
        user_id,
        "booking_cancelled",
        "Booking cancelled",
        f"Your booking {booking.booking_reference} has been cancelled.",
        booking_id=booking.id,
    )
    db.session.commit()
    return jsonify(_booking_payload(booking))


@bookings_bp.get("/admin/bookings")
@admin_required
def admin_list_bookings():
    status = request.args.get("status")
    q = db.session.query(Booking)
    if status:
        q = q.filter(Booking.status == status)
    bookings = q.order_by(Booking.created_at.desc()).all()
    return jsonify([_booking_payload(b) for b in bookings])


@bookings_bp.patch("/admin/bookings/<booking_id>/status")
@admin_required
def admin_update_status(booking_id):
    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip().lower()
    allowed = {"pending", "confirmed", "cancelled", "completed"}
    if new_status not in allowed:
        return jsonify(error=f"Invalid status. Must be one of {sorted(allowed)}"), 400

    booking = db.session.get(Booking, booking_id)
    if not booking:
        return jsonify(error="Booking not found"), 404

    old_status = booking.status
    booking.status = new_status

    # Release reserved seats when a booking is cancelled.
    if new_status == "cancelled" and old_status != "cancelled":
        _release_seats(booking)

    if new_status != old_status and new_status in ("confirmed", "completed", "cancelled"):
        status_copy = {
            "confirmed": "Your booking has been confirmed!",
            "completed": "We hope you enjoyed your safari! Your booking is now marked completed.",
            "cancelled": "Your booking has been cancelled by our team.",
        }
        notify(
            booking.user_id,
            f"booking_{new_status}",
            f"Booking {new_status}",
            f"{status_copy[new_status]} Reference: {booking.booking_reference}.",
            booking_id=booking.id,
        )

    db.session.commit()
    return jsonify(_booking_payload(booking))


def _release_seats(booking):
    if not booking.availability_id:
        return
    avail = db.session.get(TourAvailability, booking.availability_id)
    if not avail:
        return
    avail.seats_booked = max((avail.seats_booked or 0) - (booking.adults + booking.children), 0)
    if avail.status == "full":
        avail.status = "open"


def _parse_date(value):
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def _booking_payload(b: Booking):
    return {
        "id": b.id,
        "user_id": b.user_id,
        "tour_id": b.tour_id,
        "availability_id": b.availability_id,
        "tour_title": b.tour.title if b.tour else None,
        "customer_name": b.user.full_name if b.user else None,
        "customer_email": b.user.email if b.user else None,
        "adults": b.adults,
        "children": b.children,
        "travel_date": b.travel_date.isoformat() if b.travel_date else None,
        "return_date": b.return_date.isoformat() if b.return_date else None,
        "subtotal": float(b.subtotal or 0),
        "fees": float(b.fees or 0),
        "total_price": float(b.total_price or 0),
        "status": b.status,
        "booking_reference": b.booking_reference,
        "special_requests": b.special_requests,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }
