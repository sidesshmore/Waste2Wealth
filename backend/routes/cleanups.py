from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from ..db import db
from ..services.cloudinary_vision import compare_before_after
from .auth import get_current_user

router = APIRouter()


class ClaimRequest(BaseModel):
    report_id: str
    lat:       float
    lng:       float


@router.post("/")
async def claim(payload: ClaimRequest, user=Depends(get_current_user)):
    res = await db.table('reports').select('*').eq('id', payload.report_id).maybe_single().execute()
    report = res.data
    if not report:
        raise HTTPException(404, 'Report not found')
    if report['user_id'] == user['sub']:
        raise HTTPException(400, 'Cannot clean your own report')
    if report['status'] != 'open':
        raise HTTPException(409, f"Report is {report['status']}")

    distance = await db.rpc('get_report_distance', {
        'p_report_id': payload.report_id,
        'p_lng': payload.lng,
        'p_lat': payload.lat,
    })
    # 200m for indoor venue GPS drift; tighten to 50m in production
    if distance and distance > 200:
        raise HTTPException(400, f'Too far from location ({distance:.0f}m). Must be within 200m.')

    res = await db.table('cleanups').insert({
        'report_id':        payload.report_id,
        'cleaner_id':       user['sub'],
        'before_url':       report['photo_url'],
        'before_public_id': report['photo_public_id'],
        'status':           'claimed',
    }).execute()
    cleanup_id = res.data[0]['id']

    await db.table('reports').update({'status': 'claimed'}).eq('id', payload.report_id).execute()
    return {'cleanup_id': cleanup_id}


class AfterPhotoPayload(BaseModel):
    after_url:        str
    after_public_id:  str
    before_public_id: str


@router.patch("/{cleanup_id}/submit")
async def submit_cleanup(
    cleanup_id: str,
    payload: AfterPhotoPayload,
    bg: BackgroundTasks,
    user=Depends(get_current_user),
):
    res = await db.table('cleanups').update({
        'after_url':       payload.after_url,
        'after_public_id': payload.after_public_id,
        'status':          'pending_verification',
        'submitted_at':    'now()',
    }).eq('id', cleanup_id).eq('cleaner_id', user['sub']).execute()

    if not res.data:
        raise HTTPException(404, 'Cleanup not found or not yours')

    report_id = res.data[0]['report_id']
    await db.table('reports').update({'status': 'pending_verification'}).eq('id', report_id).execute()

    bg.add_task(_cleanup_vision, cleanup_id, payload.before_public_id, payload.after_public_id)
    return {'ok': True}


async def _cleanup_vision(cleanup_id: str, before_id: str, after_id: str):
    try:
        result = await compare_before_after(before_id, after_id)
        await db.table('cleanups').update({'vision_transcript': result}) \
            .eq('id', cleanup_id).execute()
    except Exception as e:
        print(f'Cleanup vision failed for {cleanup_id}: {e}')
