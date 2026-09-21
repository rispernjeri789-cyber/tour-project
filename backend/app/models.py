import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    JSON,
    ARRAY,
    text,
    func,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from .extensions import db


class Park(db.Model):
    __tablename__ = "parks"

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = mapped_column(String, nullable=False)
    circuit = mapped_column(String, nullable=True)
    description = mapped_column(Text, nullable=True)
    hero_image_url = mapped_column(String, nullable=True)
    best_time_to_visit = mapped_column(String, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    tours = relationship("Tour", back_populates="park", lazy="dynamic")


class Tour(db.Model):
    __tablename__ = "tours"

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    park_id = mapped_column(
        String(36), ForeignKey("parks.id", ondelete="SET NULL"), nullable=True
    )
    title = mapped_column(String, nullable=False)
    tour_type = mapped_column(String, nullable=True)
    duration_days = mapped_column(Integer, nullable=True)
    duration_nights = mapped_column(Integer, nullable=True)
    price_per_adult = mapped_column(Numeric(12, 2), nullable=False, default=0)
    price_per_child = mapped_column(Numeric(12, 2), nullable=False, default=0)
    # Optional surge rate for peak months (see HIGH_SEASON_MONTHS). Null means
    # this tour has no separate high-season pricing — it always charges
    # price_per_adult/price_per_child.
    high_season_price_per_adult = mapped_column(Numeric(12, 2), nullable=True)
    high_season_price_per_child = mapped_column(Numeric(12, 2), nullable=True)
    # "per_person" (default): price_per_adult/child is charged per traveler.
    # "per_day": a flat vehicle-hire rate (price_per_adult, ignoring headcount)
    # is charged for each day of the trip instead.
    pricing_unit = mapped_column(String, nullable=False, server_default=text("'per_person'"))
    max_travelers = mapped_column(Integer, nullable=True)
    includes = mapped_column(ARRAY(Text), nullable=False, server_default=text("'{}'"))
    excludes = mapped_column(ARRAY(Text), nullable=False, server_default=text("'{}'"))
    itinerary = mapped_column(JSON, nullable=False, server_default=text("'[]'"))
    rating = mapped_column(Numeric(3, 2), nullable=True)
    images = mapped_column(ARRAY(Text), nullable=False, server_default=text("'{}'"))
    status = mapped_column(String, nullable=False, default="draft")
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    park = relationship("Park", back_populates="tours")
    availability = relationship(
        "TourAvailability", back_populates="tour", lazy="dynamic"
    )


class TourAvailability(db.Model):
    __tablename__ = "tour_availability"

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tour_id = mapped_column(
        String(36),
        ForeignKey("tours.id", ondelete="CASCADE"),
        nullable=False,
    )
    start_date = mapped_column(Date, nullable=False)
    end_date = mapped_column(Date, nullable=True)
    seats_total = mapped_column(Integer, nullable=False, default=0)
    seats_booked = mapped_column(Integer, nullable=False, default=0)
    status = mapped_column(String, nullable=False, default="open")

    tour = relationship("Tour", back_populates="availability")


# Mapped onto the existing `profiles` table (reused from Supabase).
# `password_hash` is a NEW nullable column we add via migration (legacy
# Supabase-auth users will not have one — see Phase 6 note).
class User(db.Model):
    __tablename__ = "profiles"

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = mapped_column(String, nullable=True)
    email = mapped_column(String, nullable=True)
    phone = mapped_column(String, nullable=True)
    password_hash = mapped_column(String, nullable=True)
    is_admin = mapped_column(Boolean, nullable=False, default=False)
    notify_email = mapped_column(Boolean, nullable=False, server_default=text("true"), default=True)
    notify_sms = mapped_column(Boolean, nullable=False, server_default=text("true"), default=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    bookings = relationship("Booking", back_populates="user", lazy="dynamic")


class Booking(db.Model):
    __tablename__ = "bookings"

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = mapped_column(
        String(36),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    tour_id = mapped_column(
        String(36), ForeignKey("tours.id", ondelete="RESTRICT"), nullable=False
    )
    availability_id = mapped_column(
        String(36),
        ForeignKey("tour_availability.id", ondelete="SET NULL"),
        nullable=True,
    )
    adults = mapped_column(Integer, nullable=False, default=1)
    children = mapped_column(Integer, nullable=False, default=0)
    travel_date = mapped_column(Date, nullable=True)
    return_date = mapped_column(Date, nullable=True)
    subtotal = mapped_column(Numeric(12, 2), nullable=False, default=0)
    fees = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_price = mapped_column(Numeric(12, 2), nullable=False, default=0)
    status = mapped_column(String, nullable=False, default="pending")
    booking_reference = mapped_column(String, nullable=False, unique=True)
    special_requests = mapped_column(Text, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bookings")
    tour = relationship("Tour")
    availability = relationship("TourAvailability")


class Payment(db.Model):
    __tablename__ = "payments"

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    booking_id = mapped_column(
        String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    user_id = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    amount = mapped_column(Numeric(12, 2), nullable=False)
    currency = mapped_column(String, nullable=False, default="KES")
    method = mapped_column(String, nullable=False, default="mpesa")
    phone_number = mapped_column(String, nullable=True)
    status = mapped_column(String, nullable=False, default="pending")

    # M-Pesa Daraja STK Push identifiers.
    merchant_request_id = mapped_column(String, nullable=True)
    checkout_request_id = mapped_column(String, nullable=True, unique=True)
    mpesa_receipt_number = mapped_column(String, nullable=True)
    result_code = mapped_column(Integer, nullable=True)
    result_desc = mapped_column(String, nullable=True)

    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    booking = relationship("Booking", backref="payments")
    user = relationship("User")


class Notification(db.Model):
    __tablename__ = "notifications"

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    booking_id = mapped_column(
        String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True
    )
    type = mapped_column(String, nullable=False)
    title = mapped_column(String, nullable=False)
    body = mapped_column(Text, nullable=True)
    is_read = mapped_column(Boolean, nullable=False, server_default=text("false"), default=False)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    booking = relationship("Booking")


class SavedTour(db.Model):
    __tablename__ = "saved_tours"
    __table_args__ = (db.UniqueConstraint("user_id", "tour_id", name="uq_saved_tours_user_tour"),)

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    tour_id = mapped_column(
        String(36), ForeignKey("tours.id", ondelete="CASCADE"), nullable=False
    )
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    tour = relationship("Tour")


class Review(db.Model):
    __tablename__ = "reviews"

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    booking_id = mapped_column(
        String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    tour_id = mapped_column(
        String(36), ForeignKey("tours.id", ondelete="CASCADE"), nullable=False
    )
    rating = mapped_column(Integer, nullable=False)
    comment = mapped_column(Text, nullable=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    booking = relationship("Booking")
    tour = relationship("Tour")


class SupportMessage(db.Model):
    __tablename__ = "support_messages"

    id = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = mapped_column(
        String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    subject = mapped_column(String, nullable=False)
    message = mapped_column(Text, nullable=False)
    status = mapped_column(String, nullable=False, server_default=text("'open'"), default="open")
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


__all__ = [
    "db",
    "Park",
    "Tour",
    "TourAvailability",
    "User",
    "Booking",
    "Payment",
    "Notification",
    "SavedTour",
    "Review",
    "SupportMessage",
]
