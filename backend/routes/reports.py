import httpx
from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from ..db import db
from ..services.cloudinary_vision import moderate_image, describe_image, REPORT_PROMPTS
from ..services.gemma import analyze_image
from ..services.geofence import notify_nearby_users
from .auth import get_current_user

router = APIRouter()


class ReportCreate(BaseModel):
    photo_url:       str
    photo_public_id: str
    lat:             float
    lng:             float
    severity:        str
    tags:            list[str] = []


async def _reverse_geocode(lat: float, lng: float) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json"},
                headers={"User-Agent": "Waste2Wealth/1.0 (lahacks2026@gmail.com)"},
            )
            return r.json().get("display_name")
    except Exception:
        return None


@router.get("/nearby")
async def nearby(lat: float, lng: float, radius_km: float = 2.0):
    return await db.rpc("get_nearby_reports", {
        "p_lng": lng,
        "p_lat": lat,
        "p_radius_m": radius_km * 1000,
    })


@router.post("/")
async def create_report(
    payload: ReportCreate,
    bg: BackgroundTasks,
    user=Depends(get_current_user),
):
    address = await _reverse_geocode(payload.lat, payload.lng)

    report_id = await db.rpc("create_report", {
        "p_user_id":         user["sub"],
        "p_lng":             payload.lng,
        "p_lat":             payload.lat,
        "p_photo_url":       payload.photo_url,
        "p_photo_public_id": payload.photo_public_id,
        "p_severity":        payload.severity,
        "p_tags":            payload.tags,
        "p_address":         address,
    })

    bg.add_task(_vision_check, report_id, payload.photo_public_id)
    bg.add_task(analyze_image, report_id, payload.photo_url)
    bg.add_task(notify_nearby_users, payload.lat, payload.lng, report_id, user["sub"])
    return {"report_id": report_id}


async def _vision_check(report_id: str, public_id: str):
    try:
        result = await moderate_image(public_id, REPORT_PROMPTS)
        verdict = (
            result.get("data", {})
                  .get("analysis", {})
                  .get("rejection_questions_responses", [])
        )
        is_garbage = verdict[0]["response"].lower() == "yes" if verdict else True
        is_ai_gen  = verdict[1]["response"].lower() == "yes" if len(verdict) > 1 else False
        new_status = "flagged" if (not is_garbage or is_ai_gen) else "open"

        try:
            desc = await describe_image(
                public_id,
                "Describe the type of litter visible in this image in one sentence.",
            )
            result["ai_description"] = desc
        except Exception as desc_err:
            print(f"describe_image skipped for {report_id}: {desc_err}")

        await db.table("reports").update({
            "vision_transcript": result,
            "status": new_status,
        }).eq("id", report_id).execute()
    except Exception as e:
        print(f"Vision check failed for {report_id}: {e}")
