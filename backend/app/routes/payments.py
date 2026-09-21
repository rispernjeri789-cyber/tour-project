from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Booking, Payment
from ..mpesa import stk_push, normalize_phone, MpesaError
from .helpers import notify

payments_bp = Blueprint("payments", __name__, url_prefix="/api")


@payments_bp.post("/bookings/<booking_id>/pay")
@jwt_required()
def initiate_payment(booking_id):
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    method = (data.get("method") or "mpesa").strip().lower()
    if method not in ("mpesa", "cash"):
        return jsonify(error="Unsupported payment method"), 400
    raw_phone = (data.get("phone_number") or "").strip()

    booking = db.session.get(Booking, booking_id)
    if not booking or booking.user_id != user_id:
        return jsonify(error="Booking not found"), 404

    if booking.status == "cancelled":
        return jsonify(error="This booking has been cancelled"), 400
    if booking.status in ("confirmed", "completed"):
        already_paid = (
            db.session.query(Payment)
            .filter_by(booking_id=booking.id, status="succeeded")
            .first()
        )
        if already_paid:
            return jsonify(error="This booking has already been paid for"), 400

    pending = (
        db.session.query(Payment)
        .filter_by(booking_id=booking.id, status="pending")
        .first()
    )
    if pending:
        return (
            jsonify(error="A payment is already in progress for this booking"),
            409,
        )

    if method == "cash":
        payment = Payment(
            booking_id=booking.id,
            user_id=user_id,
            amount=booking.total_price,
            method="cash",
            status="succeeded",
            result_desc="Cash payment — to be collected on the day of travel.",
        )
        db.session.add(payment)
        if booking.status == "pending":
            booking.status = "confirmed"

        notify(
            user_id,
            "payment_succeeded",
            "Booking confirmed — pay by cash",
            (
                f"Your booking {booking.booking_reference} is confirmed. Please have "
                f"KES {float(booking.total_price):,.0f} ready to pay in cash on the day of travel."
            ),
            booking_id=booking.id,
        )
        db.session.commit()

        return (
            jsonify(
                {
                    "payment_id": payment.id,
                    "status": payment.status,
                    "customer_message": "Booking confirmed. Pay in cash on the day of travel.",
                }
            ),
            201,
        )

    try:
        phone_number = normalize_phone(raw_phone)
    except MpesaError as exc:
        return jsonify(error=str(exc)), 400

    payment = Payment(
        booking_id=booking.id,
        user_id=user_id,
        amount=booking.total_price,
        phone_number=phone_number,
        status="pending",
    )
    db.session.add(payment)
    db.session.commit()

    try:
        result = stk_push(
            phone_number=phone_number,
            amount=float(booking.total_price),
            account_reference=booking.booking_reference,
            description="Safari booking",
        )
    except MpesaError as exc:
        payment.status = "failed"
        payment.result_desc = str(exc)
        db.session.commit()
        return jsonify(error=str(exc)), 502

    payment.merchant_request_id = result.get("MerchantRequestID")
    payment.checkout_request_id = result.get("CheckoutRequestID")
    db.session.commit()

    return (
        jsonify(
            {
                "payment_id": payment.id,
                "status": payment.status,
                "customer_message": result.get("CustomerMessage"),
            }
        ),
        201,
    )


@payments_bp.post("/bookings/<booking_id>/payment/cancel")
@jwt_required()
def cancel_payment(booking_id):
    user_id = get_jwt_identity()
    booking = db.session.get(Booking, booking_id)
    if not booking or booking.user_id != user_id:
        return jsonify(error="Booking not found"), 404

    payment = (
        db.session.query(Payment)
        .filter_by(booking_id=booking.id, status="pending")
        .order_by(Payment.created_at.desc())
        .first()
    )
    if not payment:
        return jsonify(error="No payment is currently in progress for this booking"), 404

    # This only stops OUR tracking of the attempt so the customer can retry —
    # it can't recall an STK push already sent to Safaricom. If they actually
    # enter their PIN after cancelling here, the callback will still arrive
    # and correctly mark the payment succeeded (money was genuinely received).
    payment.status = "cancelled"
    payment.result_desc = "Cancelled by customer."
    db.session.commit()
    return jsonify(payment=_payment_payload(payment))


@payments_bp.get("/bookings/<booking_id>/payment")
@jwt_required()
def get_latest_payment(booking_id):
    user_id = get_jwt_identity()
    booking = db.session.get(Booking, booking_id)
    if not booking or booking.user_id != user_id:
        return jsonify(error="Booking not found"), 404

    payment = (
        db.session.query(Payment)
        .filter_by(booking_id=booking.id)
        .order_by(Payment.created_at.desc())
        .first()
    )
    if not payment:
        return jsonify(payment=None)
    return jsonify(payment=_payment_payload(payment))


@payments_bp.get("/payments/me")
@jwt_required()
def list_my_payments():
    user_id = get_jwt_identity()
    payments = (
        db.session.query(Payment)
        .filter_by(user_id=user_id)
        .order_by(Payment.created_at.desc())
        .all()
    )
    return jsonify([_payment_payload(p) for p in payments])


@payments_bp.post("/payments/mpesa/callback")
def mpesa_callback():
    body = request.get_json(silent=True) or {}
    callback = body.get("Body", {}).get("stkCallback", {})
    checkout_request_id = callback.get("CheckoutRequestID")
    result_code = callback.get("ResultCode")
    result_desc = callback.get("ResultDesc")

    payment = (
        db.session.query(Payment)
        .filter_by(checkout_request_id=checkout_request_id)
        .first()
    )
    if not payment:
        # Acknowledge anyway so Safaricom doesn't retry indefinitely.
        return jsonify(ResultCode=0, ResultDesc="Accepted")

    payment.result_code = result_code
    payment.result_desc = result_desc

    if result_code == 0:
        items = {
            item["Name"]: item.get("Value")
            for item in callback.get("CallbackMetadata", {}).get("Item", [])
        }
        payment.status = "succeeded"
        payment.mpesa_receipt_number = items.get("MpesaReceiptNumber")

        booking = db.session.get(Booking, payment.booking_id)
        if booking and booking.status == "pending":
            booking.status = "confirmed"

        notify(
            payment.user_id,
            "payment_succeeded",
            "Payment received",
            f"We received your payment of {payment.amount} {payment.currency}. Receipt: {payment.mpesa_receipt_number}.",
            booking_id=payment.booking_id,
        )
    else:
        payment.status = "failed"
        notify(
            payment.user_id,
            "payment_failed",
            "Payment failed",
            payment.result_desc or "Your M-Pesa payment could not be completed. Please try again.",
            booking_id=payment.booking_id,
        )

    db.session.commit()
    return jsonify(ResultCode=0, ResultDesc="Accepted")


def _payment_payload(p: Payment):
    return {
        "id": p.id,
        "booking_id": p.booking_id,
        "booking_reference": p.booking.booking_reference if p.booking else None,
        "tour_title": p.booking.tour.title if p.booking and p.booking.tour else None,
        "amount": float(p.amount or 0),
        "currency": p.currency,
        "method": p.method,
        "phone_number": p.phone_number,
        "status": p.status,
        "mpesa_receipt_number": p.mpesa_receipt_number,
        "result_desc": p.result_desc,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }
