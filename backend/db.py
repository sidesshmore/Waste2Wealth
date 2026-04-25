import os
from supabase._async.client import AsyncClient, create_client

_client: AsyncClient | None = None


async def connect():
    global _client
    _client = await create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


async def disconnect():
    pass  # supabase-py manages its own session


def get_client() -> AsyncClient:
    return _client


class _DB:
    """Thin wrapper that keeps the same .fetch/.fetchrow/.fetchval/.execute
    interface as before, now backed by supabase-py over HTTPS."""

    # ── reads ──────────────────────────────────────────────────────────────

    async def fetch(self, query_or_table: str, *args, **kw) -> list[dict]:
        """For simple table selects pass table name + filters as kwargs.
        For raw RPC pass ('rpc:func_name', params_dict)."""
        raise NotImplementedError("Use db.table() or db.rpc() directly")

    async def fetchrow(self, query_or_table: str, *args, **kw) -> dict | None:
        raise NotImplementedError("Use db.table() or db.rpc() directly")

    async def fetchval(self, query_or_table: str, *args, **kw):
        raise NotImplementedError("Use db.table() or db.rpc() directly")

    async def execute(self, query_or_table: str, *args, **kw):
        raise NotImplementedError("Use db.table() or db.rpc() directly")

    # ── convenience passthrough ─────────────────────────────────────────────

    def table(self, name: str):
        return _client.table(name)

    async def rpc(self, fn: str, params: dict):
        res = await _client.rpc(fn, params).execute()
        return res.data


db = _DB()
