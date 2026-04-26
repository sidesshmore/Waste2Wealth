import uuid

# SOL reward amounts by severity tier
REWARDS = {
    'Minor':    {'cleaner': 0.05,  'reporter': 0.005, 'verifier': 0.002},
    'Moderate': {'cleaner': 0.10,  'reporter': 0.010, 'verifier': 0.005},
    'Major':    {'cleaner': 0.20,  'reporter': 0.020, 'verifier': 0.010},
}
DEFAULT_REWARDS = REWARDS['Moderate']


async def distribute_rewards(cleanup_id: str):
    from ..db import db

    cleanup_res = await db.table('cleanups').select('*').eq('id', cleanup_id).maybe_single().execute()
    cleanup = cleanup_res.data
    if not cleanup:
        return

    report_res = await db.table('reports').select('user_id,severity').eq('id', cleanup['report_id']).maybe_single().execute()
    report = report_res.data or {}
    reporter_id = report.get('user_id')
    severity = report.get('severity', 'Moderate')

    tier = REWARDS.get(severity, DEFAULT_REWARDS)

    votes_res = await db.table('votes').select('voter_id').eq('cleanup_id', cleanup_id).eq('vote', True).execute()
    voter_ids = [v['voter_id'] for v in (votes_res.data or [])]

    async def record(user_id, amount, kind):
        mock_sig = f"sim_{uuid.uuid4().hex}"
        await db.table('transactions').insert({
            'user_id': user_id, 'amount_sol': amount,
            'type': kind, 'tx_signature': mock_sig, 'cleanup_id': cleanup_id,
        }).execute()
        res = await db.table('users').select('sol_earned').eq('id', user_id).maybe_single().execute()
        current = (res.data or {}).get('sol_earned') or 0
        await db.table('users').update({'sol_earned': current + amount}).eq('id', user_id).execute()
        print(f'[rewards] {kind} {user_id} +{amount} SOL (severity={severity})')

    await record(cleanup['cleaner_id'], tier['cleaner'], 'cleaner')

    if reporter_id:
        await record(reporter_id, tier['reporter'], 'reporter')

    for voter_id in voter_ids:
        await record(voter_id, tier['verifier'], 'verifier')
