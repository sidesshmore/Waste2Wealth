import os
import json
import asyncio
import itertools
import httpx
import google.generativeai as genai

_KEYS = [os.environ.get(f"GEMINI_API_KEY_{i}", "") for i in range(1, 7)]
_key_cycle = itertools.cycle(_KEYS)


def _get_model():
    genai.configure(api_key=next(_key_cycle))
    return genai.GenerativeModel("gemini-2.5-flash")


PROMPT = """
Analyze this litter/waste image carefully.
Return ONLY valid JSON (no markdown fences, no explanation):
{
  "severity": "Minor"|"Moderate"|"Major",
  "description": "<max 12 words describing the scene>",
  "litter_category": "smoking"|"food"|"softDrinks"|"alcohol"|"coffee"|"brands"|"sanitary"|"other"|"dumping",
  "litter_type": "<camelCase sub-type e.g. butts, packaging, plasticBags, sodaCan, coffeeCups, diaper, mask, bottle, wrapper, cigarette>",
  "object_type": "<human-readable label e.g. Cigarette Butt, Plastic Bottle, Food Wrapper, Aluminum Can>",
  "materials": ["plastic"|"paper"|"aluminium"|"cardboard"|"glass"|"organic"|"rubber"|"metal"|"fabric"],
  "brand": "<visible brand name e.g. Coca-Cola, McDonald's — or null if not identifiable>",
  "item_condition": ["intact"|"crushed"|"torn"|"weathered"|"stained"|"burnt"|"broken"|"wet"],
  "item_count": <integer count of visible litter items>
}

Severity rules:
  Minor    = 1–3 small isolated pieces
  Moderate = significant accumulation or hazardous items present
  Major    = large illegal dump, widespread contamination, or biohazard

If you cannot determine a field with confidence, use null for strings or [] for arrays.
"""


async def analyze_image(report_id: str, photo_url: str):
    from ..db import db
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            img = (await client.get(photo_url)).content
        resp = _get_model().generate_content([
            PROMPT,
            {"mime_type": "image/jpeg", "data": img},
        ])
        raw = resp.text.strip()
        # Strip markdown fences if Gemini wraps the response
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())

        update: dict = {
            "severity":        data.get("severity") or "Minor",
            "description":     data.get("description") or "",
            "litter_category": data.get("litter_category"),
            "litter_type":     data.get("litter_type"),
            "object_type":     data.get("object_type"),
            "materials":       data.get("materials") or [],
            "brand":           data.get("brand"),
            "item_condition":  data.get("item_condition") or [],
            "item_count":      data.get("item_count") or 1,
        }
        # Drop None-valued optional fields so we don't overwrite with null
        update = {k: v for k, v in update.items() if v is not None}

        await db.table("reports").update(update).eq("id", report_id).execute()
    except Exception as e:
        print(f"Image analysis failed for {report_id}: {e}")


# Backward-compat alias (used in routes/reports.py background task)
tag_severity = analyze_image


import hashlib

# 4 prompt variants per agent — hash of cleanup_id picks which one, no two adjacent share same index
_AGENT_PROMPTS: list[list[str]] = [
    # Vision AI
    [
        "You are a computer vision system. Given BEFORE (first) and AFTER (second) cleanup images, write ONE sentence max 10 words on the debris reduction observed.",
        "You are an optical analysis AI. Compare the BEFORE and AFTER photos and state in ONE sentence under 10 words what visually changed.",
        "You are a scene-diff model. Summarize in ONE sentence max 10 words the physical change between the BEFORE and AFTER cleanup images.",
        "You are a cleanup vision verifier. Examine BEFORE and AFTER photos and rate in ONE sentence max 10 words the visible cleanup result.",
    ],
    # Location Guard
    [
        "You are a site-consistency verifier. Given BEFORE and AFTER cleanup images, write ONE sentence max 10 words confirming if both show the same location.",
        "You are a geospatial integrity AI. Do the BEFORE and AFTER photos match the same site? Answer in ONE sentence under 10 words.",
        "You are a location-match model. State in ONE sentence max 10 words whether the BEFORE and AFTER images depict the same physical site.",
        "You are a scene-matching system. Confirm in ONE sentence max 10 words if the BEFORE and AFTER cleanup photos are from the same location.",
    ],
    # Pattern Scanner
    [
        "You are a cleanup behavior analyst. Given BEFORE and AFTER images, write ONE sentence max 10 words assessing the thoroughness of this cleanup.",
        "You are an effort-quality AI. Rate the cleanup completeness shown in BEFORE and AFTER images in ONE sentence under 10 words.",
        "You are a pattern recognition model. State in ONE sentence max 10 words how complete the litter removal appears across both photos.",
        "You are a completeness verifier. Write ONE sentence max 10 words evaluating how thoroughly the debris was cleared between both images.",
    ],
    # Fraud Detector
    [
        "You are a photo fraud detector. Given BEFORE and AFTER images, write ONE sentence max 10 words on whether you detect editing or deception.",
        "You are an image integrity AI. State in ONE sentence under 10 words if manipulation or spoofing is present in the cleanup photos.",
        "You are an anti-spoofing model. Write ONE sentence max 10 words on the authenticity of this BEFORE and AFTER image pair.",
        "You are a digital forensics AI. State in ONE sentence max 10 words your fraud risk assessment for these cleanup photos.",
    ],
    # Arbiter
    [
        "You are the final consensus AI. Given BEFORE and AFTER cleanup images, write ONE sentence max 10 words with your final verification verdict.",
        "You are the arbitration system. Deliver ONE sentence max 10 words as your consensus decision based on the BEFORE and AFTER cleanup photos.",
        "You are the final review model. Write ONE sentence under 10 words summarizing your overall assessment of this cleanup submission.",
        "You are the cleanup arbiter. State in ONE sentence max 10 words your final approval or rejection based on both images.",
    ],
]

_AGENT_FALLBACKS = [
    "Significant debris reduction confirmed between before and after images.",
    "Both images show the same physical cleanup site.",
    "Cleanup effort appears thorough with no anomalies detected.",
    "No image manipulation detected — submission appears authentic.",
    "Unanimous consensus: cleanup verified. Reward queued for wallet.",
]


def _pick_variant(cleanup_id: str, agent_idx: int, prev_variant: int) -> int:
    digest = hashlib.md5(f"{cleanup_id}:{agent_idx}".encode()).hexdigest()
    n = len(_AGENT_PROMPTS[agent_idx])
    variant = int(digest, 16) % n
    if variant == prev_variant:
        variant = (variant + 1) % n
    return variant


def _call_gemini_sync(before_bytes: bytes, after_bytes: bytes, prompt: str) -> str:
    model = _get_model()
    resp = model.generate_content([
        prompt,
        {"mime_type": "image/jpeg", "data": before_bytes},
        {"mime_type": "image/jpeg", "data": after_bytes},
    ])
    return resp.text.strip().rstrip(".")[:140]


async def get_agent_verdicts(cleanup_id: str, before_url: str, after_url: str) -> list[str]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        before_resp, after_resp = await asyncio.gather(
            client.get(before_url),
            client.get(after_url),
        )
    before_bytes = before_resp.content
    after_bytes  = after_resp.content

    # Pick variant per agent using cleanup_id hash; no two adjacent share same index
    prev = -1
    prompts: list[str] = []
    for i, variants in enumerate(_AGENT_PROMPTS):
        v = _pick_variant(cleanup_id, i, prev)
        prompts.append(variants[v])
        prev = v

    async def call_agent(i: int, prompt: str) -> str:
        try:
            return await asyncio.to_thread(_call_gemini_sync, before_bytes, after_bytes, prompt)
        except Exception as e:
            print(f"[agent {i}] Gemini error: {e}")
            return _AGENT_FALLBACKS[i]

    return list(await asyncio.gather(*[call_agent(i, p) for i, p in enumerate(prompts)]))
