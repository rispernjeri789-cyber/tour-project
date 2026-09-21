from flask import Blueprint, request, jsonify

from ..extensions import db
from ..models import Park, Tour, TourAvailability

tours_bp = Blueprint("tours", __name__, url_prefix="/api")


@tours_bp.get("/parks")
def list_parks():
    parks = db.session.query(Park).order_by(Park.name).all()
    return jsonify([_park_payload(p) for p in parks])


@tours_bp.get("/tours")
def list_tours():
    q = db.session.query(Tour).filter(Tour.status == "active")

    park_id = request.args.get("park_id")
    if park_id:
        q = q.filter(Tour.park_id == park_id)

    tour_type = request.args.get("tour_type")
    if tour_type:
        q = q.filter(Tour.tour_type == tour_type)

    min_price = request.args.get("min_price", type=float)
    if min_price is not None:
        q = q.filter(Tour.price_per_adult >= min_price)

    max_price = request.args.get("max_price", type=float)
    if max_price is not None:
        q = q.filter(Tour.price_per_adult <= max_price)

    month = request.args.get("month", type=int)
    # month filter is applied on availability start_date in a subquery
    if month:
        subq = (
            db.session.query(TourAvailability.tour_id)
            .filter(db.extract("month", TourAvailability.start_date) == month)
            .distinct()
        )
        q = q.filter(Tour.id.in_(subq))

    tours = q.order_by(Tour.created_at.desc()).all()
    return jsonify([_tour_payload(t) for t in tours])


@tours_bp.get("/tours/<tour_id>")
def get_tour(tour_id):
    tour = db.session.get(Tour, tour_id)
    if not tour:
        return jsonify(error="Tour not found"), 404

    park = db.session.get(Park, tour.park_id) if tour.park_id else None
    availability = (
        db.session.query(TourAvailability)
        .filter_by(tour_id=tour_id)
        .order_by(TourAvailability.start_date)
        .all()
    )

    payload = _tour_payload(tour)
    payload["park"] = _park_payload(park) if park else None
    payload["availability"] = [_availability_payload(a) for a in availability]
    return jsonify(payload)


def _park_payload(park: Park):
    if not park:
        return None
    return {
        "id": park.id,
        "name": park.name,
        "circuit": park.circuit,
        "description": park.description,
        "hero_image_url": park.hero_image_url,
        "best_time_to_visit": park.best_time_to_visit,
    }


def _tour_payload(tour: Tour):
    return {
        "id": tour.id,
        "park_id": tour.park_id,
        "title": tour.title,
        "tour_type": tour.tour_type,
        "duration_days": tour.duration_days,
        "duration_nights": tour.duration_nights,
        "price_per_adult": float(tour.price_per_adult or 0),
        "price_per_child": float(tour.price_per_child or 0),
        "pricing_unit": tour.pricing_unit,
        "high_season_price_per_adult": (
            float(tour.high_season_price_per_adult)
            if tour.high_season_price_per_adult is not None
            else None
        ),
        "high_season_price_per_child": (
            float(tour.high_season_price_per_child)
            if tour.high_season_price_per_child is not None
            else None
        ),
        "max_travelers": tour.max_travelers,
        "includes": tour.includes or [],
        "excludes": tour.excludes or [],
        "itinerary": tour.itinerary or [],
        "rating": float(tour.rating) if tour.rating is not None else None,
        "images": tour.images or [],
        "status": tour.status,
    }


def _availability_payload(a: TourAvailability):
    seats_available = max((a.seats_total or 0) - (a.seats_booked or 0), 0)
    return {
        "id": a.id,
        "tour_id": a.tour_id,
        "start_date": a.start_date.isoformat() if a.start_date else None,
        "end_date": a.end_date.isoformat() if a.end_date else None,
        "seats_total": a.seats_total,
        "seats_booked": a.seats_booked,
        "seats_available": seats_available,
        "status": a.status,
    }
