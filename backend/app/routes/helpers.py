from functools import wraps

from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import User, Notification


def admin_required(fn):
    """Decorator: requires a valid JWT AND is_admin=True."""

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = db.session.get(User, get_jwt_identity())
        if not user or not user.is_admin:
            return jsonify(error="Admin access required"), 403
        return fn(*args, **kwargs)

    return wrapper


def get_current_user():
    return db.session.get(User, get_jwt_identity())


def notify(user_id, type, title, body=None, booking_id=None):
    """Create a notification row. Does not commit — caller's transaction does."""
    notification = Notification(
        user_id=user_id,
        booking_id=booking_id,
        type=type,
        title=title,
        body=body,
    )
    db.session.add(notification)
    return notification
