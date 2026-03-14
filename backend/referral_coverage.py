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


# Default cost per visit when provider has no cost_per_visit (e.g. urgent has no estimate).
_DEFAULT_COST_BY_TYPE: dict[str, float] = {
    "physio": 115.0,
    "chiro": 85.0,
    "massage": 90.0,
}


def estimate_cost(
    plan_slug: str,
    provider_type: str,
    provider_id: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """
    Estimate cost for one visit: cost_per_visit, covered_amount, you_pay, annual_limit_dollars, coverage_percent.
    Returns None for urgent or when plan has no benefits for this service.
    """
    if provider_type == "urgent":
        return None
    plan = get_plan_benefits(plan_slug)
    if not plan:
        return None
    benefits = (plan.get("benefits") or {}).get(provider_type)
    if not benefits or not isinstance(benefits, dict):
        return None
    coverage_pct = benefits.get("coverage_percent")
    per_session_cap = benefits.get("per_session_cap_dollars")
    annual_limit = benefits.get("annual_limit_dollars")
    if coverage_pct is None:
        return None

    from backend.referral_providers import get_provider_by_id, get_providers

    cost: Optional[float] = None
    if provider_id:
        provider = get_provider_by_id(provider_id)
        if provider:
            cost = provider.get("cost_per_visit")
    if cost is None or cost <= 0:
        providers = get_providers(provider_type)  # type: ignore[arg-type]
        if providers:
            cost = getattr(providers[0], "cost_per_visit", None)
        if cost is None or cost <= 0:
            cost = _DEFAULT_COST_BY_TYPE.get(provider_type)

    if cost is None or cost <= 0:
        return None

    per_cap = per_session_cap if per_session_cap is not None else float("inf")
    covered = min(cost * (coverage_pct / 100.0), per_cap)
    you_pay = max(0.0, cost - covered)

    return {
        "cost_per_visit": round(cost, 2),
        "covered_amount": round(covered, 2),
        "you_pay": round(you_pay, 2),
        "annual_limit_dollars": annual_limit,
        "coverage_percent": coverage_pct,
    }
