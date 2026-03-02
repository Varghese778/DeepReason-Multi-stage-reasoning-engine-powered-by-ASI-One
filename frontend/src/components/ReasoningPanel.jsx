import { useState, useEffect, useRef } from 'react'

function getStageLabel(stage) {
  if (stage === '1') return 'Decomposition'
  if (stage === '3') return 'Synthesis'
  if (stage === '4') return 'Challenge Re-reasoning'
  if (stage === 'complete') return 'Complete'
  if (stage.startsWith('2A-')) {
    const id = stage.replace('2A-', '')
    return `Research · Branch ${id}`
  }
  if (stage.startsWith('2B-')) {
    const id = stage.replace('2B-', '')
    return `Self-Critique · Branch ${id}`
  }
  return `Stage ${stage}`
}

function getStageColor(stage) {
  if (stage.startsWith('2B-') || stage === '4') return '#6B4FA8'
  if (stage.startsWith('2A-') || stage === '2') return '#2E75B6'
  return '#375623'
}

function cleanRaw(thought) {
  if (typeof thought !== 'string') return ''
  let raw = thought
  raw = raw.replace(/^Response summary:\s*/i, '')
  raw = raw.replace(/```json|```/g, '').trim()
  raw = raw.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
  raw = raw.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
  return raw
}

function tryParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    /* continue */
  }

  const startIdx = raw.indexOf('{')
  if (startIdx === -1) return null

  let depth = 0
  let endIdx = -1
  for (let i = startIdx; i < raw.length; i++) {
    if (raw[i] === '{') depth++
    else if (raw[i] === '}') {
      depth--
      if (depth === 0) { endIdx = i; break }
    }
  }

  if (endIdx === -1) return null

  try {
    return JSON.parse(raw.slice(startIdx, endIdx + 1))
  } catch {
    return null
  }
}

function SectionLabel({ label }) {
  return (
    <span className="text-xs uppercase tracking-widest block mb-1" style={{ color: '#666' }}>
      {label}
    </span>
  )
}

function ConfBadge({ value }) {
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (isNaN(num)) return null
  let bg = '#375623'
  if (num <= 4) bg = '#833C00'
  else if (num <= 7) bg = '#7F6000'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: bg, color: '#fff' }}
    >
      {num}/10
    </span>
  )
}

function ThoughtBody({ raw, parsed }) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#ccc' }}>
        {raw}
      </p>
    )
  }

  const sections = []

  if (Array.isArray(parsed.sub_questions) && parsed.sub_questions.length > 0) {
    sections.push(
      <div key="sub-q" className="mb-3">
        <SectionLabel label="Sub-Questions" />
        <ul className="flex flex-col gap-2">
          {parsed.sub_questions.map((sq, i) => (
            <li key={i} className="text-sm rounded p-2" style={{ backgroundColor: 'rgba(46,117,182,0.10)' }}>
              <span className="text-xs font-mono mr-1.5" style={{ color: '#5B9BD5' }}>{sq.id || `sq${i + 1}`}</span>
              <span style={{ color: '#ddd' }}>{sq.question}</span>
              {Array.isArray(sq.domain_tags) && sq.domain_tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {sq.domain_tags.map((tag, j) => (
                    <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#2E75B633', color: '#9DC3E6' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {Array.isArray(sq.depends_on) && sq.depends_on.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: '#666' }}>depends on: {sq.depends_on.join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      </div>,
    )
  }

  if (parsed.reasoning_about_decomposition) {
    sections.push(
      <div key="decomp-reasoning" className="mb-3">
        <SectionLabel label="Decomposition Rationale" />
        <p className="text-sm italic" style={{ color: '#ccc' }}>{parsed.reasoning_about_decomposition}</p>
      </div>,
    )
  }

  if (parsed.answer) {
    sections.push(
      <div key="answer" className="mb-3">
        <SectionLabel label="Answer" />
        <p className="text-sm" style={{ color: '#ddd' }}>{parsed.answer}</p>
      </div>,
    )
  }

  if (Array.isArray(parsed.chain_of_thought) && parsed.chain_of_thought.length > 0) {
    sections.push(
      <div key="cot" className="mb-3">
        <SectionLabel label="Reasoning Steps" />
        <ol className="list-decimal list-inside flex flex-col gap-1">
          {parsed.chain_of_thought.map((step, i) => (
            <li key={i} className="text-sm" style={{ color: '#ccc' }}>{step}</li>
          ))}
        </ol>
      </div>,
    )
  }

  if (Array.isArray(parsed.top_3_uncertain_assumptions) && parsed.top_3_uncertain_assumptions.length > 0) {
    sections.push(
      <div key="uncertain" className="mb-3">
        <SectionLabel label="Uncertainties" />
        <ul className="flex flex-col gap-2">
          {parsed.top_3_uncertain_assumptions.map((item, i) => (
            <li key={i} className="text-sm">
              <span className="font-semibold" style={{ color: '#ddd' }}>
                {typeof item === 'string' ? item : item.assumption || JSON.stringify(item)}
              </span>
              {item.why_uncertain && (
                <p className="text-xs mt-0.5" style={{ color: '#666' }}>{item.why_uncertain}</p>
              )}
            </li>
          ))}
        </ul>
      </div>,
    )
  }

  if (parsed.confidence_raw != null) {
    sections.push(
      <div key="conf-raw" className="mb-3">
        <SectionLabel label="Initial Confidence" />
        <ConfBadge value={parsed.confidence_raw} />
      </div>,
    )
  }

  if (Array.isArray(parsed.logical_weaknesses) && parsed.logical_weaknesses.length > 0) {
    sections.push(
      <div key="weaknesses" className="mb-3">
        <SectionLabel label="Weaknesses" />
        <ul className="flex flex-col gap-1">
          {parsed.logical_weaknesses.map((w, i) => (
            <li key={i} className="text-sm" style={{ color: '#ccc' }}>
              <span className="text-red-400 mr-1">•</span>
              {typeof w === 'string' ? w : JSON.stringify(w)}
            </li>
          ))}
        </ul>
      </div>,
    )
  }

  if (Array.isArray(parsed.potential_biases) && parsed.potential_biases.length > 0) {
    sections.push(
      <div key="biases" className="mb-3">
        <SectionLabel label="Biases Identified" />
        <ul className="flex flex-col gap-1">
          {parsed.potential_biases.map((b, i) => (
            <li key={i} className="text-sm" style={{ color: '#ccc' }}>
              <span className="text-amber-400 mr-1">•</span>
              {typeof b === 'string' ? b : JSON.stringify(b)}
            </li>
          ))}
        </ul>
      </div>,
    )
  }

  if (parsed.evidence_that_would_change_answer) {
    sections.push(
      <div key="evidence" className="mb-3">
        <SectionLabel label="Evidence That Would Change Answer" />
        <p className="text-sm" style={{ color: '#ccc' }}>{parsed.evidence_that_would_change_answer}</p>
      </div>,
    )
  }

  if (parsed.critique_summary) {
    sections.push(
      <div key="critique" className="mb-3">
        <SectionLabel label="Critique Summary" />
        <p className="text-sm italic" style={{ color: '#ccc' }}>{parsed.critique_summary}</p>
      </div>,
    )
  }

  if (parsed.revised_confidence != null) {
    sections.push(
      <div key="conf-rev" className="mb-3">
        <SectionLabel label="Revised Confidence" />
        <ConfBadge value={parsed.revised_confidence} />
      </div>,
    )
  }

  if (parsed.executive_summary) {
    sections.push(
      <div key="summary" className="mb-3">
        <SectionLabel label="Summary" />
        <p className="text-sm" style={{ color: '#ddd' }}>{parsed.executive_summary}</p>
      </div>,
    )
  }

  if (Array.isArray(parsed.key_findings) && parsed.key_findings.length > 0) {
    sections.push(
      <div key="findings" className="mb-3">
        <SectionLabel label="Key Findings" />
        <ul className="flex flex-col gap-1">
          {parsed.key_findings.map((f, i) => {
            const text = typeof f === 'string' ? f : f.finding || JSON.stringify(f)
            const conf = typeof f === 'object' && f.confidence != null ? f.confidence : null
            return (
              <li key={i} className="text-sm" style={{ color: '#ccc' }}>
                • {text}
                {conf != null && <ConfBadge value={conf} />}
              </li>
            )
          })}
        </ul>
      </div>,
    )
  }

  if (Array.isArray(parsed.trade_offs) && parsed.trade_offs.length > 0) {
    sections.push(
      <div key="tradeoffs" className="mb-3">
        <SectionLabel label="Trade-offs" />
        <ul className="flex flex-col gap-2">
          {parsed.trade_offs.map((t, i) => (
            <li key={i} className="text-sm rounded p-2" style={{ backgroundColor: 'rgba(46,117,182,0.08)' }}>
              <span className="font-semibold" style={{ color: '#ddd' }}>{t.option}</span>
              {Array.isArray(t.pros) && t.pros.length > 0 && (
                <ul className="mt-1">
                  {t.pros.map((p, j) => (
                    <li key={j} className="text-xs text-green-400">+ {p}</li>
                  ))}
                </ul>
              )}
              {Array.isArray(t.cons) && t.cons.length > 0 && (
                <ul className="mt-0.5">
                  {t.cons.map((c, j) => (
                    <li key={j} className="text-xs text-red-400">− {c}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>,
    )
  }

  if (parsed.recommendation) {
    const rec = typeof parsed.recommendation === 'string'
      ? parsed.recommendation
      : parsed.recommendation.primary || JSON.stringify(parsed.recommendation)
    const rationale = typeof parsed.recommendation === 'object' ? parsed.recommendation.rationale : null
    const conditions = typeof parsed.recommendation === 'object' ? parsed.recommendation.conditions : null
    sections.push(
      <div key="rec" className="mb-3">
        <SectionLabel label="Recommendation" />
        <p className="text-sm font-bold text-green-300">{rec}</p>
        {rationale && <p className="text-xs mt-1" style={{ color: '#888' }}>{rationale}</p>}
        {conditions && <p className="text-xs mt-0.5" style={{ color: '#666' }}>Conditions: {conditions}</p>}
      </div>,
    )
  }

  if (parsed.confidence_overview) {
    const co = parsed.confidence_overview
    sections.push(
      <div key="conf-overview" className="mb-3">
        <SectionLabel label="Overall Confidence" />
        <div className="flex items-center gap-2">
          {co.overall != null && <ConfBadge value={co.overall} />}
          {co.narrative && <span className="text-xs" style={{ color: '#888' }}>{co.narrative}</span>}
        </div>
      </div>,
    )
  }

  if (Array.isArray(parsed.open_questions) && parsed.open_questions.length > 0) {
    sections.push(
      <div key="open-q" className="mb-3">
        <SectionLabel label="Open Questions" />
        <ul className="flex flex-col gap-1">
          {parsed.open_questions.map((q, i) => (
            <li key={i} className="text-sm" style={{ color: '#ccc' }}>
              <span className="text-cyan-400 mr-1">?</span>
              {typeof q === 'string' ? q : JSON.stringify(q)}
            </li>
          ))}
        </ul>
      </div>,
    )
  }

  if (Array.isArray(parsed.coverage_gaps) && parsed.coverage_gaps.length > 0) {
    sections.push(
      <div key="gaps" className="mb-3">
        <SectionLabel label="Coverage Gaps" />
        <ul className="flex flex-col gap-1">
          {parsed.coverage_gaps.map((g, i) => (
            <li key={i} className="text-sm text-amber-300">
              <span className="mr-1">⚠</span>
              {typeof g === 'string' ? g : JSON.stringify(g)}
            </li>
          ))}
        </ul>
      </div>,
    )
  }

  if (parsed.challenge_response) {
    sections.push(
      <div key="challenge-resp" className="mb-3">
        <SectionLabel label="Challenge Response" />
        <p className="text-sm" style={{ color: '#ddd' }}>{parsed.challenge_response}</p>
      </div>,
    )
  }

  if (sections.length === 0) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#ccc' }}>
        {raw}
      </p>
    )
  }

  return <div>{sections}</div>
}

function formatTime(timestamp_ms) {
  const d = new Date(timestamp_ms)
  return d.toTimeString().slice(0, 8)
}

function ThoughtCard({ record, isExpanded, onToggle }) {
  const stageColor = getStageColor(record.stage)
  const stageLabel = getStageLabel(record.stage)
  const contentRef = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [isExpanded, record.thought])

  const raw = cleanRaw(record.thought)
  const parsed = tryParse(raw)

  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: '#1E1E1E',
        borderLeft: `3px solid ${stageColor}`,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
        style={{ backgroundColor: 'rgba(30,30,30,0.8)' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(40,40,40,0.8)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(30,30,30,0.8)' }}
      >
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: stageColor + '33', color: stageColor, border: `1px solid ${stageColor}55` }}
        >
          {stageLabel}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs font-mono" style={{ color: '#555' }}>
            {formatTime(record.timestamp_ms)}
          </span>
          <span className="text-xs" style={{ color: '#555' }}>
            {isExpanded ? '▾' : '▸'}
          </span>
        </div>
      </button>

      <div
        className="thought-expand-wrapper"
        style={{
          height: isExpanded ? Math.min(height, 400) : 0,
          overflowY: isExpanded && height > 400 ? 'auto' : 'hidden',
        }}
      >
        <div ref={contentRef} className="px-4 py-3">
          <ThoughtBody raw={raw} parsed={parsed} />
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 pt-12">
      <div className="flex items-center gap-1.5">
        <span className="typing-dot" style={{ animationDelay: '0s' }} />
        <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
        <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
      </div>
      <p className="text-xs" style={{ color: '#555' }}>Waiting for reasoning...</p>
    </div>
  )
}

export default function ReasoningPanel({ thoughts, isRunning }) {
  const [expandedIdx, setExpandedIdx] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (thoughts.length > 0) {
      setExpandedIdx(thoughts.length - 1)
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight
        }
      })
    }
  }, [thoughts.length])

  const toggle = (idx) => {
    setExpandedIdx((prev) => (prev === idx ? null : idx))
  }

  return (
    <div className="flex flex-col" style={{ backgroundColor: 'transparent' }}>
      <div
        className="flex items-center justify-between px-1 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className={`text-base ${isRunning ? 'reasoning-brain-pulse' : ''}`}>🧠</span>
          <h3 className="text-sm font-semibold text-white">Reasoning Trace</h3>
        </div>
        {thoughts.length > 0 && (
          <span
            className="text-xs font-semibold rounded-full px-2 py-0.5"
            style={{ backgroundColor: '#2E75B6', color: '#fff' }}
          >
            {thoughts.length}
          </span>
        )}
      </div>

      <div ref={listRef} className="flex flex-col gap-2 pt-3">
        {thoughts.length === 0 ? (
          isRunning ? (
            <TypingIndicator />
          ) : (
            <p className="text-xs text-center mt-8" style={{ color: '#555' }}>
              No analysis run yet.
            </p>
          )
        ) : (
          thoughts.map((record, idx) => (
            <ThoughtCard
              key={idx}
              record={record}
              isExpanded={expandedIdx === idx}
              onToggle={() => toggle(idx)}
            />
          ))
        )}
      </div>
    </div>
  )
}
