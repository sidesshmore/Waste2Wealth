#!/usr/bin/env python3
"""
Seed 50 real trash photos into Supabase.

Steps:
  1. Download dataset from Kaggle (or use --images-dir for a local folder)
  2. Upload each image to Cloudinary
  3. Analyse each with Gemini 2.5 Flash
  4. Write supabase/seed.sql  ← paste this into the Supabase SQL editor

Usage:
  python3 seed_reports.py --kaggle-user <username> --kaggle-key <api_key>
  python3 seed_reports.py --images-dir /path/to/images

Get your Kaggle API key:
  https://www.kaggle.com/settings/account  →  API  →  Create New Token
"""

import argparse, io, json, os, random, re, sys, time, zipfile
from pathlib import Path
from itertools import cycle

import requests
import cloudinary, cloudinary.uploader
import google.generativeai as genai

# ── Credentials (from backend/.env) ──────────────────────────────────────────
CLOUD_NAME   = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUD_KEY    = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUD_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
FOLDER       = "waste2wealth/reports/seed"

GEMINI_KEYS = [os.environ.get(f"GEMINI_API_KEY_{i}", "") for i in range(1, 7)]
_key_cycle = cycle(GEMINI_KEYS)

# ── 50 USA-wide trash-report locations ────────────────────────────────────────
USA_COORDS = [
    # New York City
    (40.7580, -73.9855, "Times Square, New York, NY"),
    (40.7282, -73.7949, "Jamaica Ave, Queens, New York, NY"),
    (40.6892, -73.9442, "Flatbush Ave, Brooklyn, New York, NY"),
    (40.8448, -73.8648, "Fordham Rd, Bronx, New York, NY"),
    (40.7614, -73.9776, "Hell's Kitchen, Manhattan, New York, NY"),
    # Chicago
    (41.8781, -87.6298, "State St, Chicago, IL"),
    (41.8525, -87.6441, "Chinatown, Chicago, IL"),
    (41.9032, -87.6312, "Lincoln Park, Chicago, IL"),
    (41.8360, -87.6270, "Bronzeville, Chicago, IL"),
    (41.9742, -87.6637, "Rogers Park, Chicago, IL"),
    # Houston
    (29.7604, -95.3698, "Downtown Houston, TX"),
    (29.7369, -95.4145, "Midtown Houston, TX"),
    (29.6997, -95.3690, "South Houston, TX"),
    (29.7827, -95.3873, "Heights Blvd, Houston, TX"),
    # Philadelphia
    (39.9526, -75.1652, "Market St, Philadelphia, PA"),
    (39.9279, -75.1638, "South Philly, Philadelphia, PA"),
    (40.0018, -75.1180, "Germantown Ave, Philadelphia, PA"),
    # Phoenix
    (33.4484, -112.0740, "Central Ave, Phoenix, AZ"),
    (33.4152, -112.0829, "South Mountain area, Phoenix, AZ"),
    (33.5722, -112.0901, "Metrocenter, Phoenix, AZ"),
    # San Francisco
    (37.7749, -122.4194, "Market St, San Francisco, CA"),
    (37.7879, -122.4074, "Tenderloin, San Francisco, CA"),
    (37.7272, -122.4769, "Daly City border, San Francisco, CA"),
    # Seattle
    (47.6062, -122.3321, "Pioneer Square, Seattle, WA"),
    (47.6553, -122.3035, "Capitol Hill, Seattle, WA"),
    (47.5480, -122.3847, "White Center, Seattle, WA"),
    # Miami
    (25.7617, -80.1918, "Downtown Miami, FL"),
    (25.8103, -80.1860, "Little Haiti, Miami, FL"),
    (25.7743, -80.2102, "Wynwood, Miami, FL"),
    # Atlanta
    (33.7490, -84.3880, "Downtown Atlanta, GA"),
    (33.7550, -84.4231, "West End, Atlanta, GA"),
    (33.8092, -84.3678, "Buckhead, Atlanta, GA"),
    # Dallas
    (32.7767, -96.7970, "Deep Ellum, Dallas, TX"),
    (32.7541, -96.8642, "Oak Cliff, Dallas, TX"),
    (32.8205, -96.8710, "Northwest Dallas, TX"),
    # Denver
    (39.7392, -104.9903, "16th Street Mall, Denver, CO"),
    (39.7143, -104.9890, "Baker neighborhood, Denver, CO"),
    (39.7508, -104.9931, "Five Points, Denver, CO"),
    # Boston
    (42.3601, -71.0589, "Downtown Boston, MA"),
    (42.3188, -71.0846, "Roxbury, Boston, MA"),
    (42.3736, -71.0494, "East Boston, MA"),
    # Las Vegas
    (36.1699, -115.1398, "Fremont St, Las Vegas, NV"),
    (36.1147, -115.1728, "Spring Valley, Las Vegas, NV"),
    # Portland
    (45.5231, -122.6765, "Old Town, Portland, OR"),
    (45.5481, -122.6580, "Lloyd District, Portland, OR"),
    # Nashville
    (36.1627, -86.7816, "Broadway, Nashville, TN"),
    (36.1778, -86.8080, "North Nashville, TN"),
    # Baltimore
    (39.2904, -76.6122, "Inner Harbor area, Baltimore, MD"),
    (39.3119, -76.6310, "West Baltimore, MD"),
]

KAGGLE_DATASET = "pooriamst/raw-images-alltrash"

# ── 50 realistic LA trash-report locations ────────────────────────────────────
LA_COORDS = [
    # UCLA campus
    (34.0712, -118.4437, "Bruin Walk, UCLA, Los Angeles"),
    (34.0728, -118.4417, "Royce Hall, UCLA, Los Angeles"),
    (34.0718, -118.4412, "Powell Library, UCLA, Los Angeles"),
    (34.0703, -118.4443, "Ackerman Union, UCLA, Los Angeles"),
    (34.0696, -118.4395, "Engineering IV, UCLA, Los Angeles"),
    # Santa Monica
    (34.0195, -118.4912, "3rd Street Promenade, Santa Monica, CA"),
    (34.0215, -118.4870, "Main St & Pico Blvd, Santa Monica, CA"),
    (34.0175, -118.4950, "Ocean Ave, Santa Monica, CA"),
    (34.0230, -118.4830, "Santa Monica Pier area, CA"),
    (34.0160, -118.4980, "Ocean Park Blvd, Santa Monica, CA"),
    # Venice Beach
    (33.9850, -118.4694, "Venice Boardwalk, Venice, CA"),
    (33.9870, -118.4680, "Abbot Kinney Blvd, Venice, CA"),
    (33.9830, -118.4710, "Venice Beach Parking Lot, CA"),
    (33.9890, -118.4660, "Rose Ave, Venice, CA"),
    (33.9810, -118.4720, "Washington Blvd & Speedway, Venice, CA"),
    # West Hollywood
    (34.0900, -118.3617, "Santa Monica Blvd, West Hollywood, CA"),
    (34.0920, -118.3560, "Sunset Strip, West Hollywood, CA"),
    (34.0880, -118.3640, "Melrose Ave, West Hollywood, CA"),
    (34.0860, -118.3590, "La Cienega Blvd, West Hollywood, CA"),
    (34.0910, -118.3500, "Fairfax Ave & Sunset, West Hollywood, CA"),
    # Beverly Hills
    (34.0736, -118.4004, "Rodeo Dr, Beverly Hills, CA"),
    (34.0750, -118.3970, "Wilshire Blvd, Beverly Hills, CA"),
    (34.0720, -118.4030, "Santa Monica Blvd, Beverly Hills, CA"),
    (34.0760, -118.3940, "Beverly Dr, Beverly Hills, CA"),
    (34.0700, -118.3980, "Burton Way, Beverly Hills, CA"),
    # Hollywood
    (34.0928, -118.3287, "Hollywood Blvd & Highland, Hollywood, CA"),
    (34.0950, -118.3220, "Sunset Blvd & Vine, Hollywood, CA"),
    (34.0910, -118.3340, "Hollywood Walk of Fame, CA"),
    (34.0940, -118.3180, "Cahuenga Blvd, Hollywood, CA"),
    (34.0900, -118.3300, "Fountain Ave, Hollywood, CA"),
    # Culver City
    (34.0211, -118.3965, "Culver Blvd, Culver City, CA"),
    (34.0230, -118.3940, "Washington Blvd, Culver City, CA"),
    (34.0195, -118.3985, "Overland Ave, Culver City, CA"),
    (34.0240, -118.3910, "Venice Blvd & Sepulveda, Culver City, CA"),
    (34.0180, -118.3990, "Jefferson Blvd, Culver City, CA"),
    # Silver Lake
    (34.0870, -118.2717, "Sunset Blvd, Silver Lake, CA"),
    (34.0890, -118.2690, "Silver Lake Blvd, Silver Lake, CA"),
    (34.0850, -118.2750, "Rowena Ave, Silver Lake, CA"),
    (34.0880, -118.2660, "Hyperion Ave, Silver Lake, CA"),
    (34.0840, -118.2780, "Glendale Blvd, Silver Lake, CA"),
    # Echo Park
    (34.0778, -118.2607, "Sunset Blvd, Echo Park, CA"),
    (34.0800, -118.2580, "Alvarado St, Echo Park, CA"),
    (34.0760, -118.2630, "Echo Park Ave, CA"),
    (34.0820, -118.2560, "Glendale Blvd & Temple, Echo Park, CA"),
    (34.0740, -118.2650, "Park Ave, Echo Park, CA"),
    # Downtown LA
    (34.0522, -118.2437, "Spring St, Downtown Los Angeles, CA"),
    (34.0540, -118.2410, "Broadway, Downtown Los Angeles, CA"),
    (34.0500, -118.2460, "Main St, Downtown Los Angeles, CA"),
    (34.0560, -118.2390, "7th St, Downtown Los Angeles, CA"),
    (34.0480, -118.2480, "Skid Row area, Downtown Los Angeles, CA"),
]

GEMINI_PROMPT = """\
Analyze this garbage/waste image and return ONLY valid JSON, no markdown, no extra text:
{
  "severity": "Minor" or "Moderate" or "Major",
  "description": "one sentence max 12 words describing what you see",
  "object_type": "specific object e.g. Plastic bottle, Cigarette butts, Trash pile",
  "litter_category": one of: smoking, food, softDrinks, alcohol, coffee, brands, sanitary, other, dumping
}

Severity guide:
  Minor    = 1-3 isolated pieces of litter
  Moderate = significant pile, multiple items, or hazardous material
  Major    = large illegal dump or widespread contamination across an area
"""


# ── Kaggle download ───────────────────────────────────────────────────────────
def download_kaggle(username: str, api_key: str, dest: Path, limit: int) -> list[Path]:
    print("⬇️  Downloading from Kaggle...")
    url = f"https://www.kaggle.com/api/v1/datasets/download/{KAGGLE_DATASET}"
    r = requests.get(url, auth=(username, api_key), stream=True, timeout=300)
    if r.status_code != 200:
        raise RuntimeError(f"Kaggle API returned {r.status_code}: {r.text[:300]}")

    buf = io.BytesIO()
    mb = 0
    for chunk in r.iter_content(1024 * 64):
        buf.write(chunk)
        mb += len(chunk) / 1_048_576
        print(f"\r   {mb:.1f} MB...", end="", flush=True)
    print()

    dest.mkdir(parents=True, exist_ok=True)
    print("📦 Extracting images...")
    with zipfile.ZipFile(buf) as zf:
        names = [n for n in zf.namelist() if n.lower().endswith((".jpg", ".jpeg", ".png"))]
        random.shuffle(names)
        selected = names[:limit]
        paths = []
        for name in selected:
            out = dest / Path(name).name
            out.write_bytes(zf.read(name))
            paths.append(out)
    print(f"   Saved {len(paths)} images → {dest}")
    return paths


# ── Cloudinary upload ─────────────────────────────────────────────────────────
def upload(img: Path) -> dict:
    cloudinary.config(cloud_name=CLOUD_NAME, api_key=CLOUD_KEY, api_secret=CLOUD_SECRET)
    res = cloudinary.uploader.upload(
        str(img),
        folder=FOLDER,
        resource_type="image",
        transformation=[{"quality": "auto", "fetch_format": "auto"}],
    )
    return {"secure_url": res["secure_url"], "public_id": res["public_id"]}


# ── Gemini analysis ───────────────────────────────────────────────────────────
def analyse(img: Path) -> dict:
    defaults = {
        "severity": "Minor",
        "description": "Litter found on the ground.",
        "object_type": "Litter",
        "litter_category": "other",
    }
    for attempt in range(4):
        try:
            genai.configure(api_key=next(_key_cycle))
            model = genai.GenerativeModel("gemini-2.5-flash")
            data = img.read_bytes()
            resp = model.generate_content([
                GEMINI_PROMPT,
                {"mime_type": "image/jpeg", "data": data},
            ])
            text = resp.text.strip()
            m = re.search(r'\{.*?\}', text, re.DOTALL)
            if m:
                parsed = json.loads(m.group())
                # Validate/normalise fields
                parsed["severity"] = parsed.get("severity", "Minor").capitalize()
                if parsed["severity"] not in ("Minor", "Moderate", "Major"):
                    parsed["severity"] = "Minor"
                cat = parsed.get("litter_category", "other").lower()
                valid_cats = {"smoking","food","softDrinks","alcohol","coffee","brands","sanitary","other","dumping"}
                parsed["litter_category"] = cat if cat in valid_cats else "other"
                return parsed
        except Exception as e:
            wait = 2 ** attempt
            print(f"   Gemini attempt {attempt+1} failed ({e}), retry in {wait}s...")
            time.sleep(wait)
    return defaults


# ── SQL builder ───────────────────────────────────────────────────────────────
def q(v) -> str:
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def build_sql(reports: list[dict]) -> str:
    parts = [
        "-- Waste2Wealth — 50 seed reports with real trash photos",
        "-- Generated by scripts/seed_reports.py",
        "-- Paste into: Supabase Dashboard → SQL Editor → New Query",
        "",
        "-- Add columns if not already present",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS lat             NUMERIC;",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS lng             NUMERIC;",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS address         TEXT;",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS litter_category TEXT;",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS object_type     TEXT;",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS item_count      INTEGER;",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS brand           TEXT;",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS materials       TEXT[];",
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS item_condition  TEXT[];",
        "",
        "INSERT INTO reports",
        "  (user_id, location, lat, lng,",
        "   photo_url, photo_public_id,",
        "   severity, status,",
        "   litter_category, object_type, description, address)",
        "VALUES",
    ]

    rows = []
    for r in reports:
        lat, lng = r["lat"], r["lng"]
        row = (
            f"  (NULL,"
            f" ST_SetSRID(ST_MakePoint({lng}, {lat}), 4326)::geography,"
            f" {lat}, {lng},"
            f" {q(r['photo_url'])}, {q(r['public_id'])},"
            f" {q(r['severity'])}, 'open',"
            f" {q(r['litter_category'])}, {q(r['object_type'])},"
            f" {q(r['description'])}, {q(r.get('address'))})"
        )
        rows.append(row)

    parts.append(",\n".join(rows) + ";")
    parts.append("")
    parts.append(f"-- {len(reports)} rows inserted")
    return "\n".join(parts)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--kaggle-user",  help="Kaggle username")
    ap.add_argument("--kaggle-key",   help="Kaggle API key")
    ap.add_argument("--images-dir",   help="Skip download — use images from this local directory")
    ap.add_argument("--limit", type=int, default=50, help="How many images to process (default 50)")
    ap.add_argument("--region", choices=["la", "usa"], default="la", help="Coordinate set to use (default: la)")
    ap.add_argument("--output", help="Output SQL filename (default: seed.sql or seed_usa.sql)")
    args = ap.parse_args()

    scripts_dir = Path(__file__).parent
    project_dir = scripts_dir.parent
    default_out = "seed_usa.sql" if args.region == "usa" else "seed.sql"
    out_sql     = project_dir / "supabase" / (args.output or default_out)
    tmp_dir     = scripts_dir / "tmp_images"

    # 1. Gather images
    if args.images_dir:
        exts = {".jpg", ".jpeg", ".png"}
        imgs = [p for p in Path(args.images_dir).iterdir() if p.suffix.lower() in exts]
        imgs = imgs[:args.limit]
        print(f"📁 Using {len(imgs)} images from {args.images_dir}")
    elif args.kaggle_user and args.kaggle_key:
        imgs = download_kaggle(args.kaggle_user, args.kaggle_key, tmp_dir, args.limit)
    else:
        print("❌  Provide either --kaggle-user + --kaggle-key, or --images-dir")
        print()
        print("    To get your Kaggle API key:")
        print("    1. Go to https://www.kaggle.com/settings/account")
        print("    2. Scroll to 'API' section → 'Create New Token'")
        print("    3. This downloads kaggle.json — your username and key are inside")
        print()
        print("    Then run:")
        print("    python3 scripts/seed_reports.py --kaggle-user YOUR_USER --kaggle-key YOUR_KEY")
        sys.exit(1)

    if not imgs:
        print("❌  No images found"); sys.exit(1)

    coord_pool = USA_COORDS if args.region == "usa" else LA_COORDS
    coords = coord_pool * 2  # allow repeating if limit > 50

    # 2. Process
    reports = []
    print(f"\n🚀 Processing {len(imgs)} images...\n")
    for i, img in enumerate(imgs):
        lat, lng, address = coords[i % len(LA_COORDS)]
        print(f"[{i+1:02d}/{len(imgs)}] {img.name}")

        # Upload
        print("   ☁️  Cloudinary...", end=" ", flush=True)
        try:
            cloud = upload(img)
            print(f"✅ {cloud['public_id'].split('/')[-1]}")
        except Exception as e:
            print(f"❌ {e}")
            continue

        # Analyse
        print("   🤖 Gemini...", end=" ", flush=True)
        a = analyse(img)
        print(f"✅ {a['severity']} · {a['object_type']}")
        print(f"      \"{a['description']}\"")

        reports.append({
            "lat":             lat,
            "lng":             lng,
            "address":         address,
            "photo_url":       cloud["secure_url"],
            "public_id":       cloud["public_id"],
            "severity":        a["severity"],
            "litter_category": a["litter_category"],
            "object_type":     a["object_type"],
            "description":     a["description"],
        })

    if not reports:
        print("\n❌  No reports generated (all uploads or analyses failed)"); sys.exit(1)

    # 3. Write SQL
    sql = build_sql(reports)
    out_sql.parent.mkdir(exist_ok=True)
    out_sql.write_text(sql)

    print(f"\n{'─'*60}")
    print(f"✅  Done — {len(reports)} reports processed")
    print(f"📄  SQL → {out_sql}")
    print()
    print("Next step:")
    print("  1. Open https://supabase.com/dashboard/project/esvpakhmyzjlzxzmnnyy/sql/new")
    print(f"  2. Paste the contents of {out_sql.name}")
    print("  3. Click Run")
    print()
    print("Pins will appear on the map immediately (Realtime is live).")


if __name__ == "__main__":
    main()
