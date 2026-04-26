import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import users, reports, cleanups, votes, rewards
from .db import db, connect, disconnect


async def _expire_stale_cleanups():
    """Reset cleanups not submitted within 2 hours back to open."""
    while True:
        await asyncio.sleep(300)
        try:
            # Find stale claimed cleanups
            from datetime import datetime, timedelta, timezone
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            stale = await db.table('cleanups').select('id,report_id') \
                .eq('status', 'claimed').lt('claimed_at', cutoff).execute()
            for row in (stale.data or []):
                await db.table('cleanups').update({'status': 'rejected'}).eq('id', row['id']).execute()
                await db.table('reports').update({'status': 'open'}).eq('id', row['report_id']).execute()
        except Exception as e:
            print(f"Expire cleanups error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    task = asyncio.create_task(_expire_stale_cleanups())
    yield
    task.cancel()
    await disconnect()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router,    prefix="/users")
app.include_router(reports.router,  prefix="/reports")
app.include_router(cleanups.router, prefix="/cleanups")
app.include_router(votes.router,    prefix="/votes")
app.include_router(rewards.router,  prefix="/rewards")


@app.get("/health")
async def health():
    return {"ok": True}
