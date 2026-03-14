# Request-side schemas: body regions, pain scale, intake payload.

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field

# Body regions (back + front + limbs)
class BodyRegionId(str, Enum):
    NECK = "neck"
    UPPER_BACK = "upper_back"
    MID_BACK = "mid_back"
    LOWER_BACK = "lower_back"
    LEFT_SHOULDER = "left_shoulder"
    RIGHT_SHOULDER = "right_shoulder"
    TAILBONE = "tailbone"
    # Limbs (own IDs)
    LEFT_FOREARM = "left_forearm"
    RIGHT_FOREARM = "right_forearm"
    LEFT_HAND = "left_hand"
    RIGHT_HAND = "right_hand"
    LEFT_CALF = "left_calf"
    RIGHT_CALF = "right_calf"
    LEFT_ANKLE = "left_ankle"
    RIGHT_ANKLE = "right_ankle"
    LEFT_FOOT = "left_foot"
    RIGHT_FOOT = "right_foot"
    # Front view
    CHEST = "chest"
    ABS = "abs"

BodyRegionIdLiteral = Literal[
    "neck", "upper_back", "mid_back", "lower_back",
    "left_shoulder", "right_shoulder", "tailbone",
    "left_forearm", "right_forearm", "left_hand", "right_hand",
    "left_calf", "right_calf", "left_ankle", "right_ankle",
    "left_foot", "right_foot",
    "chest", "abs",
]

BODY_REGIONS = [
    {"id": "neck", "label": "Neck", "view": "both"},
    {"id": "upper_back", "label": "Upper back", "view": "back"},
    {"id": "mid_back", "label": "Mid back", "view": "back"},
    {"id": "lower_back", "label": "Lower back", "view": "back"},
    {"id": "left_shoulder", "label": "Left shoulder", "view": "both"},
    {"id": "right_shoulder", "label": "Right shoulder", "view": "both"},
    {"id": "tailbone", "label": "Tailbone", "view": "back"},
    {"id": "left_forearm", "label": "Left forearm", "view": "both"},
    {"id": "right_forearm", "label": "Right forearm", "view": "both"},
    {"id": "left_hand", "label": "Left hand", "view": "both"},
    {"id": "right_hand", "label": "Right hand", "view": "both"},
    {"id": "left_calf", "label": "Left calf", "view": "both"},
    {"id": "right_calf", "label": "Right calf", "view": "both"},
    {"id": "left_ankle", "label": "Left ankle", "view": "both"},
    {"id": "right_ankle", "label": "Right ankle", "view": "both"},
    {"id": "left_foot", "label": "Left foot", "view": "both"},
    {"id": "right_foot", "label": "Right foot", "view": "both"},
    {"id": "chest", "label": "Chest", "view": "front"},
    {"id": "abs", "label": "Abs", "view": "front"},
]


# Pain level scale
PAIN_LEVEL_MIN = 1
PAIN_LEVEL_MAX = 10

def pain_level_field(**kwargs):
    return Field(ge=PAIN_LEVEL_MIN, le=PAIN_LEVEL_MAX, **kwargs)

# Intake payload (what the frontend sends)
class RegionPain(BaseModel):
    region_id: BodyRegionIdLiteral
    level: int = Field(ge=PAIN_LEVEL_MIN, le=PAIN_LEVEL_MAX, description="Pain level")

class IntakePayload(BaseModel):
    regions: list[RegionPain]
    free_text: Optional[str] = None
    duration: Optional[str] = None
    triggers: Optional[str] = None
    session_id: Optional[str] = None  # When set, profile is loaded from store and used by agents
