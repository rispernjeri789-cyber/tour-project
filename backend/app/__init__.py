import os

from dotenv import load_dotenv

from .extensions import db, migrate, cors, jwt
from . import models  # noqa: F401  (ensure models are imported for migrations)
from .routes import (
    auth_bp,
    tours_bp,
    bookings_bp,
    admin_bp,
    payments_bp,
    notifications_bp,
    wishlist_bp,
    reviews_bp,
    support_bp,
)


def create_app(config_name: str = None):
    from flask import Flask

    load_dotenv()

    app = Flask(__name__)
    config_name = config_name or os.getenv("FLASK_ENV", "default")
    from .config import configs

    app.config.from_object(configs.get(config_name, configs["default"]))

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        origins=app.config["CORS_ORIGINS"],
        supports_credentials=True,
    )

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return db.session.get(models.User, identity)

    @jwt.unauthorized_loader
    def unauthorized_callback(reason):
        from flask import jsonify

        return jsonify(error="Missing or invalid token", message=reason), 401

    app.register_blueprint(auth_bp)
    app.register_blueprint(tours_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(wishlist_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(support_bp)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
