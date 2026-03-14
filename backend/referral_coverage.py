"""
Insurer and plan data for coverage comparison. Loads from backend/data/insurer_plans.json.
Used by the explain endpoint and by the UI for insurer/plan selection.
"""

from pathlib import Path
from typing import Any, Optional

_DATA_PATH = Path(__file__).resolve().parent / "data" / "insurer_plans.json"

_INSURERS: list[dict] = []
_PLANS: list[dict] = []
_LOADED = False


def _load() -> None:
    global _INSURERS, _PLANS, _LOADED
    if _LOADED:
        return
    _LOADED = True
    if not _DATA_PATH.is_file():
        return
    try:
        import json
        with open(_DATA_PATH, encoding="utf-8") as f:
            data = json.load(f)
        _INSURERS[:] = data.get("insurers") or []
        _PLANS[:] = data.get("plans") or []
    except (OSError, json.JSONDecodeError):
        pass


def get_insurers() -> list[dict[str, str]]:
    """Return list of { slug, name } for all insurers."""
    _load()
    return [{"slug": i["slug"], "name": i["name"]} for i in _INSURERS]


def get_plans(insurer_slug: Optional[str] = None) -> list[dict[str, Any]]:
    """Return list of plans. If insurer_slug is set, filter to that insurer."""
    _load()
    if not insurer_slug:
        return [{"slug": p["slug"], "name": p["name"], "insurer_slug": p["insurer_slug"]} for p in _PLANS]
    return [
        {"slug": p["slug"], "name": p["name"], "insurer_slug": p["insurer_slug"]}
        for p in _PLANS
        if p.get("insurer_slug") == insurer_slug
    ]


def get_plan_benefits(plan_slug: str) -> Optional[dict[str, Any]]:
    """Return full plan (name, insurer_slug, benefits) or None if not found."""
    _load()
    for p in _PLANS:
        if p.get("slug") == plan_slug:
            return dict(p)
    return None
