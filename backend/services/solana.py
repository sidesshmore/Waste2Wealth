import json
import os
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import transfer
from solders.message import Message
from solders.transaction import VersionedTransaction

DEVNET_URL = "https://api.devnet.solana.com"


def load_escrow_keypair() -> Keypair:
    with open(os.environ["ESCROW_KEYPAIR_PATH"]) as f:
        secret = json.load(f)
    return Keypair.from_bytes(bytes(secret))


async def send_sol(to_address: str, amount_sol: float, escrow: Keypair) -> str:
    async with AsyncClient(DEVNET_URL) as client:
        to_pubkey = Pubkey.from_string(to_address)
        lamports  = int(amount_sol * 1_000_000_000)
        ix = transfer({
            "from_pubkey": escrow.pubkey(),
            "to_pubkey":   to_pubkey,
            "lamports":    lamports,
        })
        latest = await client.get_latest_blockhash()
        msg = Message.new_with_blockhash([ix], escrow.pubkey(), latest.value.blockhash)
        tx  = VersionedTransaction(msg, [escrow])
        resp = await client.send_transaction(tx)
        return str(resp.value)


async def distribute_rewards(cleanup_id: str):
    from ..db import db

    escrow = load_escrow_keypair()

    cleanup_res = await db.table('cleanups').select('*').eq('id', cleanup_id).maybe_single().execute()
    cleanup = cleanup_res.data
    if not cleanup:
        return

    report_res = await db.table('reports').select('user_id').eq('id', cleanup['report_id']).maybe_single().execute()
    reporter_id = report_res.data['user_id'] if report_res.data else None

    votes_res = await db.table('votes').select('voter_id').eq('cleanup_id', cleanup_id).eq('vote', True).execute()
    voter_ids = [v['voter_id'] for v in (votes_res.data or [])]

    async def wallet_for(user_id):
        res = await db.table('users').select('wallet_address').eq('id', user_id).maybe_single().execute()
        return res.data['wallet_address'] if res.data else None

    async def record(user_id, amount, kind, sig):
        await db.table('transactions').insert({
            'user_id': user_id, 'amount_sol': amount,
            'type': kind, 'tx_signature': sig, 'cleanup_id': cleanup_id,
        }).execute()
        res = await db.table('users').select('sol_earned').eq('id', user_id).maybe_single().execute()
        current = res.data['sol_earned'] if res.data else 0
        await db.table('users').update({'sol_earned': current + amount}).eq('id', user_id).execute()

    cleaner_wallet = await wallet_for(cleanup['cleaner_id'])
    if cleaner_wallet:
        sig = await send_sol(cleaner_wallet, 0.10, escrow)
        await record(cleanup['cleaner_id'], 0.10, 'cleaner', sig)

    if reporter_id:
        reporter_wallet = await wallet_for(reporter_id)
        if reporter_wallet:
            sig = await send_sol(reporter_wallet, 0.01, escrow)
            await record(reporter_id, 0.01, 'reporter', sig)

    for voter_id in voter_ids:
        voter_wallet = await wallet_for(voter_id)
        if voter_wallet:
            sig = await send_sol(voter_wallet, 0.005, escrow)
            await record(voter_id, 0.005, 'verifier', sig)
