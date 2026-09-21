from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)

from ..extensions import db, bcrypt
from ..models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()
    phone = (data.get("phone") or "").strip()

    if not email or not password:
        return jsonify(error="Email and password are required"), 400
    if len(password) < 8:
        return jsonify(error="Password must be at least 8 characters"), 400

    if db.session.query(User).filter_by(email=email).first():
        return jsonify(error="An account with this email already exists"), 409

    user = User(
        email=email,
        full_name=full_name or None,
        phone=phone or None,
        password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
        is_admin=False,
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return (
        jsonify(
            token=token,
            user=_user_payload(user),
        ),
        201,
    )


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = db.session.query(User).filter_by(email=email).first()
    if not user or not user.password_hash:
        return jsonify(error="Invalid email or password"), 401
    if not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify(error="Invalid email or password"), 401

    token = create_access_token(identity=str(user.id))
    return jsonify(token=token, user=_user_payload(user))


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return jsonify(error="User not found"), 404
    return jsonify(user=_user_payload(user))


@auth_bp.patch("/me")
@jwt_required()
def update_me():
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True) or {}
    if "email" in data:
        email = (data["email"] or "").strip().lower()
        if not email:
            return jsonify(error="Email is required"), 400
        existing = db.session.query(User).filter_by(email=email).first()
        if existing and existing.id != user.id:
            return jsonify(error="An account with this email already exists"), 409
        user.email = email
    if "full_name" in data:
        user.full_name = (data["full_name"] or None)
    if "phone" in data:
        user.phone = (data["phone"] or None)
    if "notify_email" in data:
        user.notify_email = bool(data["notify_email"])
    if "notify_sms" in data:
        user.notify_sms = bool(data["notify_sms"])
    if data.get("password"):
        if len(data["password"]) < 8:
            return jsonify(error="Password must be at least 8 characters"), 400
        user.password_hash = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    db.session.commit()
    return jsonify(user=_user_payload(user))


def _user_payload(user: User):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "is_admin": bool(user.is_admin),
        "notify_email": bool(user.notify_email),
        "notify_sms": bool(user.notify_sms),
    }
