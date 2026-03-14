"""
Orchestration: single entry point for the FlexCare pipeline.
Flow: intake → Assessment → Safety → (Recovery if safe, else Referral).
On failure: return generic message, log minimal metadata (no PII).
"""

import asyncio
import logging
from typing import Optional

from backend.schemas.intake import IntakePayload
from backend.schemas.outputs import (
    AssessmentOutput,
    PipelineResult,
    RecoveryOutput,
    ReferralOutput,
    SafetyOutput,
)
from backend.agents.assessment import run_assessment
from backend.agents.recovery import run_recovery
from backend.agents.referral import run_referral
from backend.agents.safety import run_safety

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)


def _build_session_summary(
    assessment: AssessmentOutput,
    safety: SafetyOutput,
    *,
    recovery: Optional[RecoveryOutput] = None,
    referral: Optional[ReferralOutput] = None,
) -> Optional[str]:
    """Brief summary for user/clinician: assessment + outcome."""
    parts = [assessment.symptom_summary, f"Safety: {safety.decision}."]
    if recovery:
        parts.append(f"Recovery: {len(recovery.actions)} actions suggested.")
    if referral:
        parts.append(f"Referral: {referral.provider_type} — {referral.reason}")
    return " ".join(parts)


def _fallback_result() -> PipelineResult:
    """Return a minimal result with error_message set; no PII."""
    return PipelineResult(
        assessment=AssessmentOutput(
            symptom_summary="",
            risk_level="low",
            missing_info=[],
        ),
        safety=SafetyOutput(
            decision="safe_to_continue",
            triggered_red_flags=[],
        ),
        recovery=None,
        referral=None,
        why_this_recommendation=PIPELINE_FALLBACK_MESSAGE,
        session_summary=None,
        error_message=PIPELINE_FALLBACK_MESSAGE,
    )


async def run_flexcare_pipeline(
    intake: IntakePayload,
    free_text: Optional[str] = None,
    user_profile: Optional[str] = None,
) -> PipelineResult:
    """
    Run the full pipeline: Assessment → Safety → Recovery or Referral.
    Uses intake.free_text for agent context if free_text is not provided.
    When user_profile is provided (e.g. from profile store), it is included in context and assessment so agents can acknowledge it.
    On LLM/agent failure returns a result with error_message set; logs minimal metadata only (no PII).
    """
    context = free_text if free_text is not None else intake.free_text or ""
    if user_profile and user_profile.strip():
        context = (context + "\n\nRelevant user history: " + user_profile.strip()).strip()

    try:
        assessment = await run_assessment(intake, user_profile=user_profile)
    except Exception as e:
        logger.warning(
            "FlexCare pipeline failed at assessment",
            extra={"step": "assessment", "error_type": type(e).__name__},
        )
        return _fallback_result()

    try:
        safety = await run_safety(assessment, context)
    except Exception as e:
        logger.warning(
            "FlexCare pipeline failed at safety",
            extra={"step": "safety", "error_type": type(e).__name__},
        )
        return _fallback_result()

    try:
        if safety.decision == "safe_to_continue":
            recovery = await run_recovery(assessment, context)
            why = (
                "No red flags were found. We recommend self-care with the actions below."
                if not safety.triggered_red_flags
                else "Assessment suggests self-care is appropriate. Follow the actions and precautions below."
            )
            session_summary = _build_session_summary(assessment, safety, recovery=recovery)
            return PipelineResult(
                assessment=assessment,
                safety=safety,
                recovery=recovery,
                referral=None,
                why_this_recommendation=why,
                session_summary=session_summary,
            )
        else:
            referral = await run_referral(assessment, safety, context)
            why = referral.reason
            if safety.triggered_red_flags:
                why = f"Based on the following: {', '.join(safety.triggered_red_flags)}. {why}"
            session_summary = _build_session_summary(assessment, safety, referral=referral)
            return PipelineResult(
                assessment=assessment,
                safety=safety,
                recovery=None,
                referral=referral,
                why_this_recommendation=why,
                session_summary=session_summary,
            )
    except Exception as e:
        logger.warning(
            "FlexCare pipeline failed at recovery or referral",
            extra={"step": "recovery_or_referral", "error_type": type(e).__name__},
        )
        return _fallback_result()


async def main() -> None:
    """Example: run full pipeline on sample intake."""
    sample = IntakePayload(
        regions=[
            {"region_id": "lower_back", "level": 4},
            {"region_id": "neck", "level": 2},
        ],
        free_text="Hurt after sitting all day.",
        duration="3 days",
        triggers="sitting",
    )
    result = await run_flexcare_pipeline(sample)
    if result.error_message:
        print("Error:", result.error_message)
        return
    print("Assessment:", result.assessment.symptom_summary)
    print("Safety:", result.safety.decision, result.safety.triggered_red_flags)
    print("Why:", result.why_this_recommendation)
    if result.session_summary:
        print("Session summary:", result.session_summary)
    if result.recovery:
        print("Recovery actions:", result.recovery.actions)
    if result.referral:
        print("Referral:", result.referral.provider_type, result.referral.reason)


if __name__ == "__main__":
    asyncio.run(main())
