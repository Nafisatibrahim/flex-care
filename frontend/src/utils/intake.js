/**
 * Build intake payload matching backend IntakePayload schema.
 * regions: [{ region_id, level }], optional free_text, duration, triggers, session_id.
 * Include session_id (e.g. from localStorage.getItem('flexcare_session_id')) to use saved user profile with the recommendation.
 */
export function buildIntakePayload(regionLevels, options = {}) {
  const regions = Object.entries(regionLevels).map(([region_id, level]) => ({
    region_id,
    level: Math.round(Number(level)),
  }))
  return {
    regions,
    ...(options.free_text != null && options.free_text.trim() !== '' && { free_text: options.free_text.trim() }),
    ...(options.duration != null && options.duration.trim() !== '' && { duration: options.duration.trim() }),
    ...(options.triggers != null && options.triggers.trim() !== '' && { triggers: options.triggers.trim() }),
    ...(options.session_id != null && options.session_id !== '' && { session_id: options.session_id }),
  }
}
