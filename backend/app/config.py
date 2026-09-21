import os


def _normalize_db_url(url: str | None) -> str | None:
    """SQLAlchemy 2.x needs postgresql:// (not postgres://)."""
    if not url:
        return url
    return url.replace("postgres://", "postgresql://", 1)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-change-me")

    SQLALCHEMY_DATABASE_URI = _normalize_db_url(os.getenv("DATABASE_URL"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv("SQLALCHEMY_ECHO", "0") == "1"

    CORS_ORIGINS = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]

    # M-Pesa Daraja (STK Push). Defaults are Safaricom's public sandbox
    # shortcode/passkey — usable for testing once you have your own sandbox
    # Consumer Key/Secret from https://developer.safaricom.co.ke.
    MPESA_ENV = os.getenv("MPESA_ENV", "sandbox")
    MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY")
    MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET")
    MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")
    MPESA_PASSKEY = os.getenv(
        "MPESA_PASSKEY",
        "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
    )
    # Must be a publicly reachable HTTPS URL (use ngrok for local dev).
    MPESA_CALLBACK_URL = os.getenv(
        "MPESA_CALLBACK_URL", "http://localhost:5000/api/payments/mpesa/callback"
    )


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


configs = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
