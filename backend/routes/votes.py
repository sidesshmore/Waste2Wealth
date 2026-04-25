from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..db import db
from ..services.consensus import check_consensus
from .auth import get_current_user

router = APIRouter()


class VotePayload(BaseModel):
    cleanup_id: str
    vote:       bool


@router.post("/")
async def submit_vote(p: VotePayload, user=Depends(get_current_user)):
    res = await db.table('users').select('world_id_nullifier').eq('id', user['sub']).maybe_single().execute()
    if not res.data or not res.data.get('world_id_nullifier'):
        raise HTTPException(403, 'World ID verification required to vote')

    await db.table('votes').upsert({
        'cleanup_id': p.cleanup_id,
        'voter_id':   user['sub'],
        'vote':       p.vote,
    }, on_conflict='cleanup_id,voter_id').execute()

    await check_consensus(p.cleanup_id)
    return {'ok': True}
