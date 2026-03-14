import Body from 'react-muscle-highlighter'
import {
  REGION_TO_LIBRARY_BACK,
  REGION_TO_LIBRARY_FRONT,
  libraryPressToRegionId,
} from '../constants/regions'

/** Heat gradient: cold (1) to hot (10) for intensity levels */
const HEAT_COLORS = [
  '#3b82f6', // 1
  '#60a5fa',
  '#93c5fd',
  '#a5d6ff',
  '#fcd34d', // 5
  '#fbbf24',
  '#f59e0b',
  '#ea580c',
  '#dc2626',
  '#b91c1c', // 10
]

/**
 * Body map using react-muscle-highlighter (anatomically styled).
 * Supports male/female and front/back view. regionLevels = { [region_id]: level 1-10 }.
 */
export default function BodyMap({
  onRegionClick,
  regionLevels = {},
  side = 'back',
  gender = 'male',
}) {
  const map = side === 'back' ? REGION_TO_LIBRARY_BACK : REGION_TO_LIBRARY_FRONT
  const data = Object.entries(regionLevels)
    .map(([regionId, level]) => {
      const mapping = map[regionId]
      if (!mapping) return null
      return {
        ...mapping,
        intensity: Math.max(1, Math.min(10, Math.round(level))),
      }
    })
    .filter(Boolean)

  const handleBodyPartPress = (part, pressSide) => {
    const regionId = libraryPressToRegionId(part?.slug, pressSide)
    if (regionId) onRegionClick?.(regionId)
  }

  return (
    <div
      className="w-full max-w-sm mx-auto select-none"
      role="img"
      aria-label={`Body map ${side} view - tap a region`}
    >
      <Body
        data={data}
        side={side}
        gender={gender}
        scale={1.4}
        colors={HEAT_COLORS}
        onBodyPartPress={handleBodyPartPress}
        defaultFill="#94a3b8"
        defaultStroke="#64748b"
        defaultStrokeWidth={0.5}
        border="#cbd5e1"
      />
    </div>
  )
}
