from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Booking, Review

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api")


@reviews_bp.get("/reviews/me")
@jwt_required()
def list_my_reviews():
    user_id = get_jwt_identity()
    reviews = (
        db.session.query(Review)
        .filter_by(user_id=user_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return jsonify([_review_payload(r) for r in reviews])


@reviews_bp.get("/tours/<tour_id>/reviews")
def list_tour_reviews(tour_id):
    reviews = (
        db.session.query(Review)
        .filter_by(tour_id=tour_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return jsonify([_review_payload(r) for r in reviews])


@reviews_bp.post("/bookings/<booking_id>/review")
@jwt_required()
def create_review(booking_id):
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    booking = db.session.get(Booking, booking_id)
    if not booking or booking.user_id != user_id:
        return jsonify(error="Booking not found"), 404

    if booking.status != "completed":
        return jsonify(error="You can only review a completed booking"), 400

    if db.session.query(Review).filter_by(booking_id=booking.id).first():
        return jsonify(error="You have already reviewed this booking"), 400

    try:
        rating = int(data.get("rating"))
    except (TypeError, ValueError):
        return jsonify(error="Rating must be an integer between 1 and 5"), 400
    if rating < 1 or rating > 5:
        return jsonify(error="Rating must be between 1 and 5"), 400

    review = Review(
        user_id=user_id,
        booking_id=booking.id,
        tour_id=booking.tour_id,
        rating=rating,
        comment=(data.get("comment") or "").strip() or None,
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(_review_payload(review)), 201


def _review_payload(r: Review):
    return {
        "id": r.id,
        "booking_id": r.booking_id,
        "tour_id": r.tour_id,
        "tour_title": r.tour.title if r.tour else None,
        "rating": r.rating,
        "comment": r.comment,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
