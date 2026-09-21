from .auth import auth_bp
from .tours import tours_bp
from .bookings import bookings_bp
from .admin import admin_bp
from .payments import payments_bp
from .notifications import notifications_bp
from .wishlist import wishlist_bp
from .reviews import reviews_bp
from .support import support_bp

__all__ = [
    "auth_bp",
    "tours_bp",
    "bookings_bp",
    "admin_bp",
    "payments_bp",
    "notifications_bp",
    "wishlist_bp",
    "reviews_bp",
    "support_bp",
]
