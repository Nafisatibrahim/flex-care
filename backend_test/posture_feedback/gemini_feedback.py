"""
Call Gemini with exercise name + pose keypoints to get form corrections
and safety tips. Standalone (no railtracks) using google-generativeai.
"""

import os
import json

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import google.generativeai as genai
except ImportError:
    genai = None

from .schemas import ExerciseFeedbackRequest, ExerciseFeedbackResponse, Keypoint


def _keypoints_to_text(keypoints: list[Keypoint], max_points: int = 20) -> str:
    """Summarize keypoints for the prompt (main body points)."""
    # Prefer shoulders, hips, knees, elbows, ankles for posture
    prefer = ["LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_HIP", "RIGHT_HIP", "LEFT_KNEE", "RIGHT_KNEE",
              "LEFT_ELBOW", "RIGHT_ELBOW", "LEFT_ANKLE", "RIGHT_ANKLE", "NOSE", "LEFT_WRIST", "RIGHT_WRIST"]
    prefer_idx = {n: i for i, n in enumerate(prefer)}
    ordered = [(prefer_idx.get(k.name, 99), k) for k in keypoints]
    ordered.sort(key=lambda t: t[0])
    selected = [k for _, k in ordered][:max_points]
    lines = [f"  {k.name}: x={k.x:.3f}, y={k.y:.3f}" + (f", z={k.z:.3f}" if k.z is not None else "") for k in selected]
    return "\n".join(lines)


def get_exercise_feedback(request: ExerciseFeedbackRequest) -> ExerciseFeedbackResponse:
    """
    Send exercise_id + keypoints to Gemini; return corrections and safety_tips.
    Uses GEMINI_API_KEY from env. Sync; run via asyncio.to_thread in API if needed.
    """
    if genai is None:
        raise RuntimeError("google-generativeai is required. pip install google-generativeai")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    exercise_label = request.exercise_name or request.exercise_id.replace("_", " ").title()
    keypoints_text = _keypoints_to_text(request.keypoints)

    prompt = f"""You are a physiotherapy assistant for FlexCare. The user is doing the exercise: "{exercise_label}".

Given the following pose keypoints (normalized 0-1, from a single frame), provide:
1. One or two short form corrections (e.g. "Keep your back straighter", "Lower your shoulders") if something looks off. If the pose looks reasonable for this exercise, say "Form looks good" or one gentle tip.
2. One or two brief safety tips to avoid further injury (e.g. "Avoid rounding your lower back", "Stop if you feel sharp pain").

Pose keypoints:
{keypoints_text}

Respond in JSON only, with this exact structure (no markdown, no code block):
{{"corrections": ["...", "..."], "safety_tips": ["...", "..."]}}
"""

    response = model.generate_content(prompt)
    text = (response.text if hasattr(response, "text") else str(response) or "").strip()
    # Strip markdown code block if present
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
    text = text.strip()

    try:
        data = json.loads(text)
        return ExerciseFeedbackResponse(
            corrections=data.get("corrections", []) or [],
            safety_tips=data.get("safety_tips", []) or [],
        )
    except json.JSONDecodeError:
        return ExerciseFeedbackResponse(
            corrections=[text[:200] if text else "Could not parse form feedback."],
            safety_tips=["If you feel pain, stop and consult a professional."],
        )
