import { useState, useRef, useEffect } from 'react'

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`

const SYSTEM_PROMPT = `You are FlexBot, the friendly AI health assistant built into FlexCare — a musculoskeletal recovery platform. You help users with:
- Understanding their pain, symptoms, and musculoskeletal conditions
- Recovery plans, physiotherapy, chiropractic care, and massage therapy
- Exercise technique, form guidance, and rehab progressions
- Insurance and coverage questions (direct billing, session limits, out-of-pocket estimates)
- When to see a specialist vs. self-manage at home
- General wellness, stretching, strength, and mobility advice

Guidelines:
- Be concise, warm, and evidence-based. Use plain language, no jargon.
- If the user shares their assessment context, use it to personalise your answer.
- Never diagnose conditions. Always remind users to see a healthcare professional for serious concerns.
- Keep responses under 200 words unless the user explicitly asks for more detail.
- Use bullet points for lists of steps or tips.`

function getSessionContext() {
  try {
    const logs = JSON.parse(localStorage.getItem('flexcare_symptom_logs') || '[]')
    const latest = logs[0]
    if (!latest) return ''
    const regions = Object.entries(latest.regions || {})
      .map(([r, lv]) => `${r} (${lv}/10)`).join(', ')
    const why = latest.recommendation?.why_this_recommendation || ''
    return `\n\nUser context from their latest FlexCare assessment — pain regions: ${regions || 'none recorded'}. AI summary: "${why}".`
  } catch { return '' }
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function renderMarkdown(text) {
  const blocks = text.split(/\n{2,}/)
  return blocks.map((block, bi) => {
    const lines = block.split('\n')
    const isBullet = lines.every(l => /^[\*\-]\s+/.test(l.trim()) || l.trim() === '')
    const isNumbered = lines.every(l => /^\d+\.\s+/.test(l.trim()) || l.trim() === '')

    if (isBullet && lines.some(l => l.trim())) {
      return (
        <ul key={bi} className="list-disc list-outside pl-4 space-y-1 my-1">
          {lines.filter(l => l.trim()).map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^[\*\-]\s+/, ''))}</li>
          ))}
        </ul>
      )
    }
    if (isNumbered && lines.some(l => l.trim())) {
      return (
        <ol key={bi} className="list-decimal list-outside pl-4 space-y-1 my-1">
          {lines.filter(l => l.trim()).map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^\d+\.\s+/, ''))}</li>
          ))}
        </ol>
      )
    }
    return (
      <p key={bi} className="my-1">
        {lines.map((l, li) => (
          <span key={li}>{renderInline(l)}{li < lines.length - 1 && <br/>}</span>
        ))}
      </p>
    )
  })
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-none mr-2 mt-0.5 shadow-sm">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2v2h-2zm0-8h2v6h-2z"/>
          </svg>
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-indigo-600 text-white rounded-br-sm'
          : 'bg-gray-100 text-gray-800 rounded-bl-sm'
      }`}>
        {isUser ? msg.text : renderMarkdown(msg.text)}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-none mr-2 mt-0.5 shadow-sm">
        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2v2h-2zm0-8h2v6h-2z"/>
        </svg>
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
      </div>
    </div>
  )
}

const STARTERS = [
  'What exercises help lower back pain?',
  'How many physio sessions does insurance typically cover?',
  'When should I see a specialist vs. rest at home?',
  'How do I do a proper hip hinge?',
]

export default function FlexBot() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [hasNew, setHasNew]   = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    if (open) {
      setHasNew(false)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(overrideText) {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    const userMsg    = { role: 'user', text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const context  = getSessionContext()
      const systemText = SYSTEM_PROMPT + context

      const contents = newMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }))

      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents,
          generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
        }),
      })

      const data  = await res.json()
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        || (data.error?.message ? `Error: ${data.error.message}` : 'Sorry, I could not generate a response. Please try again.')

      setMessages(prev => [...prev, { role: 'model', text: reply }])
      if (!open) setHasNew(true)
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Something went wrong connecting to the AI. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* ── Chat panel ─────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]
                        flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100
                        overflow-hidden" style={{ height: '480px' }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 flex items-center gap-3 flex-none">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-none">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2v2h-2zm0-8h2v6h-2z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm leading-none">FlexBot</p>
              <p className="text-indigo-200 text-xs mt-0.5">AI Recovery Assistant</p>
            </div>
            <button onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 scroll-smooth">
            {messages.length === 0 && !loading && (
              <div className="space-y-4">
                <div className="flex justify-start mb-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-none mr-2 mt-0.5 shadow-sm">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2v2h-2zm0-8h2v6h-2z"/>
                    </svg>
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-gray-800 leading-relaxed max-w-[80%]">
                    Hi! I am FlexBot. Ask me anything about your recovery, exercises, insurance coverage, or when to see a specialist.
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {STARTERS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100
                                 border border-indigo-100 rounded-xl px-3 py-2 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => <Bubble key={i} msg={m}/>)}
            {loading && <TypingIndicator/>}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="flex-none border-t border-gray-100 px-3 py-3 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask FlexBot anything..."
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5
                         text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                         focus:ring-indigo-300 focus:border-transparent transition leading-snug
                         max-h-28 overflow-y-auto"
              style={{ lineHeight: '1.4' }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200
                         flex items-center justify-center transition-colors flex-none mb-0.5 shadow-sm">
              <svg className="w-4 h-4 text-white disabled:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
              </svg>
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-300 pb-2 flex-none">
            Not a substitute for professional medical advice
          </p>
        </div>
      )}

      {/* ── Toggle button ───────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-xl
                   bg-gradient-to-br from-indigo-600 to-violet-600 hover:scale-105
                   active:scale-95 transition-all flex items-center justify-center"
        aria-label="Open FlexBot chat"
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
          </svg>
        )}
        {hasNew && !open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"/>
        )}
      </button>
    </>
  )
}
