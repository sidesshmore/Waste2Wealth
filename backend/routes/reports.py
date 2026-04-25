from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from ..db import db
from ..services.cloudinary_vision import moderate_image, REPORT_PROMPTS
from ..services.gemma import tag_severity
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


@router.get("/nearby")
async def nearby(lat: float, lng: float, radius_km: float = 2.0):
    return await db.rpc('get_nearby_reports', {
        'p_lng': lng,
        'p_lat': lat,
        'p_radius_m': radius_km * 1000,
    })


@router.post("/")
async def create_report(
    payload: ReportCreate,
    bg: BackgroundTasks,
    user=Depends(get_current_user),
):
    report_id = await db.rpc('create_report', {
        'p_user_id':        user['sub'],
        'p_lng':            payload.lng,
        'p_lat':            payload.lat,
        'p_photo_url':      payload.photo_url,
        'p_photo_public_id': payload.photo_public_id,
        'p_severity':       payload.severity,
        'p_tags':           payload.tags,
    })

    bg.add_task(_vision_check, report_id, payload.photo_public_id)
    bg.add_task(tag_severity, report_id, payload.photo_url)
    bg.add_task(notify_nearby_users, payload.lat, payload.lng, report_id, user['sub'])
    return {'report_id': report_id}


async def _vision_check(report_id: str, public_id: str):
    try:
        result = await moderate_image(public_id, REPORT_PROMPTS)
        verdict = (
            result.get('data', {})
                  .get('analysis', {})
                  .get('rejection_questions_responses', [])
        )
        is_garbage = verdict[0]['response'].lower() == 'yes' if verdict else True
        is_ai_gen  = verdict[1]['response'].lower() == 'yes' if len(verdict) > 1 else False
        new_status = 'flagged' if (not is_garbage or is_ai_gen) else 'open'
        await db.table('reports').update({
            'vision_transcript': result,
            'status': new_status,
        }).eq('id', report_id).execute()
    except Exception as e:
        print(f'Vision check failed for {report_id}: {e}')
