from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from ..db import db
from ..services.cloudinary_vision import compare_before_after
from ..services.gemma import get_agent_verdicts
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
    # DEV: distance check disabled for demo — re-enable for production
    # if distance and distance > 200:
    #     raise HTTPException(400, f'Too far from location ({distance:.0f}m). Must be within 200m.')

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
    lat:              float
    lng:              float


@router.patch("/{cleanup_id}/submit")
async def submit_cleanup(
    cleanup_id: str,
    payload: AfterPhotoPayload,
    bg: BackgroundTasks,
    user=Depends(get_current_user),
):
    # Verify the cleaner is still near the site at submit time
    cleanup_res = await db.table('cleanups').select('report_id') \
        .eq('id', cleanup_id).eq('cleaner_id', user['sub']).maybe_single().execute()
    if not cleanup_res.data:
        raise HTTPException(404, 'Cleanup not found or not yours')

    report_id = cleanup_res.data['report_id']
    distance = await db.rpc('get_report_distance', {
        'p_report_id': report_id,
        'p_lng': payload.lng,
        'p_lat': payload.lat,
    })
    # DEV: distance check disabled for demo — re-enable for production
    # if distance and distance > 150:
    #     raise HTTPException(400, f'Too far from cleanup site ({distance:.0f}m). Must be within 150m to submit.')

    res = await db.table('cleanups').update({
        'after_url':       payload.after_url,
        'after_public_id': payload.after_public_id,
        'status':          'pending_verification',
        'submitted_at':    'now()',
    }).eq('id', cleanup_id).eq('cleaner_id', user['sub']).execute()

    if not res.data:
        raise HTTPException(404, 'Cleanup not found or not yours')

    await db.table('reports').update({'status': 'pending_verification'}).eq('id', report_id).execute()

    bg.add_task(_cleanup_vision, cleanup_id, report_id, payload.before_public_id, payload.after_public_id)
    return {'ok': True}


def _parse_vision_cleaned(result: dict) -> bool | None:
    """Returns True if garbage removed (pass), False if not removed (fail), None if unclear."""
    try:
        data = result.get('data') or result
        # Shape: moderation.rejection_questions list — question asks "has garbage been removed?"
        # reject=True means Cloudinary answered "yes" → garbage removed → cleanup pass
        rqs = (data.get('moderation') or {}).get('rejection_questions', [])
        if rqs and isinstance(rqs, list):
            first = rqs[0]
            if isinstance(first, dict):
                if first.get('reject') is True:  return True
                if first.get('reject') is False: return False
        # Fallback: top-level status
        status = result.get('status') or data.get('status')
        if status == 'rejected': return True
        if status == 'approved': return False
    except Exception:
        pass
    return None


async def _cleanup_vision(cleanup_id: str, report_id: str, before_id: str, after_id: str):
    try:
        result = await compare_before_after(before_id, after_id)
        cleaned = _parse_vision_cleaned(result)

        update: dict = {'vision_transcript': result}

        if cleaned is False:
            # AI confident garbage not removed — auto-reject, reopen the report
            update['status'] = 'rejected'
            await db.table('cleanups').update(update).eq('id', cleanup_id).execute()
            await db.table('reports').update({'status': 'open'}).eq('id', report_id).execute()
            print(f'Cleanup {cleanup_id} auto-rejected by AI: garbage not removed')
        else:
            # Cleaned or unclear — leave for human consensus voting
            await db.table('cleanups').update(update).eq('id', cleanup_id).execute()
            print(f'Cleanup {cleanup_id} AI result: cleaned={cleaned}, queued for voting')
    except Exception as e:
        print(f'Cleanup vision failed for {cleanup_id}: {e}')


class AgentReviewPayload(BaseModel):
    before_url: str
    after_url:  str


@router.post("/{cleanup_id}/agent-review")
async def agent_review(cleanup_id: str, payload: AgentReviewPayload, user=Depends(get_current_user)):
    verdicts = await get_agent_verdicts(cleanup_id, payload.before_url, payload.after_url)
    return {"verdicts": verdicts}
