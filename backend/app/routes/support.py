from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import SupportMessage

support_bp = Blueprint("support", __name__, url_prefix="/api")


@support_bp.get("/support/me")
@jwt_required()
def list_my_support_messages():
    user_id = get_jwt_identity()
    messages = (
        db.session.query(SupportMessage)
        .filter_by(user_id=user_id)
        .order_by(SupportMessage.created_at.desc())
        .all()
    )
    return jsonify([_support_message_payload(m) for m in messages])


@support_bp.post("/support")
@jwt_required()
def create_support_message():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()

    if not subject or not message:
        return jsonify(error="Subject and message are required"), 400

    support_message = SupportMessage(user_id=user_id, subject=subject, message=message)
    db.session.add(support_message)
    db.session.commit()
    return jsonify(_support_message_payload(support_message)), 201


def _support_message_payload(m: SupportMessage):
    return {
        "id": m.id,
        "subject": m.subject,
        "message": m.message,
        "status": m.status,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }
