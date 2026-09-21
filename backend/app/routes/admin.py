from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from ..extensions import db
from ..models import Park, Tour, Booking, User, Payment, Notification, SavedTour, Review
from .helpers import admin_required
from .tours import _tour_payload, _park_payload
from .bookings import _booking_payload
from .payments import _payment_payload
from .notifications import _notification_payload
from .wishlist import _saved_tour_payload
from .reviews import _review_payload

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

TOUR_STATUSES = {"draft", "active", "inactive"}


@admin_bp.get("/stats")
@admin_required
def stats():
    return jsonify(
        {
            "parks": db.session.query(Park).count(),
            "tours": db.session.query(Tour).count(),
            "active_tours": db.session.query(Tour)
            .filter(Tour.status == "active")
            .count(),
            "bookings": db.session.query(Booking).count(),
            "users": db.session.query(User).count(),
        }
    )


@admin_bp.get("/tours")
@admin_required
def list_tours():
    tours = db.session.query(Tour).order_by(Tour.created_at.desc()).all()
    parks = {p.id: p for p in db.session.query(Park).all()}
    payload = []
    for t in tours:
        item = _tour_payload(t)
        item["park_name"] = parks[t.park_id].name if t.park_id in parks else None
        payload.append(item)
    return jsonify(payload)


@admin_bp.post("/tours")
@admin_required
def create_tour():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify(error="Title is required"), 400

    status = data.get("status") or "draft"
    if status not in TOUR_STATUSES:
        return jsonify(error=f"Invalid status. Must be one of {sorted(TOUR_STATUSES)}"), 400

    pricing_unit = data.get("pricing_unit") or "per_person"
    if pricing_unit not in ("per_person", "per_day"):
        return jsonify(error="pricing_unit must be 'per_person' or 'per_day'"), 400

    tour = Tour(
        title=title,
        park_id=data.get("park_id") or None,
        tour_type=data.get("tour_type") or None,
        duration_days=data.get("duration_days"),
        duration_nights=data.get("duration_nights"),
        price_per_adult=data.get("price_per_adult") or 0,
        price_per_child=data.get("price_per_child") or 0,
        high_season_price_per_adult=data.get("high_season_price_per_adult") or None,
        high_season_price_per_child=data.get("high_season_price_per_child") or None,
        pricing_unit=pricing_unit,
        max_travelers=data.get("max_travelers"),
        includes=data.get("includes") or [],
        excludes=data.get("excludes") or [],
        images=data.get("images") or [],
        status=status,
    )
    db.session.add(tour)
    db.session.commit()
    return jsonify(_tour_payload(tour)), 201


@admin_bp.patch("/tours/<tour_id>")
@admin_required
def update_tour(tour_id):
    tour = db.session.get(Tour, tour_id)
    if not tour:
        return jsonify(error="Tour not found"), 404

    data = request.get_json(silent=True) or {}

    if "status" in data:
        if data["status"] not in TOUR_STATUSES:
            return jsonify(error=f"Invalid status. Must be one of {sorted(TOUR_STATUSES)}"), 400
        tour.status = data["status"]

    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            return jsonify(error="Title cannot be empty"), 400
        tour.title = title

    if "pricing_unit" in data:
        if data["pricing_unit"] not in ("per_person", "per_day"):
            return jsonify(error="pricing_unit must be 'per_person' or 'per_day'"), 400
        tour.pricing_unit = data["pricing_unit"]

    for field in (
        "park_id",
        "tour_type",
        "duration_days",
        "duration_nights",
        "price_per_adult",
        "price_per_child",
        "high_season_price_per_adult",
        "high_season_price_per_child",
        "max_travelers",
        "includes",
        "excludes",
        "images",
    ):
        if field in data:
            setattr(tour, field, data[field])

    db.session.commit()
    return jsonify(_tour_payload(tour))


@admin_bp.get("/users")
@admin_required
def list_users():
    users = db.session.query(User).order_by(User.created_at.desc()).all()
    counts = dict(
        db.session.query(Booking.user_id, db.func.count(Booking.id))
        .group_by(Booking.user_id)
        .all()
    )
    return jsonify(
        [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "phone": u.phone,
                "is_admin": u.is_admin,
                "bookings_count": counts.get(u.id, 0),
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    )


@admin_bp.get("/users/<user_id>")
@admin_required
def get_user_detail(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found"), 404

    trips = (
        db.session.query(Booking)
        .filter_by(user_id=user_id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    saved_parks = (
        db.session.query(SavedTour)
        .filter_by(user_id=user_id)
        .order_by(SavedTour.created_at.desc())
        .all()
    )
    reviews = (
        db.session.query(Review)
        .filter_by(user_id=user_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    notifications = (
        db.session.query(Notification)
        .filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    payments = (
        db.session.query(Payment)
        .filter_by(user_id=user_id)
        .order_by(Payment.created_at.desc())
        .all()
    )

    return jsonify(
        {
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "is_admin": user.is_admin,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
            "trips": [_booking_payload(b) for b in trips],
            "saved_parks": [_saved_tour_payload(s) for s in saved_parks],
            "reviews": [_review_payload(r) for r in reviews],
            "notifications": [_notification_payload(n) for n in notifications],
            "payments": [_payment_payload(p) for p in payments],
        }
    )


@admin_bp.get("/payments")
@admin_required
def list_all_payments():
    payments = db.session.query(Payment).order_by(Payment.created_at.desc()).all()
    payload = []
    for p in payments:
        item = _payment_payload(p)
        item["user_name"] = p.user.full_name if p.user else None
        item["user_email"] = p.user.email if p.user else None
        payload.append(item)
    return jsonify(payload)


@admin_bp.get("/reviews")
@admin_required
def list_all_reviews():
    reviews = db.session.query(Review).order_by(Review.created_at.desc()).all()
    payload = []
    for r in reviews:
        item = _review_payload(r)
        item["user_name"] = r.user.full_name if r.user else None
        item["user_email"] = r.user.email if r.user else None
        payload.append(item)
    return jsonify(payload)


@admin_bp.get("/notifications")
@admin_required
def list_all_notifications():
    notifications = (
        db.session.query(Notification).order_by(Notification.created_at.desc()).all()
    )
    payload = []
    for n in notifications:
        item = _notification_payload(n)
        item["user_name"] = n.user.full_name if n.user else None
        item["user_email"] = n.user.email if n.user else None
        payload.append(item)
    return jsonify(payload)


@admin_bp.patch("/users/<user_id>")
@admin_required
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True) or {}
    if "is_admin" not in data:
        return jsonify(error="is_admin is required"), 400

    if user_id == get_jwt_identity() and not data["is_admin"]:
        return jsonify(error="You cannot remove your own admin access"), 400

    user.is_admin = bool(data["is_admin"])
    db.session.commit()
    return jsonify(
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    )
