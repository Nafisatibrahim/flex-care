import { useState, useEffect } from 'react'
import { FLEXCARE_SESSION_KEY } from './UserProfileForm'

const PROVIDER_TYPE_LABELS = {
  physio:  'Physiotherapy',
  chiro:   'Chiropractic',
  massage: 'Massage therapy',
  urgent:  'Urgent / emergency care',
  none:    'None',
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition'

/* ── Provider attribute reasons ─────────────────────────── */
function providerPros(provider) {
  const pros = []
  if (provider.recommended)         pros.push('AI-ranked #1 match for your condition and location')
  if (provider.accepts_direct_bill) pros.push('Accepts direct billing — no out-of-pocket paperwork')
  if (provider.languages?.length > 1)
    pros.push(`Multilingual staff (${provider.languages.join(', ')})`)
  if (provider.phone)               pros.push('Phone contact available for easy booking')
  return pros
}

function providerCautions(provider) {
  const cautions = []
  if (!provider.accepts_direct_bill)
    cautions.push('Does not direct-bill — you pay upfront and submit a claim')
  if (!provider.recommended)
    cautions.push('Not the top-ranked match — consider comparing with the recommended provider')
  return cautions
}

/* ── Expanded provider card ─────────────────────────────── */
function ProviderCard({ provider, expanded, onToggle, onAskAI, planSelected, aiLoading, aiResult }) {
  const pros     = providerPros(provider)
  const cautions = providerCautions(provider)

  return (
    <div
      className={`rounded-2xl border-2 transition-all overflow-hidden
        ${provider.recommended
          ? 'border-orange-300 bg-orange-50/60'
          : 'border-gray-200 bg-white'}`}
    >
      {/* Card header — always visible, clickable */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-start gap-4 group"
      >
        {/* Rank badge */}
        <div className={`w-9 h-9 rounded-xl flex-none flex items-center justify-center text-sm font-extrabold
          ${provider.recommended ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {provider.recommended ? '★' : '#'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-base font-bold text-gray-900 leading-snug">{provider.name}</span>
            {provider.recommended && (
              <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-semibold">
                Recommended
              </span>
            )}
            {provider.accepts_direct_bill && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                Direct billing
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 font-medium">{provider.clinic}</p>
          <p className="text-sm text-gray-400 mt-0.5">{provider.address}{provider.postal_code ? `, ${provider.postal_code}` : ''}</p>
        </div>

        {/* Expand chevron */}
        <svg
          className={`w-5 h-5 text-gray-400 flex-none mt-1 transition-transform
            ${expanded ? 'rotate-180' : ''} group-hover:text-gray-600`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">

          {/* Contact row */}
          <div className="flex flex-wrap gap-4">
            {provider.phone && (
              <a href={`tel:${provider.phone}`}
                className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:underline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                </svg>
                {provider.phone}
              </a>
            )}
            {provider.languages?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 font-medium">Languages:</span>
                {provider.languages.map(l => (
                  <span key={l} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">{l}</span>
                ))}
              </div>
            )}
          </div>

          {/* Pros */}
          {pros.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Why consider this provider</p>
              <ul className="space-y-1.5">
                {pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-emerald-500 font-bold flex-none mt-0.5">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cautions */}
          {cautions.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">Things to keep in mind</p>
              <ul className="space-y-1.5">
                {cautions.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 font-bold flex-none mt-0.5">·</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI plan fit for this provider */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">
              Ask the AI how well your selected plan covers a visit here:
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onAskAI('why', provider)}
                disabled={!planSelected || aiLoading}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Why my plan covers this
              </button>
              <button
                type="button"
                onClick={() => onAskAI('why_not', provider)}
                disabled={!planSelected || aiLoading}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Potential coverage gaps
              </button>
              {!planSelected && (
                <span className="text-xs text-gray-400 self-center">Select a plan below to unlock</span>
              )}
            </div>

            {aiLoading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <span className="animate-spin w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full inline-block"/>
                Asking AI…
              </div>
            )}
            {aiResult && !aiLoading && (
              <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-800 leading-relaxed">{aiResult}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────── */
export default function ReferralBlock({ referral, apiUrl }) {
  const [providers,        setProviders]        = useState([])
  const [coverage,         setCoverage]         = useState(null)
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [loadingCoverage,  setLoadingCoverage]  = useState(false)
  const [insurers,         setInsurers]         = useState([])
  const [plans,            setPlans]            = useState([])
  const [selectedInsurer,  setSelectedInsurer]  = useState('sunlife')
  const [selectedPlan,     setSelectedPlan]     = useState('')
  const [costEstimate,     setCostEstimate]     = useState(null)
  const [expandedId,       setExpandedId]       = useState(null)

  /* per-provider AI state: { [providerId]: { loading, result } } */
  const [providerAI, setProviderAI] = useState({})

  /* plan-level explain */
  const [planExplainLoading, setPlanExplainLoading] = useState(false)
  const [planExplainResult,  setPlanExplainResult]  = useState(null)
  const [planExplainQ,       setPlanExplainQ]       = useState(null)

  const showProvidersAndCoverage = referral?.provider_type && referral.provider_type !== 'none'

  useEffect(() => {
    if (!showProvidersAndCoverage || !apiUrl) return
    setLoadingProviders(true)
    setLoadingCoverage(true)
    const type = referral.provider_type

    fetch(`${apiUrl}/referral/providers?provider_type=${encodeURIComponent(type)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setProviders(d.providers || []))
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false))

    fetch(`${apiUrl}/referral/coverage?provider_type=${encodeURIComponent(type)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setCoverage)
      .catch(() => setCoverage(null))
      .finally(() => setLoadingCoverage(false))
  }, [showProvidersAndCoverage, referral?.provider_type, apiUrl])

  useEffect(() => {
    if (!apiUrl) return
    fetch(`${apiUrl}/referral/insurers`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setInsurers(d.insurers || []))
      .catch(() => setInsurers([]))
  }, [apiUrl])

  useEffect(() => {
    if (!apiUrl || !selectedInsurer) { setPlans([]); setSelectedPlan(''); return }
    fetch(`${apiUrl}/referral/plans?insurer_slug=${encodeURIComponent(selectedInsurer)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const list = d.plans || []
        setPlans(list)
        setSelectedPlan(prev => list.some(p => p.slug === prev) ? prev : '')
      })
      .catch(() => setPlans([]))
  }, [apiUrl, selectedInsurer])

  useEffect(() => {
    if (!showProvidersAndCoverage || !apiUrl) return
    try {
      const sid = localStorage.getItem(FLEXCARE_SESSION_KEY)
      if (!sid) return
      fetch(`${apiUrl}/profile?session_id=${encodeURIComponent(sid)}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => {
          if (d.profile?.insurer_slug) setSelectedInsurer(d.profile.insurer_slug)
          if (d.profile?.plan_slug)    setSelectedPlan(d.profile.plan_slug)
        })
        .catch(() => {})
    } catch { }
  }, [showProvidersAndCoverage, apiUrl])

  useEffect(() => {
    if (!apiUrl || !selectedPlan || !referral?.provider_type || referral.provider_type === 'urgent') {
      setCostEstimate(null); return
    }
    fetch(`${apiUrl}/referral/cost-estimate?plan_slug=${encodeURIComponent(selectedPlan)}&provider_type=${encodeURIComponent(referral.provider_type)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setCostEstimate(Object.keys(d).length ? d : null))
      .catch(() => setCostEstimate(null))
  }, [apiUrl, selectedPlan, referral?.provider_type])

  function handleProviderAI(question, provider) {
    if (!apiUrl || !selectedPlan || !referral?.provider_type) return
    const key = `${provider.id}_${question}`
    setProviderAI(prev => ({ ...prev, [key]: { loading: true, result: null } }))
    fetch(`${apiUrl}/referral/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_type: referral.provider_type, plan_slug: selectedPlan, question }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setProviderAI(prev => ({ ...prev, [key]: { loading: false, result: d.explanation || '' } })))
      .catch(() => setProviderAI(prev => ({ ...prev, [key]: { loading: false, result: 'Could not load explanation. Please try again.' } })))
  }

  function handlePlanExplain(question) {
    if (!apiUrl || !selectedPlan || !referral?.provider_type) return
    setPlanExplainQ(question)
    setPlanExplainLoading(true)
    setPlanExplainResult(null)
    fetch(`${apiUrl}/referral/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_type: referral.provider_type, plan_slug: selectedPlan, question }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setPlanExplainResult(d.explanation || ''))
      .catch(() => setPlanExplainResult('Could not load explanation. Please try again.'))
      .finally(() => setPlanExplainLoading(false))
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-orange-100 shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-none">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-base">Specialist Referral</p>
            <p className="text-orange-100 text-sm">{PROVIDER_TYPE_LABELS[referral.provider_type] ?? referral.provider_type}</p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50/40 px-6 py-5 space-y-6">

        {/* Reason + timing */}
        <div className="bg-white rounded-2xl border border-amber-100 px-5 py-4">
          <p className="text-gray-800 text-base leading-relaxed">{referral.reason}</p>
          {referral.timing && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-100">
              <span className="text-amber-500 text-base">⏱</span>
              <p className="text-amber-700 text-sm font-semibold">{referral.timing}</p>
            </div>
          )}
        </div>

        {referral.discipline_explanation && (
          <div className="bg-white rounded-2xl border border-amber-100 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Why this type of care?</p>
            <p className="text-gray-700 text-sm leading-relaxed">{referral.discipline_explanation}</p>
          </div>
        )}

        {showProvidersAndCoverage && (
          <>
            {/* ── Providers ─────────────────────────────── */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="inline-flex w-5 h-5 rounded-md bg-orange-100 text-orange-600 text-xs font-extrabold items-center justify-center">P</span>
                Find a provider
                <span className="text-xs text-gray-400 font-normal">— click a card for details</span>
              </p>

              {loadingProviders ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                  <span className="animate-spin w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full inline-block"/>
                  Loading providers…
                </div>
              ) : providers.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">No providers listed yet. Check your local directory.</p>
              ) : (
                <div className="space-y-3">
                  {providers.map(provider => {
                    const aiKeyWhy    = `${provider.id}_why`
                    const aiKeyWhyNot = `${provider.id}_why_not`
                    const lastQ = providerAI[aiKeyWhy]?.result ? 'why' : providerAI[aiKeyWhyNot]?.result ? 'why_not' : null
                    const aiEntry = lastQ ? providerAI[lastQ === 'why' ? aiKeyWhy : aiKeyWhyNot] : null
                    const anyLoading = providerAI[aiKeyWhy]?.loading || providerAI[aiKeyWhyNot]?.loading

                    return (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        expanded={expandedId === provider.id}
                        onToggle={() => setExpandedId(prev => prev === provider.id ? null : provider.id)}
                        onAskAI={handleProviderAI}
                        planSelected={!!selectedPlan}
                        aiLoading={!!anyLoading}
                        aiResult={aiEntry?.result ?? null}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Coverage ───────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <span className="inline-flex w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 text-xs font-extrabold items-center justify-center">$</span>
                <p className="text-sm font-bold text-gray-700">Coverage & cost estimate</p>
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* General coverage copy */}
                {loadingCoverage ? (
                  <p className="text-gray-500 text-sm">Loading coverage info…</p>
                ) : coverage ? (
                  <div className="space-y-3">
                    <p className="text-gray-700 text-sm leading-relaxed">{coverage.copy}</p>
                    <ul className="space-y-2">
                      {coverage.checklist?.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                          <span className="text-indigo-500 flex-none mt-0.5 font-bold">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Insurer + Plan selectors */}
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Your insurance plan</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500">Insurer</label>
                      <select value={selectedInsurer} onChange={e => setSelectedInsurer(e.target.value)} className={inputCls}>
                        <option value="">Select insurer</option>
                        {insurers.map(i => <option key={i.slug} value={i.slug}>{i.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-500">Plan</label>
                      <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}
                        disabled={!selectedInsurer || plans.length === 0} className={`${inputCls} disabled:opacity-50`}>
                        <option value="">Select plan</option>
                        {plans.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Cost estimate */}
                  {costEstimate && (
                    <div className="bg-indigo-50 rounded-2xl px-5 py-4 border border-indigo-100">
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">
                        Estimated cost per visit
                      </p>
                      <div className="grid grid-cols-3 gap-3 text-center mb-3">
                        {[
                          { label: 'Session cost', val: `$${costEstimate.cost_per_visit}`, color: 'text-gray-900' },
                          { label: 'Plan covers',  val: `$${costEstimate.covered_amount}`, color: 'text-emerald-600' },
                          { label: 'You pay',      val: `$${costEstimate.you_pay}`,        color: 'text-orange-500' },
                        ].map(s => (
                          <div key={s.label} className="bg-white rounded-xl py-3 px-2 border border-indigo-100/50">
                            <p className={`text-2xl font-extrabold ${s.color}`}>{s.val}</p>
                            <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 text-center">
                        {costEstimate.coverage_percent}% coverage · ${costEstimate.annual_limit_dollars} annual max
                      </p>
                    </div>
                  )}

                  {/* Plan-level AI explain */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">AI plan analysis</p>
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={() => handlePlanExplain('why')}
                        disabled={!selectedPlan || planExplainLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        Why this plan fits
                      </button>
                      <button type="button" onClick={() => handlePlanExplain('why_not')}
                        disabled={!selectedPlan || planExplainLoading}
                        className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        Potential gaps
                      </button>
                      {!selectedPlan && (
                        <span className="text-xs text-gray-400 self-center">Select a plan to unlock</span>
                      )}
                    </div>

                    {planExplainLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="animate-spin w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full inline-block"/>
                        Asking AI…
                      </div>
                    )}
                    {planExplainResult && !planExplainLoading && (
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                          {planExplainQ === 'why' ? 'Why this plan fits' : 'Potential coverage gaps'}
                        </p>
                        <p className="text-sm text-gray-800 leading-relaxed">{planExplainResult}</p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 pt-1">
                    Final coverage determined by your insurer. This is an estimate only.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
