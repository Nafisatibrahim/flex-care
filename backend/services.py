"""
Symptom → recommended service mapping. Loads from backend/data/services.csv.
Optional context for the Referral Agent (symptom → physio/chiro/massage).
"""

import csv
from pathlib import Path

_DATA_PATH = Path(__file__).resolve().parent / "data" / "services.csv"
_SERVICES: list[dict[str, str]] = []
_LOADED = False


def _load() -> None:
    global _SERVICES, _LOADED
    if _LOADED:
        return
    _LOADED = True
    if not _DATA_PATH.is_file():
        return
    try:
        with open(_DATA_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                symptom = (row.get("symptom") or "").strip()
                service = (row.get("recommended_service") or "").strip()
                if symptom and service:
                    _SERVICES.append({"symptom": symptom, "recommended_service": service})
    except (OSError, csv.Error):
        pass


def get_symptom_service_mapping() -> list[dict[str, str]]:
    """Return list of { symptom, recommended_service } for use as context (e.g. Referral Agent)."""
    _load()
    return list(_SERVICES)
