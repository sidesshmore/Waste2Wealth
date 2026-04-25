import os
import json
import itertools
import httpx
import google.generativeai as genai

_KEYS = [os.environ.get(f"GEMINI_API_KEY_{i}", "") for i in range(1, 7)]
_key_cycle = itertools.cycle(_KEYS)


def _get_model():
    genai.configure(api_key=next(_key_cycle))
    return genai.GenerativeModel("gemini-2.5-flash")


PROMPT = """
Look at this garbage/waste image.
Return ONLY valid JSON, no markdown, no explanation:
{"severity": "Minor"|"Moderate"|"Major", "description": "max 12 words"}

Minor    = small litter, isolated trash
Moderate = significant pile or hazardous items
Major    = large illegal dump or widespread contamination
"""


async def tag_severity(report_id: str, photo_url: str):
    from ..db import db
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            img = (await client.get(photo_url)).content
        resp = _get_model().generate_content([
            PROMPT,
            {"mime_type": "image/jpeg", "data": img},
        ])
        text = resp.text.strip().strip("`").replace("json\n", "")
        data = json.loads(text)
        await db.table('reports').update({
            'severity':    data['severity'],
            'description': data['description'],
        }).eq('id', report_id).execute()
    except Exception as e:
        print(f"Gemma severity tagging failed for {report_id}: {e}")
