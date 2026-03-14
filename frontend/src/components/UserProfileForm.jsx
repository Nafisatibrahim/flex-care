import { useState, useEffect } from 'react'

const FLEXCARE_SESSION_KEY = 'flexcare_session_id'

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem(FLEXCARE_SESSION_KEY)
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(FLEXCARE_SESSION_KEY, id)
    }
    return id
  } catch {
    return `s${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export default function UserProfileForm({ apiUrl }) {
  const [sessionId, setSessionId] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [previousSurgeries, setPreviousSurgeries] = useState('')
  const [priorInjuries, setPriorInjuries] = useState('')
  const [chronicConditions, setChronicConditions] = useState('')
  const [otherRelevant, setOtherRelevant] = useState('')
  const [insurerSlug, setInsurerSlug] = useState('')
  const [planSlug, setPlanSlug] = useState('')
  const [insurers, setInsurers] = useState([])
  const [plans, setPlans] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const baseUrl = apiUrl || (import.meta.env.VITE_API_URL || 'http://localhost:8000')

  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

  useEffect(() => {
    if (!baseUrl) return
    fetchJson(`${baseUrl}/referral/insurers`).then((data) => setInsurers(data.insurers || [])).catch(() => setInsurers([]))
  }, [baseUrl])

  useEffect(() => {
    if (!baseUrl || !insurerSlug) {
      setPlans([])
      return
    }
    fetchJson(`${baseUrl}/referral/plans?insurer_slug=${encodeURIComponent(insurerSlug)}`)
      .then((data) => setPlans(data.plans || []))
      .catch(() => setPlans([]))
  }, [baseUrl, insurerSlug])

  useEffect(() => {
    if (!sessionId || !baseUrl) return
    fetch(`${baseUrl}/profile?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data.profile) {
          setMedicalHistory(data.profile.medical_history || '')
          setPreviousSurgeries((data.profile.previous_surgeries || []).join(', '))
          setPriorInjuries((data.profile.prior_injuries || []).join(', '))
          setChronicConditions((data.profile.chronic_conditions || []).join(', '))
          setOtherRelevant(data.profile.other_relevant || '')
          setInsurerSlug(data.profile.insurer_slug || '')
          setPlanSlug(data.profile.plan_slug || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [sessionId, baseUrl])

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const payload = {
      session_id: sessionId,
      medical_history: medicalHistory.trim() || null,
      previous_surgeries: previousSurgeries.split(',').map((s) => s.trim()).filter(Boolean),
      prior_injuries: priorInjuries.split(',').map((s) => s.trim()).filter(Boolean),
      chronic_conditions: chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
      other_relevant: otherRelevant.trim() || null,
      insurer_slug: insurerSlug || null,
      plan_slug: planSlug || null,
    }
    fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save')
        setSaved(true)
      })
      .catch(() => setSaved(false))
      .finally(() => setSaving(false))
  }

  if (!loaded && sessionId) return <p className="text-slate-600 text-sm">Loading profile…</p>

  return (
    <div className="rounded border border-slate-200 bg-white p-4 text-sm">
      <h3 className="font-medium text-slate-800 mb-2">Your health profile</h3>
      <p className="text-slate-600 text-xs mb-3">
        This helps us tailor recommendations (e.g. if you’ve had knee surgery). Stored in this browser until you clear it. To use it when getting a recommendation, the app must send your session ID with the request.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-slate-700">Relevant medical history (free text)</span>
          <textarea
            value={medicalHistory}
            onChange={(e) => setMedicalHistory(e.target.value)}
            placeholder="e.g. Previous knee surgery (ACL repair, 2022). No other surgeries."
            rows={2}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-slate-700">Previous surgeries (comma-separated)</span>
          <input
            type="text"
            value={previousSurgeries}
            onChange={(e) => setPreviousSurgeries(e.target.value)}
            placeholder="e.g. Knee (ACL, 2022), Appendix (2019)"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-slate-700">Prior injuries (comma-separated)</span>
          <input
            type="text"
            value={priorInjuries}
            onChange={(e) => setPriorInjuries(e.target.value)}
            placeholder="e.g. Lower back strain 2020"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-slate-700">Chronic conditions (comma-separated)</span>
          <input
            type="text"
            value={chronicConditions}
            onChange={(e) => setChronicConditions(e.target.value)}
            placeholder="e.g. Asthma"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-slate-700">Other relevant (medications, lifestyle)</span>
          <input
            type="text"
            value={otherRelevant}
            onChange={(e) => setOtherRelevant(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="block">
            <span className="text-slate-700">Insurer</span>
            <select
              value={insurerSlug}
              onChange={(e) => { setInsurerSlug(e.target.value); setPlanSlug('') }}
              className="mt-1 block rounded border border-slate-300 px-2 py-1.5 bg-white text-sm"
            >
              <option value="">None</option>
              {insurers.map((i) => (
                <option key={i.slug} value={i.slug}>{i.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-slate-700">Plan</span>
            <select
              value={planSlug}
              onChange={(e) => setPlanSlug(e.target.value)}
              disabled={!insurerSlug || plans.length === 0}
              className="mt-1 block rounded border border-slate-300 px-2 py-1.5 bg-white text-sm disabled:opacity-60"
            >
              <option value="">None</option>
              {plans.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {saved && <span className="ml-2 text-green-600 text-sm">Saved.</span>}
      </form>

      <p className="text-slate-500 text-xs mt-3">
        Session ID (used to link this profile to your recommendation): <code className="bg-slate-100 px-1 rounded">{sessionId.slice(0, 12)}…</code>
      </p>
    </div>
  )
}

export { FLEXCARE_SESSION_KEY }
