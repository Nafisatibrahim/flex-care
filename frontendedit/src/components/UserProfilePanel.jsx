import { useState, useEffect, useRef } from 'react'
import { FLEXCARE_SESSION_KEY } from './UserProfileForm'

const META_KEY = 'flexcare_user_meta'

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveMeta(data) {
  try { localStorage.setItem(META_KEY, JSON.stringify(data)) } catch { }
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
  } catch { return `s${Date.now()}` }
}

function calcAge(dob) {
  if (!dob) return ''
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age >= 0 ? String(age) : ''
}

function buildOtherRelevant(meta, freeText) {
  const parts = []
  if (meta.fullName)              parts.push(`Name: ${meta.fullName}`)
  if (meta.dob)                   parts.push(`DOB: ${meta.dob} (age ${calcAge(meta.dob)})`)
  if (meta.sex)                   parts.push(`Sex: ${meta.sex}`)
  if (meta.pregnant === true)     parts.push('Currently pregnant: Yes')
  if (meta.phone)                 parts.push(`Phone: ${meta.phone}`)
  if (meta.emergencyName)         parts.push(`Emergency contact: ${meta.emergencyName}`)
  if (meta.emergencyPhone)        parts.push(`Emergency phone: ${meta.emergencyPhone}`)
  if (meta.emergencyRelation)     parts.push(`Relation: ${meta.emergencyRelation}`)
  if (freeText?.trim())           parts.push(freeText.trim())
  return parts.join('; ')
}

const inputCls = "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
const selectCls = "block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition disabled:opacity-50"

function Field({ label, children, half }) {
  return (
    <label className={`flex flex-col gap-1 ${half ? '' : 'col-span-2'}`}>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

export default function UserProfilePanel({ open, onClose, apiUrl, auth0User }) {
  const panelRef = useRef(null)
  const [sessionId, setSessionId] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState('')
  const [pregnant, setPregnant] = useState(false)
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelation, setEmergencyRelation] = useState('')

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
  const [profileLoaded, setProfileLoaded] = useState(false)

  const baseUrl = apiUrl || (import.meta.env.VITE_API_URL || 'http://localhost:8000')

  const age = calcAge(dob)

  useEffect(() => { setSessionId(getOrCreateSessionId()) }, [])

  useEffect(() => {
    if (auth0User?.name && !fullName) setFullName(auth0User.name)
    if (auth0User?.email && !email) setEmail(auth0User.email)
  }, [auth0User])

  useEffect(() => {
    const meta = loadMeta()
    if (meta.fullName)          setFullName(meta.fullName)
    if (meta.email)             setEmail(meta.email)
    if (meta.phone)             setPhone(meta.phone)
    if (meta.dob)               setDob(meta.dob)
    if (meta.sex)               setSex(meta.sex)
    if (meta.pregnant != null)  setPregnant(meta.pregnant)
    if (meta.emergencyName)     setEmergencyName(meta.emergencyName)
    if (meta.emergencyPhone)    setEmergencyPhone(meta.emergencyPhone)
    if (meta.emergencyRelation) setEmergencyRelation(meta.emergencyRelation)
  }, [])

  useEffect(() => {
    if (!baseUrl) return
    fetch(`${baseUrl}/referral/insurers`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setInsurers(d.insurers || []))
      .catch(() => setInsurers([]))
  }, [baseUrl])

  useEffect(() => {
    if (!baseUrl || !insurerSlug) { setPlans([]); return }
    fetch(`${baseUrl}/referral/plans?insurer_slug=${encodeURIComponent(insurerSlug)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setPlans(d.plans || []))
      .catch(() => setPlans([]))
  }, [baseUrl, insurerSlug])

  useEffect(() => {
    if (!sessionId || !baseUrl || profileLoaded) return
    fetch(`${baseUrl}/profile?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const p = d.profile
        if (!p) return
        setMedicalHistory(p.medical_history || '')
        setPreviousSurgeries((p.previous_surgeries || []).join(', '))
        setPriorInjuries((p.prior_injuries || []).join(', '))
        setChronicConditions((p.chronic_conditions || []).join(', '))
        if (p.insurer_slug) setInsurerSlug(p.insurer_slug)
        if (p.plan_slug) setPlanSlug(p.plan_slug)
      })
      .catch(() => {})
      .finally(() => setProfileLoaded(true))
  }, [sessionId, baseUrl])

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const meta = { fullName, email, phone, dob, sex, pregnant, emergencyName, emergencyPhone, emergencyRelation }
    saveMeta(meta)

    const composedOther = buildOtherRelevant(meta, otherRelevant)

    const payload = {
      session_id: sessionId,
      medical_history: medicalHistory.trim() || null,
      previous_surgeries: previousSurgeries.split(',').map(s => s.trim()).filter(Boolean),
      prior_injuries: priorInjuries.split(',').map(s => s.trim()).filter(Boolean),
      chronic_conditions: chronicConditions.split(',').map(s => s.trim()).filter(Boolean),
      other_relevant: composedOther || null,
      insurer_slug: insurerSlug || null,
      plan_slug: planSlug || null,
    }

    try {
      const res = await fetch(`${baseUrl}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaved(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideInRight 0.25s cubic-bezier(.4,0,.2,1)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex items-center gap-4 shrink-0">
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg leading-tight">My Profile</h2>
            <p className="text-indigo-200 text-xs mt-0.5">Personal &amp; health information · used to personalise AI recommendations</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            {/* ── Personal information ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">Personal information</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full name">
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className={inputCls}/>
                </Field>
                <Field label="Email address">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls}/>
                </Field>
                <Field label="Phone" half>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputCls}/>
                </Field>
                <Field label="Date of birth" half>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputCls}/>
                </Field>
                <Field label="Sex at birth" half>
                  <select value={sex} onChange={e => setSex(e.target.value)} className={selectCls}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label={`Age${age ? ` — ${age} years` : ''}`} half>
                  <input type="text" value={age} readOnly placeholder="Auto-calculated from DOB"
                    className={`${inputCls} bg-gray-100 text-gray-500 cursor-default`}/>
                </Field>
              </div>

              {sex === 'female' && (
                <label className="flex items-center gap-3 mt-3 cursor-pointer">
                  <div
                    onClick={() => setPregnant(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${pregnant ? 'bg-indigo-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${pregnant ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                  </div>
                  <span className="text-sm text-gray-700">Currently pregnant</span>
                </label>
              )}
            </section>

            {/* ── Emergency contact ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">Emergency contact</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" half>
                  <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Contact name" className={inputCls}/>
                </Field>
                <Field label="Relationship" half>
                  <input type="text" value={emergencyRelation} onChange={e => setEmergencyRelation(e.target.value)} placeholder="e.g. Spouse, Parent" className={inputCls}/>
                </Field>
                <Field label="Phone number">
                  <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputCls}/>
                </Field>
              </div>
            </section>

            {/* ── Medical history ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">Medical history</h3>
              </div>
              <div className="space-y-3">
                <Field label="General medical history">
                  <textarea value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)}
                    placeholder="Surgeries, conditions, hospitalisations, anything relevant…"
                    rows={3} className={inputCls}/>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Previous surgeries (comma-separated)" half>
                    <input type="text" value={previousSurgeries} onChange={e => setPreviousSurgeries(e.target.value)}
                      placeholder="e.g. Knee ACL 2022" className={inputCls}/>
                  </Field>
                  <Field label="Prior injuries (comma-separated)" half>
                    <input type="text" value={priorInjuries} onChange={e => setPriorInjuries(e.target.value)}
                      placeholder="e.g. Lower back strain 2020" className={inputCls}/>
                  </Field>
                  <Field label="Chronic conditions (comma-separated)" half>
                    <input type="text" value={chronicConditions} onChange={e => setChronicConditions(e.target.value)}
                      placeholder="e.g. Asthma, Type 2 diabetes" className={inputCls}/>
                  </Field>
                  <Field label="Medications / other context" half>
                    <input type="text" value={otherRelevant} onChange={e => setOtherRelevant(e.target.value)}
                      placeholder="e.g. Ibuprofen daily, sedentary job" className={inputCls}/>
                  </Field>
                </div>
              </div>
            </section>

            {/* ── Insurance ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">Insurance</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">Saved here so the Coverage section auto-fills after your assessment.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Insurer" half>
                  <select value={insurerSlug} onChange={e => { setInsurerSlug(e.target.value); setPlanSlug('') }} className={selectCls}>
                    <option value="">None</option>
                    {insurers.map(i => <option key={i.slug} value={i.slug}>{i.name}</option>)}
                  </select>
                </Field>
                <Field label="Plan" half>
                  <select value={planSlug} onChange={e => setPlanSlug(e.target.value)}
                    disabled={!insurerSlug || plans.length === 0} className={selectCls}>
                    <option value="">None</option>
                    {plans.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                  </select>
                </Field>
              </div>
            </section>

          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-white shrink-0 flex items-center gap-3">
          <button
            type="submit"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm"
          >
            {saving ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>Saving…</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
              </svg>Save profile</>
            )}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Saved!
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
