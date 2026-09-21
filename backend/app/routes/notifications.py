from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Notification

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api")


@notifications_bp.get("/notifications/me")
@jwt_required()
def list_my_notifications():
    user_id = get_jwt_identity()
    notifications = (
        db.session.query(Notification)
        .filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    unread_count = sum(1 for n in notifications if not n.is_read)
    return jsonify(
        notifications=[_notification_payload(n) for n in notifications],
        unread_count=unread_count,
    )


@notifications_bp.post("/notifications/<notification_id>/read")
@jwt_required()
def mark_notification_read(notification_id):
    user_id = get_jwt_identity()
    notification = db.session.get(Notification, notification_id)
    if not notification or notification.user_id != user_id:
        return jsonify(error="Notification not found"), 404

    notification.is_read = True
    db.session.commit()
    return jsonify(_notification_payload(notification))


@notifications_bp.post("/notifications/read-all")
@jwt_required()
def mark_all_notifications_read():
    user_id = get_jwt_identity()
    db.session.query(Notification).filter_by(user_id=user_id, is_read=False).update(
        {"is_read": True}
    )
    db.session.commit()
    return jsonify(status="ok")


def _notification_payload(n: Notification):
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "booking_id": n.booking_id,
        "is_read": bool(n.is_read),
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }
