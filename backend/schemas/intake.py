# Request-side schemas: body regions, pain scale, intake payload.

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field

# Body regions
class BodyRegionId(str, Enum):
    NECK = "neck"
    UPPER_BACK = "upper_back"
    MID_BACK = "mid_back"
    LOWER_BACK = "lower_back"
    LEFT_SHOULDER = "left_shoulder"
    RIGHT_SHOULDER = "right_shoulder"
    TAILBONE = "tailbone"

BodyRegionIdLiteral = Literal[
    "neck", "upper_back", "mid_back", "lower_back",
    "left_shoulder", "right_shoulder", "tailbone"
]

BODY_REGIONS = [
    {"id": "neck", "label": "Neck", "view": "back"},
    {"id": "upper_back", "label": "Upper back", "view": "back"},
    {"id": "mid_back", "label": "Mid back", "view": "back"},
    {"id": "lower_back", "label": "Lower back", "view": "back"},
    {"id": "left_shoulder", "label": "Left shoulder", "view": "back"},
    {"id": "right_shoulder", "label": "Right shoulder", "view": "back"},
    {"id": "tailbone", "label": "Tailbone", "view": "back"},
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
