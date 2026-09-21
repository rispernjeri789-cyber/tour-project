import base64
from datetime import datetime

import requests
from flask import current_app

SANDBOX_BASE = "https://sandbox.safaricom.co.ke"
PRODUCTION_BASE = "https://api.safaricom.co.ke"


class MpesaError(Exception):
    pass


def _base_url():
    return PRODUCTION_BASE if current_app.config["MPESA_ENV"] == "production" else SANDBOX_BASE


def _get_access_token():
    key = current_app.config["MPESA_CONSUMER_KEY"]
    secret = current_app.config["MPESA_CONSUMER_SECRET"]
    if not key or not secret:
        raise MpesaError(
            "M-Pesa is not configured: set MPESA_CONSUMER_KEY and "
            "MPESA_CONSUMER_SECRET in backend/.env (see .env.example)."
        )

    resp = requests.get(
        f"{_base_url()}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
        auth=(key, secret),
        timeout=15,
    )
    if not resp.ok:
        raise MpesaError(f"Could not authenticate with M-Pesa: {resp.text}")
    return resp.json()["access_token"]


def normalize_phone(phone: str) -> str:
    """Accepts 07xx/01xx/2547xx/+2547xx and returns 2547xxxxxxxx."""
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("254") and len(digits) == 12:
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return "254" + digits[1:]
    if len(digits) == 9:
        return "254" + digits
    raise MpesaError("Enter a valid Safaricom phone number, e.g. 0712345678.")


def stk_push(*, phone_number: str, amount: float, account_reference: str, description: str):
    shortcode = current_app.config["MPESA_SHORTCODE"]
    passkey = current_app.config["MPESA_PASSKEY"]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

    token = _get_access_token()
    resp = requests.post(
        f"{_base_url()}/mpesa/stkpush/v1/processrequest",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(round(amount)),
            "PartyA": phone_number,
            "PartyB": shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": current_app.config["MPESA_CALLBACK_URL"],
            "AccountReference": account_reference[:12],
            "TransactionDesc": description[:13],
        },
        timeout=20,
    )
    data = resp.json() if resp.content else {}
    if not resp.ok or data.get("ResponseCode") not in (0, "0"):
        raise MpesaError(data.get("errorMessage") or data.get("ResponseDescription") or "STK push failed")
    return data
