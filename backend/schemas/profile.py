# User profile schema (medical history, etc.). Stored in memory by session_id until auth is added.

from typing import Optional

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    """User-provided health profile; influences assessment and recommendations."""
    medical_history: Optional[str] = Field(
        default=None,
        description="Free-text relevant history (e.g. previous surgeries, injuries)",
    )
    previous_surgeries: list[str] = Field(
        default_factory=list,
        description="E.g. ['Knee (ACL repair, 2022)']",
    )
    prior_injuries: list[str] = Field(
        default_factory=list,
        description="E.g. ['Lower back strain 2020']",
    )
    chronic_conditions: list[str] = Field(
        default_factory=list,
        description="E.g. ['Asthma']",
    )
    other_relevant: Optional[str] = Field(
        default=None,
        description="Medications, lifestyle, or other context",
    )
