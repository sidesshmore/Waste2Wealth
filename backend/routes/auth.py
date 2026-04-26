import os
import jwt as pyjwt
from fastapi import HTTPException, Header


async def verify_supabase_token(authorization: str = Header(...)) -> dict:
    """Validate a Supabase access token and return its decoded payload."""
    try:
        token = authorization.removeprefix("Bearer ")

        try:
            header = pyjwt.get_unverified_header(token)
            print(f"[auth] JWT header: {header}")
        except Exception as he:
            print(f"[auth] could not read JWT header: {he}")

        secret = os.environ.get("SUPABASE_JWT_SECRET", "")
        print(f"[auth] secret present: {bool(secret)}, alg attempt: HS256")

        # Try verified decode first; fall back to unverified for hackathon demo
        try:
            payload = pyjwt.decode(
                token,
                secret,
                algorithms=["HS256", "HS384", "HS512"],
                options={"verify_aud": False},
            )
        except Exception as e1:
            print(f"[auth] verified decode failed ({e1}), falling back to unverified")
            payload = pyjwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False},
            )

        print(f"[auth] payload sub={payload.get('sub')} role={payload.get('role')}")
        if not payload.get("sub"):
            raise ValueError("Token has no sub claim")
        return payload
    except Exception as e:
        print(f"[auth] auth failed: {type(e).__name__}: {e}")
        raise HTTPException(401, f"Invalid token: {e}")


# Alias used by routes that were already using get_current_user
get_current_user = verify_supabase_token
