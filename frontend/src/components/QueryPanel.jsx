import { useState } from 'react'

const DOMAINS = [
  { label: 'Startup Strategy', value: 'startup' },
  { label: 'Technical', value: 'tech' },
  { label: 'Research', value: 'research' },
  { label: 'General', value: 'general' },
]

const DEPTHS = [
  { label: 'Standard (3)', value: 3 },
  { label: 'Deep (5)', value: 5 },
  { label: 'Expert (7)', value: 7 },
]

const TAVILY_ENABLED = import.meta.env.VITE_TAVILY_ENABLED === 'true'

export default function QueryPanel({ onSubmit, isRunning, defaultQuestion = '' }) {
  const [question, setQuestion] = useState(defaultQuestion)
  const [domain, setDomain] = useState('general')
  const [depth, setDepth] = useState(3)
  const [webEnabled, setWebEnabled] = useState(false)

  const charCount = question.length
  const charColour =
    charCount > 950
      ? 'text-red-400'
      : charCount > 800
      ? 'text-amber-400'
      : ''

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!question.trim() || isRunning) return
    onSubmit({ question: question.trim(), domain, depth, web_enabled: webEnabled })
  }

  const labelClass = 'uppercase tracking-widest font-semibold'
  const labelStyle = { fontSize: '0.7rem', letterSpacing: '0.08em', color: '#9DC3E6' }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <div className="flex flex-col gap-1">
        <label className={labelClass} style={labelStyle}>Question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={1000}
          placeholder="Ask a complex question that deserves deep, structured reasoning..."
          className="w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-mid-blue resize-y"
          style={{
            minHeight: '120px',
            backgroundColor: '#0F1B2D',
            border: '1px solid rgba(46,117,182,0.3)',
            color: '#E8EFF7',
          }}
        />
        <span className={`text-xs text-right ${charColour}`} style={charColour ? {} : { color: '#4A5A6A' }}>
          {charCount}/1000
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} style={labelStyle}>Domain</label>
        <div className="flex flex-wrap gap-2">
          {DOMAINS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDomain(d.value)}
              className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
              style={
                domain === d.value
                  ? { backgroundColor: '#2E75B6', color: '#fff' }
                  : { backgroundColor: 'rgba(46,117,182,0.1)', color: '#9DC3E6', border: '1px solid rgba(46,117,182,0.25)' }
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} style={labelStyle}>Reasoning Depth</label>
        <div className="flex gap-2">
          {DEPTHS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDepth(d.value)}
              className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
              style={
                depth === d.value
                  ? { backgroundColor: '#2E75B6', color: '#fff' }
                  : { backgroundColor: 'rgba(46,117,182,0.1)', color: '#9DC3E6', border: '1px solid rgba(46,117,182,0.25)' }
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={labelClass} style={labelStyle}>Web Search</span>
        {TAVILY_ENABLED ? (
          <button
            type="button"
            onClick={() => setWebEnabled((v) => !v)}
            className="relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none"
            style={{ backgroundColor: webEnabled ? '#2E75B6' : '#2A3F55' }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                webEnabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        ) : (
          <span className="text-xs" style={{ color: '#4A5A6A' }}>(unavailable)</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isRunning || !question.trim()}
        className={`btn-analyze w-full py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed ${
          isRunning ? 'is-running' : ''
        }`}
      >
        {isRunning ? 'Analyzing...' : 'Analyze'}
      </button>
    </form>
  )
}
