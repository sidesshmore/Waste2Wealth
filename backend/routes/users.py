import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..db import db
from .auth import get_current_user, verify_supabase_token
from ..services.world_id_signing import sign_rp_request

router = APIRouter()


@router.post("/sync")
async def sync_user(user=Depends(verify_supabase_token)):
    res = await db.table('users').select('id').eq('id', user['sub']).maybe_single().execute()
    is_new = res is None or res.data is None
    if is_new:
        await db.table('users').insert({
            'id': user['sub'],
            'email': user.get('email'),
            'reputation': 100,
            'sol_earned': 0,
        }).execute()
    return {'user_id': user['sub'], 'is_new': is_new}


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    try:
        res = await db.table('users') \
            .select('id,email,world_id_nullifier,wallet_address,reputation,sol_earned') \
            .eq('id', user['sub']).maybe_single().execute()
    except Exception as e:
        print(f"[users/me] db error: {e}")
        raise HTTPException(500, f"DB error: {e}")

    if res is None or not res.data:
        # Auto-create for anonymous / unsynced sessions
        print(f"[users/me] auto-creating user {user['sub']}")
        try:
            await db.table('users').insert({
                'id': user['sub'],
                'email': user.get('email'),
                'reputation': 100,
                'sol_earned': 0,
            }).execute()
            res = await db.table('users') \
                .select('id,email,world_id_nullifier,wallet_address,reputation,sol_earned') \
                .eq('id', user['sub']).maybe_single().execute()
        except Exception as e:
            print(f"[users/me] auto-create error: {e}")
            raise HTTPException(500, f"Could not create user: {e}")

    return res.data


@router.get("/rp-signature")
async def rp_signature(user=Depends(get_current_user)):
    action = os.environ['WORLD_ACTION']
    return sign_rp_request(action)


class WorldIDV4Payload(BaseModel):
    idkit_response: dict


@router.post("/verify-world-id")
async def attach_world_id(payload: WorldIDV4Payload, user=Depends(get_current_user)):
    rp_id = os.environ['WORLD_RP_ID']

    # Forward the IDKit response directly to World ID v4 verify endpoint
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"https://developer.world.org/api/v4/verify/{rp_id}",
            json=payload.idkit_response,
            headers={"content-type": "application/json"},
        )
    if r.status_code != 200:
        raise HTTPException(400, f'World ID verification failed: {r.text}')

    # Extract nullifier from IDKit response (same location for v3 and v4)
    responses = payload.idkit_response.get('responses', [])
    nullifier = responses[0].get('nullifier') if responses else None
    if not nullifier:
        raise HTTPException(400, 'No nullifier in IDKit response')

    # Prevent same World ID linking to two accounts
    existing = await db.table('users').select('id') \
        .eq('world_id_nullifier', nullifier).maybe_single().execute()
    if existing is not None and existing.data and existing.data['id'] != user['sub']:
        raise HTTPException(409, 'This World ID is already linked to another account')

    await db.table('users').update({'world_id_nullifier': nullifier}) \
        .eq('id', user['sub']).execute()
    return {'ok': True, 'nullifier': nullifier}


@router.post("/dev-verify")
async def dev_verify_world_id(user=Depends(get_current_user)):
    import uuid
    try:
        res = await db.table('users').select('id,world_id_nullifier') \
            .eq('id', user['sub']).maybe_single().execute()
    except Exception as e:
        res = type('R', (), {'data': None})()

    if not res.data:
        # Auto-create user if missing
        await db.table('users').insert({
            'id': user['sub'],
            'email': user.get('email'),
            'reputation': 100,
            'sol_earned': 0,
        }).execute()
        res = await db.table('users').select('id,world_id_nullifier') \
            .eq('id', user['sub']).maybe_single().execute()

    if res.data and res.data.get('world_id_nullifier'):
        return {'ok': True, 'nullifier_hash': res.data['world_id_nullifier']}

    fake_nullifier = f"dev_{uuid.uuid4().hex}"
    await db.table('users').update({'world_id_nullifier': fake_nullifier}) \
        .eq('id', user['sub']).execute()
    return {'ok': True, 'nullifier_hash': fake_nullifier}


class WalletPayload(BaseModel):
    wallet_address: str


@router.post("/wallet")
async def save_wallet(p: WalletPayload, user=Depends(get_current_user)):
    await db.table('users').update({'wallet_address': p.wallet_address}) \
        .eq('id', user['sub']).execute()
    return {'ok': True}


class PushTokenPayload(BaseModel):
    token: str


@router.post("/push-token")
async def save_push_token(p: PushTokenPayload, user=Depends(get_current_user)):
    await db.table('users').update({'push_token': p.token}) \
        .eq('id', user['sub']).execute()
    return {'ok': True}


class LocationPayload(BaseModel):
    lat: float
    lng: float


@router.post("/location")
async def update_location(p: LocationPayload, user=Depends(get_current_user)):
    await db.rpc('update_user_location', {
        'p_user_id': user['sub'],
        'p_lng': p.lng,
        'p_lat': p.lat,
    })
    return {'ok': True}
