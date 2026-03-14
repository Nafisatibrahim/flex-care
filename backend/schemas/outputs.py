# Pipeline output schemas: assessment, safety, recovery, referral.

from typing import Literal, Optional

from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Assessment
# -----------------------------------------------------------------------------

RiskLevel = Literal["low", "medium", "high"]

class AssessmentOutput(BaseModel):
    symptom_summary: str
    risk_level: RiskLevel
    missing_info: list[str] = Field(default_factory=list)

# -----------------------------------------------------------------------------
# Safety
# -----------------------------------------------------------------------------

SafetyDecision = Literal["safe_to_continue", "professional_soon", "urgent_care"]

class SafetyOutput(BaseModel):
    decision: SafetyDecision
    triggered_red_flags: list[str] = Field(
        default_factory=list,
        description="Red flags that were detected, if any",
    )

# -----------------------------------------------------------------------------
# Recovery
# -----------------------------------------------------------------------------

class RecoveryOutput(BaseModel):
    actions: list[str] = Field(
        description="Short list of recommended actions, e.g. stretches, posture tips, breaks",
    )
    precautions: list[str] = Field(
        default_factory=list,
        description="What to avoid or be careful about",
    )
    source: Optional[str] = None

# -----------------------------------------------------------------------------
# Referral
# -----------------------------------------------------------------------------

ReferralProviderType = Literal["physio", "chiro", "massage", "urgent", "none"]

class ReferralOutput(BaseModel):
    provider_type: ReferralProviderType
    reason: str
    timing: Optional[str] = None


# -----------------------------------------------------------------------------
# Pipeline (orchestration result)
# -----------------------------------------------------------------------------

# Generic message shown to user when the pipeline fails (no PII in logs).
PIPELINE_FALLBACK_MESSAGE = (
    "Something went wrong. Please try again or speak to a healthcare professional."
)


class PipelineResult(BaseModel):
    """Result of run_flexcare_pipeline. When error_message is set, show it to the user and do not use other fields for display."""
    assessment: AssessmentOutput
    safety: SafetyOutput
    recovery: Optional[RecoveryOutput] = None
    referral: Optional[ReferralOutput] = None
    why_this_recommendation: str = Field(
        description="Short explanation for the UI: why we showed recovery vs referral",
    )
    session_summary: Optional[str] = Field(
        default=None,
        description="Optional brief summary for user or clinician",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="When set, pipeline failed; show this to the user instead of normal content. No PII in logs.",
    )
