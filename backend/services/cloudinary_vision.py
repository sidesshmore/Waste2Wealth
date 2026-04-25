import os
import httpx

CLOUD  = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
KEY    = os.environ.get("CLOUDINARY_API_KEY", "")
SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")

REPORT_PROMPTS = [
    "Is there visible garbage or litter in this image? Answer yes or no.",
    "Does this image appear to be AI-generated or computer-rendered? Answer yes or no.",
]

CLEANUP_COMPARE_PROMPT = (
    "Compared to the first image, has the visible garbage been removed in the "
    "second image? Answer yes or no."
)


async def moderate_image(public_id: str, prompts: list[str]) -> dict:
    url = f"https://api.cloudinary.com/v2/analysis/{CLOUD}/analyze/ai_vision_moderation"
    body = {
        "source":              {"uri": f"cloudinary://{public_id}"},
        "rejection_questions": prompts,
    }
    async with httpx.AsyncClient(auth=(KEY, SECRET), timeout=30.0) as client:
        r = await client.post(url, json=body)
    r.raise_for_status()
    return r.json()


async def describe_image(public_id: str, prompt: str) -> dict:
    url = f"https://api.cloudinary.com/v2/analysis/{CLOUD}/analyze/ai_vision_general"
    body = {
        "source":  {"uri": f"cloudinary://{public_id}"},
        "prompts": [prompt],
    }
    async with httpx.AsyncClient(auth=(KEY, SECRET), timeout=30.0) as client:
        r = await client.post(url, json=body)
    r.raise_for_status()
    return r.json()


async def compare_before_after(before_id: str, after_id: str) -> dict:
    url = f"https://api.cloudinary.com/v2/analysis/{CLOUD}/analyze/ai_vision_moderation"
    body = {
        "source":              {"uri": f"cloudinary://{before_id}"},
        "source2":             {"uri": f"cloudinary://{after_id}"},
        "rejection_questions": [CLEANUP_COMPARE_PROMPT],
    }
    async with httpx.AsyncClient(auth=(KEY, SECRET), timeout=45.0) as client:
        r = await client.post(url, json=body)
    r.raise_for_status()
    return r.json()
