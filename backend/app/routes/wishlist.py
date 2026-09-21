from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import SavedTour, Tour

wishlist_bp = Blueprint("wishlist", __name__, url_prefix="/api")


@wishlist_bp.get("/wishlist/me")
@jwt_required()
def list_my_wishlist():
    user_id = get_jwt_identity()
    saved = (
        db.session.query(SavedTour)
        .filter_by(user_id=user_id)
        .order_by(SavedTour.created_at.desc())
        .all()
    )
    return jsonify([_saved_tour_payload(s) for s in saved])


@wishlist_bp.post("/wishlist")
@jwt_required()
def add_to_wishlist():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    tour_id = data.get("tour_id")

    tour = db.session.get(Tour, tour_id) if tour_id else None
    if not tour:
        return jsonify(error="Tour not found"), 404

    existing = db.session.query(SavedTour).filter_by(user_id=user_id, tour_id=tour_id).first()
    if existing:
        return jsonify(_saved_tour_payload(existing)), 200

    saved = SavedTour(user_id=user_id, tour_id=tour_id)
    db.session.add(saved)
    db.session.commit()
    return jsonify(_saved_tour_payload(saved)), 201


@wishlist_bp.delete("/wishlist/<tour_id>")
@jwt_required()
def remove_from_wishlist(tour_id):
    user_id = get_jwt_identity()
    saved = db.session.query(SavedTour).filter_by(user_id=user_id, tour_id=tour_id).first()
    if not saved:
        return jsonify(error="Not in wishlist"), 404

    db.session.delete(saved)
    db.session.commit()
    return "", 204


def _saved_tour_payload(s: SavedTour):
    tour = s.tour
    return {
        "id": s.id,
        "tour_id": s.tour_id,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "tour": {
            "id": tour.id,
            "title": tour.title,
            "tour_type": tour.tour_type,
            "duration_days": tour.duration_days,
            "price_per_adult": float(tour.price_per_adult or 0),
            "images": tour.images or [],
            "status": tour.status,
        }
        if tour
        else None,
    }
