from fastapi import APIRouter, Depends
from ..db import db
from .auth import get_current_user

router = APIRouter()


@router.get("/history")
async def reward_history(user=Depends(get_current_user)):
    res = await db.table('transactions') \
        .select('id,amount_sol,type,tx_signature,cleanup_id,created_at') \
        .eq('user_id', user['sub']) \
        .order('created_at', desc=True) \
        .limit(50) \
        .execute()
    return res.data
