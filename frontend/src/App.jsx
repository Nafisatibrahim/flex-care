import { useState } from 'react'
import BodyMap from './components/BodyMap'
import {
  REGION_LABELS,
  PAIN_LEVEL_MIN,
  PAIN_LEVEL_MAX,
} from './constants/regions'
import { buildIntakePayload } from './utils/intake'

const DEFAULT_PAIN_LEVEL = 5
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [regionLevels, setRegionLevels] = useState({})
  const [view, setView] = useState('back')
  const [gender, setGender] = useState('male')
  const [freeText, setFreeText] = useState('')
  const [duration, setDuration] = useState('')
  const [triggers, setTriggers] = useState('')
  const [recommendation, setRecommendation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleRegionClick = (regionId) => {
    setRegionLevels((prev) => ({
      ...prev,
      [regionId]: prev[regionId] ?? DEFAULT_PAIN_LEVEL,
    }))
  }

  const setLevel = (regionId, level) => {
    setRegionLevels((prev) => ({
      ...prev,
      [regionId]: Math.max(PAIN_LEVEL_MIN, Math.min(PAIN_LEVEL_MAX, level)),
    }))
  }

  const removeRegion = (regionId) => {
    setRegionLevels((prev) => {
      const next = { ...prev }
      delete next[regionId]
      return next
    })
  }

  const handleSubmit = async () => {
    const payload = buildIntakePayload(regionLevels, {
      free_text: freeText,
      duration,
      triggers,
    })
    setSubmitError(null)
    setRecommendation(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed: ${res.status}`)
      }
      const data = await res.json()
      setRecommendation(data)
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again or speak to a healthcare professional.')
    } finally {
      setLoading(false)
    }
  }

  const entries = Object.entries(regionLevels)
  const canSubmit = entries.length > 0

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="text-center mb-4">
        <h1 className="text-2xl font-semibold text-slate-800">FlexCare</h1>
        <p className="text-slate-600 text-sm mt-1">Tap where it hurts, set pain level (1–10)</p>
      </header>

      <div className="flex flex-wrap justify-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">View:</span>
          <button
            type="button"
            onClick={() => setView('front')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              view === 'front'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setView('back')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              view === 'back'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Back
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Body:</span>
          <button
            type="button"
            onClick={() => setGender('male')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              gender === 'male'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Male
          </button>
          <button
            type="button"
            onClick={() => setGender('female')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              gender === 'female'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Female
          </button>
        </div>
      </div>

      <BodyMap
        onRegionClick={handleRegionClick}
        regionLevels={regionLevels}
        side={view}
        gender={gender}
      />

      {entries.length > 0 ? (
        <div className="max-w-md mx-auto mt-6 space-y-4">
          <h2 className="text-sm font-medium text-slate-700">Pain areas (1 = mild, 10 = severe)</h2>
          <ul className="space-y-2">
            {entries.map(([regionId, level]) => (
              <li
                key={regionId}
                className="flex flex-wrap items-center gap-2 p-2 bg-white rounded border border-slate-200"
              >
                <span className="w-28 text-sm text-slate-800 shrink-0">
                  {REGION_LABELS[regionId]}
                </span>
                <input
                  type="range"
                  min={PAIN_LEVEL_MIN}
                  max={PAIN_LEVEL_MAX}
                  value={level}
                  onChange={(e) => setLevel(regionId, Number(e.target.value))}
                  className="flex-1 min-w-0 h-2 accent-blue-600"
                  aria-label={`Pain level for ${REGION_LABELS[regionId]}`}
                />
                <span className="w-6 text-sm text-slate-600 tabular-nums" aria-hidden="true">
                  {level}
                </span>
                <button
                  type="button"
                  onClick={() => removeRegion(regionId)}
                  className="text-slate-500 hover:text-red-600 text-sm px-1"
                  aria-label={`Remove ${REGION_LABELS[regionId]}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Or describe where it hurts (optional)
            </label>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="e.g. Pain started after sitting all day"
              rows={2}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="block text-sm font-medium text-slate-700">
              Duration (optional)
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 3 days"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="block text-sm font-medium text-slate-700">
              Triggers (optional)
            </label>
            <input
              type="text"
              value={triggers}
              onChange={(e) => setTriggers(e.target.value)}
              placeholder="e.g. sitting, lifting"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="w-full py-2.5 rounded bg-blue-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            {loading ? 'Getting recommendation…' : 'Get recommendation'}
          </button>

          {submitError && (
            <div className="p-3 bg-red-50 rounded border border-red-200 text-sm text-red-800">
              {submitError}
            </div>
          )}

          {recommendation && (
            <div className="p-4 bg-white rounded border border-slate-200 text-sm space-y-3">
              {recommendation.error_message ? (
                <p className="text-amber-800">{recommendation.error_message}</p>
              ) : (
                <>
                  <div>
                    <h3 className="font-medium text-slate-800 mb-1">Why this recommendation</h3>
                    <p className="text-slate-700">{recommendation.why_this_recommendation}</p>
                  </div>
                  {recommendation.recovery && (
                    <div>
                      <h3 className="font-medium text-slate-800 mb-1">Recovery</h3>
                      <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                        {recommendation.recovery.actions?.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                      {recommendation.recovery.precautions?.length > 0 && (
                        <>
                          <p className="font-medium text-slate-700 mt-2">Precautions</p>
                          <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                            {recommendation.recovery.precautions.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                  {recommendation.referral && (
                    <div className="p-2 bg-amber-50 rounded border border-amber-200">
                      <p className="font-medium text-slate-800">
                        Referral: {recommendation.referral.provider_type}
                      </p>
                      <p className="text-slate-700">{recommendation.referral.reason}</p>
                      {recommendation.referral.timing && (
                        <p className="text-slate-600 text-xs mt-1">When: {recommendation.referral.timing}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-center mt-4 text-slate-500 text-sm">
          Tap a body region to add it, then set pain level with the slider.
        </p>
      )}
    </div>
  )
}
