import { useState, useEffect } from 'react'

const PROVIDER_TYPE_LABELS = {
  physio: 'Physiotherapy',
  chiro: 'Chiropractic',
  massage: 'Massage therapy',
  urgent: 'Urgent / emergency care',
  none: 'None',
}

export default function ReferralBlock({ referral, apiUrl }) {
  const [providers, setProviders] = useState([])
  const [coverage, setCoverage] = useState(null)
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [loadingCoverage, setLoadingCoverage] = useState(false)
  const [insurers, setInsurers] = useState([])
  const [plans, setPlans] = useState([])
  const [selectedInsurer, setSelectedInsurer] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('')
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainResult, setExplainResult] = useState(null)
  const [explainQuestion, setExplainQuestion] = useState(null)

  const showProvidersAndCoverage = referral?.provider_type && referral.provider_type !== 'none'

  useEffect(() => {
    if (!showProvidersAndCoverage || !apiUrl) return
    setLoadingProviders(true)
    setLoadingCoverage(true)
    const type = referral.provider_type

    fetch(`${apiUrl}/referral/providers?provider_type=${encodeURIComponent(type)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load providers'))))
      .then((data) => {
        setProviders(data.providers || [])
      })
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false))

    fetch(`${apiUrl}/referral/coverage?provider_type=${encodeURIComponent(type)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load coverage'))))
      .then(setCoverage)
      .catch(() => setCoverage(null))
      .finally(() => setLoadingCoverage(false))
  }, [showProvidersAndCoverage, referral?.provider_type, apiUrl])

  useEffect(() => {
    if (!apiUrl) return
    fetch(`${apiUrl}/referral/insurers`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setInsurers(data.insurers || []))
      .catch(() => setInsurers([]))
  }, [apiUrl])

  useEffect(() => {
    if (!apiUrl || !selectedInsurer) {
      setPlans([])
      setSelectedPlan('')
      return
    }
    fetch(`${apiUrl}/referral/plans?insurer_slug=${encodeURIComponent(selectedInsurer)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setPlans(data.plans || [])
        setSelectedPlan('')
      })
      .catch(() => setPlans([]))
  }, [apiUrl, selectedInsurer])

  const handleExplain = (question) => {
    if (!apiUrl || !selectedPlan || !referral?.provider_type) return
    setExplainQuestion(question)
    setExplainLoading(true)
    setExplainResult(null)
    fetch(`${apiUrl}/referral/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_type: referral.provider_type,
        plan_slug: selectedPlan,
        question,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to get explanation'))))
      .then((data) => setExplainResult(data.explanation || ''))
      .catch(() => setExplainResult('Could not load explanation. Please try again.'))
      .finally(() => setExplainLoading(false))
  }

  return (
    <div className="p-2 bg-amber-50 rounded border border-amber-200 space-y-3">
      <p className="font-medium text-slate-800">
        Referral: {PROVIDER_TYPE_LABELS[referral.provider_type] ?? referral.provider_type}
      </p>
      <p className="text-slate-700">{referral.reason}</p>
      {referral.timing && (
        <p className="text-slate-600 text-xs mt-1">When: {referral.timing}</p>
      )}

      {referral.discipline_explanation && (
        <div>
          <h4 className="font-medium text-slate-800 text-sm mt-2">Why this type of care?</h4>
          <p className="text-slate-700 text-sm">{referral.discipline_explanation}</p>
        </div>
      )}

      {showProvidersAndCoverage && (
        <>
          <div>
            <h4 className="font-medium text-slate-800 text-sm mt-2">Find a provider</h4>
            {loadingProviders ? (
              <p className="text-slate-600 text-sm">Loading providers…</p>
            ) : providers.length === 0 ? (
              <p className="text-slate-600 text-sm">No providers listed for your area yet. Check your local directory.</p>
            ) : (
              <ul className="mt-1 space-y-2">
                {providers.map((provider) => (
                  <li
                    key={provider.id}
                    className={`p-2 rounded border text-sm ${provider.recommended ? 'border-amber-400 bg-amber-100/50' : 'border-slate-200 bg-white'}`}
                  >
                    {provider.recommended && (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500 text-white text-xs font-medium mr-2">
                        Recommended
                      </span>
                    )}
                    <p className="font-medium text-slate-800">{provider.name} — {provider.clinic}</p>
                    <p className="text-slate-600 text-xs">{provider.address}, {provider.postal_code}</p>
                    {provider.phone && <p className="text-slate-600 text-xs">Tel: {provider.phone}</p>}
                    {provider.languages?.length > 0 && (
                      <p className="text-slate-500 text-xs">Languages: {provider.languages.join(', ')}</p>
                    )}
                    {provider.accepts_direct_bill && (
                      <p className="text-green-700 text-xs">Accepts direct billing</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="font-medium text-slate-800 text-sm mt-2">Understanding your coverage</h4>
            <p className="text-slate-600 text-xs mt-0.5">Final coverage is determined by your insurer.</p>
            {loadingCoverage ? (
              <p className="text-slate-600 text-sm">Loading…</p>
            ) : coverage ? (
              <>
                <p className="text-slate-700 text-sm mt-1">{coverage.copy}</p>
                <ul className="list-decimal list-inside text-slate-700 text-sm mt-2 space-y-0.5">
                  {coverage.checklist?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}

            <div className="mt-3 pt-3 border-t border-amber-200">
              <p className="text-slate-700 text-sm font-medium mb-2">Compare with your plan</p>
              <div className="flex flex-wrap gap-2 mb-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <span className="text-slate-600">Insurer:</span>
                  <select
                    value={selectedInsurer}
                    onChange={(e) => setSelectedInsurer(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-sm bg-white"
                  >
                    <option value="">Select insurer</option>
                    {insurers.map((i) => (
                      <option key={i.slug} value={i.slug}>{i.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <span className="text-slate-600">Plan:</span>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-sm bg-white"
                    disabled={!selectedInsurer || plans.length === 0}
                  >
                    <option value="">Select plan</option>
                    {plans.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleExplain('why')}
                  disabled={!selectedPlan || explainLoading}
                  className="px-3 py-1.5 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Why?
                </button>
                <button
                  type="button"
                  onClick={() => handleExplain('why_not')}
                  disabled={!selectedPlan || explainLoading}
                  className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Why not?
                </button>
              </div>
              {(explainLoading || explainResult) && (
                <div className="mt-2 p-2 rounded bg-slate-100 border border-slate-200 text-sm text-slate-800">
                  {explainLoading ? (
                    <p className="text-slate-600">Loading explanation…</p>
                  ) : (
                    <>
                      <p className="font-medium text-slate-700 mb-0.5">
                        {explainQuestion === 'why' ? 'Why this fits' : 'Why it might not'}
                      </p>
                      <p>{explainResult}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
