import os
import jwt as pyjwt
from fastapi import HTTPException, Header


async def verify_supabase_token(authorization: str = Header(...)) -> dict:
    """Validate a Supabase access token and return its decoded payload."""
    try:
        token = authorization.removeprefix("Bearer ")
        payload = pyjwt.decode(
            token,
            os.environ["SUPABASE_JWT_SECRET"],
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {e}")


# Alias used by routes that were already using get_current_user
get_current_user = verify_supabase_token
