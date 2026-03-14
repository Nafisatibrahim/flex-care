"""
Referral providers: load from CSV (backend/data/referral_providers.csv), ranking, and coverage copy.
Expansion: replace with directory API or DB when available.
"""

import csv
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, Field

ReferralProviderType = Literal["physio", "chiro", "massage", "urgent"]


class Provider(BaseModel):
    id: str
    name: str
    clinic: str
    provider_type: ReferralProviderType
    address: str
    postal_code: str
    lat: float
    lon: float
    phone: Optional[str] = None
    languages: list[str] = Field(default_factory=list)
    accepts_direct_bill: bool = False
    availability: Optional[str] = None
    cost_per_visit: Optional[float] = None
    insurers_accepted: list[str] = Field(default_factory=list)
    recommended: bool = Field(default=False, description="Set by ranking; first result is recommended")


# Fallback if CSV is missing (same synthetic data as before).
_FALLBACK_PROVIDERS: list[dict] = [
    {"id": "p1", "name": "Jane Smith", "clinic": "Downtown Physio & Rehab", "provider_type": "physio", "address": "123 Main St", "postal_code": "M5V 1A1", "lat": 43.65, "lon": -79.38, "phone": "416-555-0101", "languages": ["English", "French"], "accepts_direct_bill": True, "availability": "Mon–Fri 8–6", "cost_per_visit": 120.0, "insurers_accepted": ["sunlife", "manulife"]},
    {"id": "p2", "name": "Alex Chen", "clinic": "Motion Health Physiotherapy", "provider_type": "physio", "address": "456 Oak Ave", "postal_code": "M4B 2B2", "lat": 43.72, "lon": -79.35, "phone": "416-555-0102", "languages": ["English", "Mandarin"], "accepts_direct_bill": True, "availability": "Mon–Sat", "cost_per_visit": 110.0, "insurers_accepted": ["manulife"]},
    {"id": "p3", "name": "Sam Williams", "clinic": "Core Recovery Physio", "provider_type": "physio", "address": "789 King St", "postal_code": "M5H 1K1", "lat": 43.64, "lon": -79.39, "phone": "416-555-0103", "languages": ["English"], "accepts_direct_bill": False, "availability": "Weekdays", "cost_per_visit": 100.0, "insurers_accepted": ["sunlife"]},
    {"id": "c1", "name": "Dr. Maria Garcia", "clinic": "Spine & Posture Clinic", "provider_type": "chiro", "address": "100 Queen St", "postal_code": "M5C 1S2", "lat": 43.65, "lon": -79.38, "phone": "416-555-0201", "languages": ["English", "Spanish"], "accepts_direct_bill": True, "availability": "Mon–Fri", "cost_per_visit": 85.0, "insurers_accepted": ["sunlife", "manulife", "greatwest"]},
    {"id": "c2", "name": "Dr. James Lee", "clinic": "Align Chiropractic", "provider_type": "chiro", "address": "200 Bloor St W", "postal_code": "M5S 1T8", "lat": 43.67, "lon": -79.40, "phone": "416-555-0202", "languages": ["English", "Korean"], "accepts_direct_bill": False, "availability": "Mon–Sat", "cost_per_visit": 90.0, "insurers_accepted": ["sunlife"]},
    {"id": "m1", "name": "Sarah Brown", "clinic": "Relax & Restore RMT", "provider_type": "massage", "address": "300 Dundas St", "postal_code": "M5B 2R2", "lat": 43.66, "lon": -79.38, "phone": "416-555-0301", "languages": ["English"], "accepts_direct_bill": True, "availability": "Tue–Sat", "cost_per_visit": 95.0, "insurers_accepted": ["sunlife", "greatwest"]},
    {"id": "m2", "name": "Chris Taylor", "clinic": "Urban Massage Therapy", "provider_type": "massage", "address": "500 Yonge St", "postal_code": "M4Y 2B5", "lat": 43.67, "lon": -79.38, "phone": "416-555-0302", "languages": ["English", "French"], "accepts_direct_bill": True, "availability": "Mon–Fri", "cost_per_visit": 80.0, "insurers_accepted": ["manulife"]},
    {"id": "u1", "name": "City General ER", "clinic": "City General Hospital", "provider_type": "urgent", "address": "1 Hospital Dr", "postal_code": "M5G 1X8", "lat": 43.66, "lon": -79.39, "phone": "416-555-9999", "languages": ["English", "French"], "accepts_direct_bill": True, "availability": "24/7", "cost_per_visit": None, "insurers_accepted": []},
    {"id": "u2", "name": "Walk-in Urgent Care", "clinic": "Central Urgent Care", "provider_type": "urgent", "address": "2 Emergency Way", "postal_code": "M5G 2Y9", "lat": 43.65, "lon": -79.40, "phone": "416-555-8888", "languages": ["English"], "accepts_direct_bill": True, "availability": "7am–11pm", "cost_per_visit": None, "insurers_accepted": []},
]


def _load_providers_csv() -> list[dict]:
    """Load providers from backend/data/referral_providers.csv. Returns fallback list on error."""
    csv_path = Path(__file__).resolve().parent / "data" / "referral_providers.csv"
    if not csv_path.is_file():
        return _FALLBACK_PROVIDERS.copy()
    rows: list[dict] = []
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not row.get("id"):
                    continue
                lang_str = (row.get("languages") or "").strip()
                languages = [s.strip() for s in lang_str.split(",") if s.strip()]
                try:
                    lat = float(row.get("lat", 0))
                    lon = float(row.get("lon", 0))
                except (TypeError, ValueError):
                    continue
                accepts = (row.get("accepts_direct_bill") or "").strip().lower() in ("true", "1", "yes")
                try:
                    cost = float(row.get("cost_per_visit") or 0) if (row.get("cost_per_visit") or "").strip() else None
                except (TypeError, ValueError):
                    cost = None
                ins_str = (row.get("insurers_accepted") or "").strip()
                insurers_accepted = [s.strip().lower() for s in ins_str.split(",") if s.strip()]
                rows.append({
                    "id": row.get("id", "").strip(),
                    "name": row.get("name", "").strip(),
                    "clinic": row.get("clinic", "").strip(),
                    "provider_type": row.get("provider_type", "").strip(),
                    "address": row.get("address", "").strip(),
                    "postal_code": row.get("postal_code", "").strip(),
                    "lat": lat,
                    "lon": lon,
                    "phone": (row.get("phone") or "").strip() or None,
                    "languages": languages,
                    "accepts_direct_bill": accepts,
                    "availability": (row.get("availability") or "").strip() or None,
                    "cost_per_visit": cost,
                    "insurers_accepted": insurers_accepted,
                })
        return rows if rows else _FALLBACK_PROVIDERS.copy()
    except (OSError, csv.Error):
        return _FALLBACK_PROVIDERS.copy()


_PROVIDERS: list[dict] = _load_providers_csv()


def get_provider_by_id(provider_id: str) -> Optional[dict]:
    """Return raw provider dict by id, or None."""
    for p in _PROVIDERS:
        if p.get("id") == provider_id:
            return dict(p)
    return None


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Rough distance in km between two points (for ranking)."""
    import math
    R = 6371  # Earth radius km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_providers(
    provider_type: ReferralProviderType,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> list[Provider]:
    """
    Return providers for the given type, ranked by distance (if lat/lon given),
    then by accepts_direct_bill, then by number of languages. First result is marked recommended.
    """
    filtered = [p for p in _PROVIDERS if p["provider_type"] == provider_type]
    if not filtered:
        return []

    # Build list with optional distance
    with_dist: list[tuple[dict, float]] = []
    for p in filtered:
        d = _haversine_km(p["lat"], p["lon"], lat or p["lat"], lon or p["lon"]) if (lat is not None and lon is not None) else 0.0
        with_dist.append((p, d))

    # Sort: distance ascending, then direct_bill True first, then more languages
    with_dist.sort(key=lambda x: (
        x[1],
        not x[0]["accepts_direct_bill"],
        -len(x[0]["languages"]),
    ))

    out: list[Provider] = []
    for i, (p, _) in enumerate(with_dist):
        out.append(Provider(
            **p,
            recommended=(i == 0),
        ))
    return out


# -----------------------------------------------------------------------------
# Coverage: general copy per discipline + checklist (one source of truth).
# Expansion: insurer/benefits API for plan-specific info.
# -----------------------------------------------------------------------------

COVERAGE_COPY: dict[str, str] = {
    "physio": "Many plans cover a set number of physiotherapy sessions per year; check your plan for \"physiotherapy\" or \"rehabilitation\".",
    "chiro": "Many plans include chiropractic benefits; look for \"chiropractic\" or \"spinal manipulation\" in your benefits summary.",
    "massage": "Massage therapy is often covered under \"paramedical\" or \"massage\" benefits; check your annual limit and per-session cap.",
    "urgent": "Emergency and urgent care visits are typically covered by your provincial/state health plan; bring your health card and any private insurance info.",
}

COVERAGE_CHECKLIST = [
    "Check your plan for {discipline} (e.g. annual limit or number of sessions).",
    "Note your limit (e.g. $500 or 12 sessions per year).",
    "Ask the clinic if they direct bill your insurer.",
]

def get_coverage_for_discipline(provider_type: ReferralProviderType) -> dict:
    """Return copy and checklist for the UI. Use provider_type to fill in {discipline}."""
    label = {"physio": "physiotherapy", "chiro": "chiropractic", "massage": "massage therapy", "urgent": "urgent/emergency care"}.get(provider_type, provider_type)
    copy = COVERAGE_COPY.get(provider_type, COVERAGE_COPY.get("physio", ""))
    checklist = [s.format(discipline=label) for s in COVERAGE_CHECKLIST]
    return {"copy": copy, "checklist": checklist}
