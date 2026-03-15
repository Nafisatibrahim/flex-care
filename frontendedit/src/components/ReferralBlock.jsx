import { useState, useEffect } from 'react'

const PROVIDER_TYPE_LABELS = {
  physio:  'Physiotherapy',
  chiro:   'Chiropractic',
  massage: 'Massage therapy',
  urgent:  'Urgent / emergency care',
  none:    'None',
}

/* ── Provider attribute reasons ─────────────────────────── */
function providerPros(provider) {
  const pros = []
  if (provider.recommended)         pros.push('AI-ranked #1 match for your condition and location')
  if (provider.accepts_direct_bill) pros.push('Accepts direct billing, no out-of-pocket paperwork')
  if (provider.languages?.length > 1)
    pros.push(`Multilingual staff (${provider.languages.join(', ')})`)
  if (provider.phone)               pros.push('Phone contact available for easy booking')
  return pros
}

function providerCautions(provider) {
  const cautions = []
  if (!provider.accepts_direct_bill)
    cautions.push('Does not direct-bill. You pay upfront and submit a claim.')
  if (!provider.recommended)
    cautions.push('Not the top-ranked match. Consider comparing with the recommended provider.')
  return cautions
}

const PROVIDER_PHOTOS = [
  '/providers/provider-1.png',
  '/providers/provider-2.png',
  '/providers/provider-3.png',
  '/providers/provider-4.png',
  '/providers/provider-5.png',
  '/providers/provider-6.png',
]

/* ── Provider card (portrait grid style) ───────────────── */
function ProviderCard({ provider, index, expanded, onToggle }) {
  const pros     = providerPros(provider)
  const cautions = providerCautions(provider)
  const photo    = PROVIDER_PHOTOS[index % PROVIDER_PHOTOS.length]

  return (
    <div
      className={`rounded-2xl border-2 transition-all overflow-hidden flex flex-col
        ${provider.recommended
          ? 'border-orange-300 bg-orange-50/40 shadow-md'
          : 'border-gray-200 bg-white shadow-sm'}`}
    >
      {/* Photo + identity — always visible */}
      <div className="flex flex-col items-center pt-6 pb-4 px-4 text-center">
        {/* Avatar with recommended star */}
        <div className="relative mb-3">
          <img
            src={photo}
            alt={provider.name}
            className={`w-20 h-20 rounded-full object-cover border-4
              ${provider.recommended ? 'border-orange-400' : 'border-gray-200'}`}
          />
          {provider.recommended && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold shadow">
              ★
            </span>
          )}
        </div>

        <p className="text-sm font-bold text-gray-900 leading-snug">{provider.name}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{provider.clinic}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-tight">
          {provider.address}{provider.postal_code ? `, ${provider.postal_code}` : ''}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-2">
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
      </div>

      {/* Toggle details button */}
      <button
        type="button"
        onClick={onToggle}
        className={`mx-4 mb-4 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5
          ${provider.recommended
            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        {expanded ? 'Hide details' : 'View details'}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pt-4 pb-5 space-y-4">

          {/* Contact */}
          <div className="flex flex-wrap gap-3">
            {provider.phone && (
              <a href={`tel:${provider.phone}`}
                className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:underline">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                </svg>
                {provider.phone}
              </a>
            )}
            {provider.languages?.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-gray-400 font-medium">Lang:</span>
                {provider.languages.map(l => (
                  <span key={l} className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">{l}</span>
                ))}
              </div>
            )}
          </div>

          {/* Pros */}
          {pros.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1.5">Why consider</p>
              <ul className="space-y-1">
                {pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
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
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1.5">Keep in mind</p>
              <ul className="space-y-1">
                {cautions.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="text-amber-500 font-bold flex-none mt-0.5">·</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
  const [expandedId,       setExpandedId]       = useState(null)

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
                <span className="text-xs text-gray-400 font-normal">tap View details on any card</span>
              </p>

              {loadingProviders ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                  <span className="animate-spin w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full inline-block"/>
                  Loading providers…
                </div>
              ) : providers.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">No providers listed yet. Check your local directory.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {providers.map((provider, idx) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      index={idx}
                      expanded={expandedId === provider.id}
                      onToggle={() => setExpandedId(prev => prev === provider.id ? null : provider.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Coverage ───────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <span className="inline-flex w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 text-xs font-extrabold items-center justify-center">$</span>
                <p className="text-sm font-bold text-gray-700">Coverage</p>
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

                <p className="text-xs text-gray-400">Final coverage is determined by your insurer.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
