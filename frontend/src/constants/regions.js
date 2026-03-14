/**
 * Body map region IDs — must match backend/schemas/intake.py BodyRegionId / BODY_REGIONS.
 * Mappings for react-muscle-highlighter: back view and front view (slug + optional side).
 */

export const PAIN_LEVEL_MIN = 1
export const PAIN_LEVEL_MAX = 10

export const BODY_REGION_IDS = [
  'neck',
  'upper_back',
  'mid_back',
  'lower_back',
  'left_shoulder',
  'right_shoulder',
  'tailbone',
  'left_forearm',
  'right_forearm',
  'left_hand',
  'right_hand',
  'left_calf',
  'right_calf',
  'left_ankle',
  'right_ankle',
  'left_foot',
  'right_foot',
  'chest',
  'abs',
]

export const REGION_LABELS = {
  neck: 'Neck',
  upper_back: 'Upper back',
  mid_back: 'Mid back',
  lower_back: 'Lower back',
  left_shoulder: 'Left shoulder',
  right_shoulder: 'Right shoulder',
  tailbone: 'Tailbone',
  left_forearm: 'Left forearm',
  right_forearm: 'Right forearm',
  left_hand: 'Left hand',
  right_hand: 'Right hand',
  left_calf: 'Left calf',
  right_calf: 'Right calf',
  left_ankle: 'Left ankle',
  right_ankle: 'Right ankle',
  left_foot: 'Left foot',
  right_foot: 'Right foot',
  chest: 'Chest',
  abs: 'Abs',
}

/**
 * Back view: our region_id → library { slug, side? } for highlighting.
 */
export const REGION_TO_LIBRARY_BACK = {
  neck: { slug: 'neck' },
  upper_back: { slug: 'trapezius' },
  mid_back: { slug: 'upper-back' },
  lower_back: { slug: 'lower-back' },
  left_shoulder: { slug: 'deltoids', side: 'left' },
  right_shoulder: { slug: 'deltoids', side: 'right' },
  tailbone: { slug: 'gluteal' },
  left_forearm: { slug: 'forearm', side: 'left' },
  right_forearm: { slug: 'forearm', side: 'right' },
  left_hand: { slug: 'hands', side: 'left' },
  right_hand: { slug: 'hands', side: 'right' },
  left_calf: { slug: 'calves', side: 'left' },
  right_calf: { slug: 'calves', side: 'right' },
  left_ankle: { slug: 'ankles', side: 'left' },
  right_ankle: { slug: 'ankles', side: 'right' },
  left_foot: { slug: 'feet', side: 'left' },
  right_foot: { slug: 'feet', side: 'right' },
  chest: null,
  abs: null,
}

/**
 * Front view: our region_id → library { slug, side? } for highlighting.
 */
export const REGION_TO_LIBRARY_FRONT = {
  neck: { slug: 'neck' },
  upper_back: null,
  mid_back: null,
  lower_back: null,
  left_shoulder: { slug: 'deltoids', side: 'left' },
  right_shoulder: { slug: 'deltoids', side: 'right' },
  tailbone: null,
  left_forearm: { slug: 'forearm', side: 'left' },
  right_forearm: { slug: 'forearm', side: 'right' },
  left_hand: { slug: 'hands', side: 'left' },
  right_hand: { slug: 'hands', side: 'right' },
  left_calf: { slug: 'calves', side: 'left' },
  right_calf: { slug: 'calves', side: 'right' },
  left_ankle: { slug: 'ankles', side: 'left' },
  right_ankle: { slug: 'ankles', side: 'right' },
  left_foot: { slug: 'feet', side: 'left' },
  right_foot: { slug: 'feet', side: 'right' },
  chest: { slug: 'chest' },
  abs: { slug: 'abs' },
}

/**
 * Map library (slug, side) → our backend region_id from onBodyPartPress.
 * Handles both back and front view slugs. Head and hair → neck.
 */
export function libraryPressToRegionId(slug, side) {
  if (slug === 'neck' || slug === 'head' || slug === 'hair') return 'neck'
  if (slug === 'trapezius') return 'upper_back'
  if (slug === 'upper-back') return 'mid_back'
  if (slug === 'lower-back') return 'lower_back'
  if (slug === 'deltoids' && side === 'left') return 'left_shoulder'
  if (slug === 'deltoids' && side === 'right') return 'right_shoulder'
  if (slug === 'triceps' && side === 'left') return 'left_shoulder'
  if (slug === 'triceps' && side === 'right') return 'right_shoulder'
  if (slug === 'gluteal') return 'tailbone'
  if (slug === 'forearm' && side === 'left') return 'left_forearm'
  if (slug === 'forearm' && side === 'right') return 'right_forearm'
  if (slug === 'hands' && side === 'left') return 'left_hand'
  if (slug === 'hands' && side === 'right') return 'right_hand'
  if (slug === 'calves' && side === 'left') return 'left_calf'
  if (slug === 'calves' && side === 'right') return 'right_calf'
  if (slug === 'ankles' && side === 'left') return 'left_ankle'
  if (slug === 'ankles' && side === 'right') return 'right_ankle'
  if (slug === 'feet' && side === 'left') return 'left_foot'
  if (slug === 'feet' && side === 'right') return 'right_foot'
  if (slug === 'chest') return 'chest'
  if (slug === 'abs' || slug === 'obliques') return 'abs'
  if (slug === 'biceps' && side === 'left') return 'left_shoulder'
  if (slug === 'biceps' && side === 'right') return 'right_shoulder'
  if (slug === 'adductors') return 'tailbone'
  if (slug === 'hamstring' && side === 'left') return 'left_calf'
  if (slug === 'hamstring' && side === 'right') return 'right_calf'
  if (slug === 'quadriceps' && side === 'left') return 'left_calf'
  if (slug === 'quadriceps' && side === 'right') return 'right_calf'
  if (slug === 'tibialis' && side === 'left') return 'left_calf'
  if (slug === 'tibialis' && side === 'right') return 'right_calf'
  if (slug === 'knees' && side === 'left') return 'left_ankle'
  if (slug === 'knees' && side === 'right') return 'right_ankle'
  return null
}
