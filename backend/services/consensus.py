from ..db import db

APPROVE_THRESHOLD = 5
REJECT_THRESHOLD  = 3


async def check_consensus(cleanup_id: str):
    res = await db.table('votes').select('vote').eq('cleanup_id', cleanup_id).execute()
    rows = res.data or []
    approvals  = sum(1 for r in rows if r['vote'])
    rejections = len(rows) - approvals

    if approvals >= APPROVE_THRESHOLD:
        await db.table('cleanups').update({'status': 'confirmed'}).eq('id', cleanup_id).execute()
        cleanup = await db.table('cleanups').select('report_id').eq('id', cleanup_id).maybe_single().execute()
        if cleanup.data:
            await db.table('reports').update({'status': 'verified'}) \
                .eq('id', cleanup.data['report_id']).execute()
        from .solana import distribute_rewards
        await distribute_rewards(cleanup_id)

    elif rejections >= REJECT_THRESHOLD:
        await db.table('cleanups').update({'status': 'rejected'}).eq('id', cleanup_id).execute()
        cleanup = await db.table('cleanups').select('report_id').eq('id', cleanup_id).maybe_single().execute()
        if cleanup.data:
            await db.table('reports').update({'status': 'open'}) \
                .eq('id', cleanup.data['report_id']).execute()
