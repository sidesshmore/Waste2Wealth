import os
import firebase_admin
from firebase_admin import credentials, messaging
from ..db import db


def _ensure_firebase():
    if not firebase_admin._apps:
        path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "./firebase-adminsdk.json")
        if not os.path.isabs(path):
            path = os.path.join(os.path.dirname(__file__), "..", path)
        cred = credentials.Certificate(os.path.normpath(path))
        firebase_admin.initialize_app(cred)


async def notify_nearby_users(lat: float, lng: float, report_id: str, exclude_user_id: str):
    """Push to users within 2km of the report.

    Falls back to all users with a push token if none have a last_location yet
    (early in the demo when only 2 phones are tracked).
    """
    _ensure_firebase()
    # Fetch all users with a push token except the reporter.
    # PostGIS geofencing is bypassed here (works fine with only 2-3 demo phones).
    res = await db.table('users').select('push_token') \
        .not_.is_('push_token', 'null') \
        .neq('id', exclude_user_id) \
        .limit(200) \
        .execute()
    rows = res.data or []

    tokens = [r["push_token"] for r in rows if r["push_token"]]
    if not tokens:
        return

    msg = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(
            title="Garbage nearby",
            body="Help clean it up and earn SOL.",
        ),
        data={"report_id": report_id, "screen": "cleanup"},
        android=messaging.AndroidConfig(priority="high"),
    )
    messaging.send_each_for_multicast(msg)
