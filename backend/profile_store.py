"""
In-memory user profile store keyed by session_id. No auth yet; replace with DB when adding auth.
"""

from typing import Optional

from backend.schemas.profile import UserProfile

_profiles: dict[str, UserProfile] = {}


def get(session_id: str) -> Optional[UserProfile]:
    """Return stored profile for session_id, or None."""
    return _profiles.get(session_id)


def set_profile(session_id: str, profile: UserProfile) -> None:
    """Store profile for session_id."""
    _profiles[session_id] = profile


def build_profile_summary(profile: UserProfile) -> str:
    """Turn profile into a short string for agent context. Empty if nothing set."""
    parts = []
    if profile.medical_history and profile.medical_history.strip():
        parts.append(profile.medical_history.strip())
    if profile.previous_surgeries:
        parts.append("Previous surgeries: " + "; ".join(profile.previous_surgeries))
    if profile.prior_injuries:
        parts.append("Prior injuries: " + "; ".join(profile.prior_injuries))
    if profile.chronic_conditions:
        parts.append("Chronic conditions: " + "; ".join(profile.chronic_conditions))
    if profile.other_relevant and profile.other_relevant.strip():
        parts.append("Other relevant: " + profile.other_relevant.strip())
    return ". ".join(parts) if parts else ""
