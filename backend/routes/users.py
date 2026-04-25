import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Literal
from ..db import db
from .auth import get_current_user, verify_supabase_token

router = APIRouter()


@router.post("/sync")
async def sync_user(user=Depends(verify_supabase_token)):
    res = await db.table('users').select('id').eq('id', user['sub']).maybe_single().execute()
    is_new = res.data is None
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
    res = await db.table('users') \
        .select('id,email,world_id_nullifier,wallet_address,reputation,sol_earned') \
        .eq('id', user['sub']).maybe_single().execute()
    if not res.data:
        raise HTTPException(404, 'User not found')
    return res.data


class WorldIDProof(BaseModel):
    proof: str
    merkle_root: str
    nullifier_hash: str
    verification_level: Literal['orb', 'device'] = 'orb'


@router.post("/verify-world-id")
async def attach_world_id(payload: WorldIDProof, user=Depends(get_current_user)):
    res = await db.table('users').select('id') \
        .eq('world_id_nullifier', payload.nullifier_hash).maybe_single().execute()
    if res.data and res.data['id'] != user['sub']:
        raise HTTPException(409, 'This World ID is already linked to another account')

    url = f"https://developer.worldcoin.org/api/v1/verify/{os.environ['WORLD_APP_ID']}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(url, json={
            'nullifier_hash':     payload.nullifier_hash,
            'merkle_root':        payload.merkle_root,
            'proof':              payload.proof,
            'verification_level': payload.verification_level,
            'action':             os.environ['WORLD_ACTION'],
            'signal':             '',
        })
    if r.status_code != 200:
        raise HTTPException(400, f'World ID verification failed: {r.text}')

    await db.table('users').update({'world_id_nullifier': payload.nullifier_hash}) \
        .eq('id', user['sub']).execute()
    return {'ok': True, 'nullifier_hash': payload.nullifier_hash}


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
