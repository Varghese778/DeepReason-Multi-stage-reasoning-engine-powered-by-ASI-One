import { useState, useEffect, useRef, useMemo, useId } from 'react'

function getBranchNum(sqId) {
  const m = sqId.match(/\d+/)
  return m ? m[0] : sqId
}

function getStageLabel(stageId) {
  if (stageId === '1') return 'Decomposing question'
  if (stageId === '2') return 'Starting research'
  if (stageId === '3') return 'Synthesizing findings'
  if (stageId === '4') return 'Re-evaluating section'
  if (stageId === 'complete') return 'Complete'
  if (stageId.startsWith('2A-')) return `Researching Branch ${getBranchNum(stageId.slice(3))}`
  if (stageId.startsWith('2B-')) return `Critiquing Branch ${getBranchNum(stageId.slice(3))}`
  return 'Processing'
}

function DiamondIcon({ active }) {
  const id = useId()
  return (
    <div
      style={{
        width: 20,
        height: 20,
        flexShrink: 0,
        ...(active
          ? {
              animation: 'diamondSpin 2s linear infinite',
              filter: 'drop-shadow(0 0 6px #2E75B6)',
            }
          : {}),
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {active && (
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2E75B6" />
              <stop offset="100%" stopColor="#2ECDB6" />
            </linearGradient>
          </defs>
        )}
        <path
          d="M10 2L18 10L10 18L2 10Z"
          fill={active ? `url(#${id})` : '#2E75B6'}
        />
      </svg>
    </div>
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: bg,
        color: '#fff',
      }}
    >
      {num}/10
    </span>
  )
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
      if (depth === 0) {
        endIdx = i
        break
      }
    }
  }
  if (endIdx === -1) return null
  try {
    return JSON.parse(raw.slice(startIdx, endIdx + 1))
  } catch {
    return null
  }
}

function ThoughtContent({ thought }) {
  const raw = cleanRaw(thought)
  const parsed = tryParse(raw)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return raw ? (
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          lineHeight: 1.6,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}
      >
        {raw}
      </p>
    ) : null
  }

  const sections = []

  if (Array.isArray(parsed.sub_questions) && parsed.sub_questions.length > 0) {
    sections.push(
      <div key="sq" style={{ marginBottom: 12 }}>
        {parsed.sub_questions.map((sq, i) => (
          <div
            key={i}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              backgroundColor: 'var(--accent-bg)',
              marginBottom: 4,
            }}
          >
            <span
              style={{
                color: '#5B9BD5',
                fontSize: 11,
                fontFamily: 'monospace',
                marginRight: 6,
              }}
            >
              {sq.id || `sq${i + 1}`}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {sq.question}
            </span>
          </div>
        ))}
      </div>,
    )
  }

  if (parsed.reasoning_about_decomposition) {
    sections.push(
      <p
        key="decomp-r"
        style={{
          color: 'var(--text-faint)',
          fontSize: 13,
          fontStyle: 'italic',
          margin: '0 0 12px',
        }}
      >
        {parsed.reasoning_about_decomposition}
      </p>,
    )
  }

  if (parsed.answer) {
    sections.push(
      <p
        key="ans"
        style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          lineHeight: 1.6,
          margin: '0 0 12px',
        }}
      >
        {parsed.answer}
      </p>,
    )
  }

  if (
    Array.isArray(parsed.chain_of_thought) &&
    parsed.chain_of_thought.length > 0
  ) {
    sections.push(
      <ol
        key="cot"
        style={{
          margin: '0 0 12px',
          paddingLeft: 20,
          color: 'var(--text-muted)',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {parsed.chain_of_thought.map((step, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {step}
          </li>
        ))}
      </ol>,
    )
  }

  if (
    Array.isArray(parsed.top_3_uncertain_assumptions) &&
    parsed.top_3_uncertain_assumptions.length > 0
  ) {
    sections.push(
      <div key="uncertain" style={{ marginBottom: 12 }}>
        {parsed.top_3_uncertain_assumptions.map((item, i) => (
          <p
            key={i}
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              margin: '0 0 4px',
            }}
          >
            <span style={{ color: '#FFA726', marginRight: 6 }}>⚠</span>
            {typeof item === 'string'
              ? item
              : item.assumption || JSON.stringify(item)}
          </p>
        ))}
      </div>,
    )
  }

  if (parsed.confidence_raw != null) {
    sections.push(
      <div key="conf-raw" style={{ marginBottom: 12 }}>
        <ConfBadge value={parsed.confidence_raw} />
      </div>,
    )
  }

  if (
    Array.isArray(parsed.logical_weaknesses) &&
    parsed.logical_weaknesses.length > 0
  ) {
    sections.push(
      <div key="weak" style={{ marginBottom: 12 }}>
        <span
          style={{
            color: '#FF6B6B',
            fontSize: 12,
            fontWeight: 600,
            display: 'block',
            marginBottom: 4,
          }}
        >
          Weaknesses:
        </span>
        {parsed.logical_weaknesses.map((w, i) => (
          <p
            key={i}
            style={{
              color: '#FF6B6B',
              fontSize: 13,
              margin: '0 0 2px',
              paddingLeft: 12,
            }}
          >
            • {typeof w === 'string' ? w : JSON.stringify(w)}
          </p>
        ))}
      </div>,
    )
  }

  if (
    Array.isArray(parsed.potential_biases) &&
    parsed.potential_biases.length > 0
  ) {
    sections.push(
      <div key="biases" style={{ marginBottom: 12 }}>
        <span
          style={{
            color: '#FFA726',
            fontSize: 12,
            fontWeight: 600,
            display: 'block',
            marginBottom: 4,
          }}
        >
          Potential Biases:
        </span>
        {parsed.potential_biases.map((b, i) => (
          <p
            key={i}
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              margin: '0 0 2px',
              paddingLeft: 12,
            }}
          >
            • {typeof b === 'string' ? b : JSON.stringify(b)}
          </p>
        ))}
      </div>,
    )
  }

  if (parsed.evidence_that_would_change_answer) {
    sections.push(
      <p
        key="evidence"
        style={{
          color: 'var(--text-muted)',
          fontSize: 13,
          margin: '0 0 12px',
        }}
      >
        {parsed.evidence_that_would_change_answer}
      </p>,
    )
  }

  if (parsed.critique_summary) {
    sections.push(
      <p
        key="critique"
        style={{
          color: 'var(--text-faint)',
          fontSize: 13,
          fontStyle: 'italic',
          margin: '0 0 12px',
        }}
      >
        {parsed.critique_summary}
      </p>,
    )
  }

  if (parsed.revised_confidence != null) {
    sections.push(
      <div key="conf-rev" style={{ marginBottom: 12 }}>
        <ConfBadge value={parsed.revised_confidence} />
      </div>,
    )
  }

  if (parsed.executive_summary) {
    sections.push(
      <p
        key="summary"
        style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          lineHeight: 1.6,
          margin: '0 0 12px',
        }}
      >
        {parsed.executive_summary}
      </p>,
    )
  }

  if (Array.isArray(parsed.key_findings) && parsed.key_findings.length > 0) {
    sections.push(
      <div key="findings" style={{ marginBottom: 12 }}>
        {parsed.key_findings.map((f, i) => {
          const text =
            typeof f === 'string' ? f : f.finding || JSON.stringify(f)
          const conf =
            typeof f === 'object' && f.confidence != null ? f.confidence : null
          return (
            <p
              key={i}
              style={{
                color: 'var(--text-muted)',
                fontSize: 13,
                margin: '0 0 4px',
              }}
            >
              • {text} {conf != null && <ConfBadge value={conf} />}
            </p>
          )
        })}
      </div>,
    )
  }

  if (Array.isArray(parsed.trade_offs) && parsed.trade_offs.length > 0) {
    sections.push(
      <div key="tradeoffs" style={{ marginBottom: 12 }}>
        {parsed.trade_offs.map((t, i) => (
          <div key={i} style={{ marginBottom: 8, paddingLeft: 8 }}>
            <span
              style={{
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t.option}
            </span>
            {Array.isArray(t.pros) &&
              t.pros.map((p, j) => (
                <p
                  key={`p${j}`}
                  style={{
                    color: '#66BB6A',
                    fontSize: 12,
                    margin: '2px 0 0 12px',
                  }}
                >
                  + {p}
                </p>
              ))}
            {Array.isArray(t.cons) &&
              t.cons.map((c, j) => (
                <p
                  key={`c${j}`}
                  style={{
                    color: '#FF6B6B',
                    fontSize: 12,
                    margin: '2px 0 0 12px',
                  }}
                >
                  − {c}
                </p>
              ))}
          </div>
        ))}
      </div>,
    )
  }

  if (parsed.recommendation) {
    const rec =
      typeof parsed.recommendation === 'string'
        ? parsed.recommendation
        : parsed.recommendation.primary || JSON.stringify(parsed.recommendation)
    sections.push(
      <p
        key="rec"
        style={{
          color: '#66BB6A',
          fontSize: 13,
          fontWeight: 600,
          margin: '0 0 12px',
        }}
      >
        {rec}
      </p>,
    )
  }

  if (
    Array.isArray(parsed.open_questions) &&
    parsed.open_questions.length > 0
  ) {
    sections.push(
      <div key="open-q" style={{ marginBottom: 12 }}>
        {parsed.open_questions.map((q, i) => (
          <p
            key={i}
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              margin: '0 0 4px',
            }}
          >
            ? {typeof q === 'string' ? q : JSON.stringify(q)}
          </p>
        ))}
      </div>,
    )
  }

  if (Array.isArray(parsed.coverage_gaps) && parsed.coverage_gaps.length > 0) {
    sections.push(
      <div key="gaps" style={{ marginBottom: 12 }}>
        {parsed.coverage_gaps.map((g, i) => (
          <p
            key={i}
            style={{ color: '#FFA726', fontSize: 13, margin: '0 0 4px' }}
          >
            ⚠ {typeof g === 'string' ? g : JSON.stringify(g)}
          </p>
        ))}
      </div>,
    )
  }

  if (parsed.challenge_response) {
    sections.push(
      <p
        key="challenge"
        style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          margin: '0 0 12px',
        }}
      >
        {parsed.challenge_response}
      </p>,
    )
  }

  if (parsed.confidence_overview) {
    const co = parsed.confidence_overview
    sections.push(
      <div
        key="conf-overview"
        style={{
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {co.overall != null && <ConfBadge value={co.overall} />}
        {co.narrative && (
          <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>
            {co.narrative}
          </span>
        )}
      </div>,
    )
  }

  if (sections.length === 0) {
    return raw ? (
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: 13,
          lineHeight: 1.6,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}
      >
        {raw}
      </p>
    ) : null
  }

  return <div>{sections}</div>
}

function StageEntry({ stageId, thoughts, isActive, isExpanded, onToggle }) {
  const contentRef = useRef(null)
  const [height, setHeight] = useState(0)
  const label = getStageLabel(stageId)
  const hasContent = thoughts.length > 0

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [thoughts.length, isExpanded])

  return (
    <div className="stage-slide-in">
      <div
        role={hasContent ? 'button' : undefined}
        tabIndex={hasContent ? 0 : undefined}
        onClick={hasContent ? onToggle : undefined}
        onKeyDown={
          hasContent
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onToggle()
                }
              }
            : undefined
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderRadius: 12,
          cursor: hasContent ? 'pointer' : 'default',
          transition: 'background-color 0.15s',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          if (hasContent)
            e.currentTarget.style.backgroundColor = 'var(--hover-overlay)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <DiamondIcon active={isActive} />
        <span
          style={{
            flex: 1,
            marginLeft: 12,
            fontSize: 15,
            fontWeight: 400,
            color: isActive ? 'var(--text-heading)' : 'var(--text-faint)',
          }}
        >
          {label}
        </span>
        {hasContent && (
          <span
            style={{
              color: 'var(--text-faint)',
              fontSize: 12,
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
      </div>

      {hasContent && (
        <div
          style={{
            height: isExpanded ? height : 0,
            overflow: 'hidden',
            transition: 'height 0.25s ease-in-out',
          }}
        >
          <div ref={contentRef} style={{ padding: '8px 16px 16px 48px' }}>
            {thoughts.map((t, i) => (
              <ThoughtContent key={i} thought={t.thought} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReasoningStages({ thoughts, stage, isRunning }) {
  const [expandedStageId, setExpandedStageId] = useState(null)
  const prevStageRef = useRef('')

  const stageGroups = useMemo(() => {
    const groups = []
    const seen = {}
    for (const t of thoughts) {
      if (!seen[t.stage]) {
        seen[t.stage] = { stageId: t.stage, thoughts: [] }
        groups.push(seen[t.stage])
      }
      seen[t.stage].thoughts.push(t)
    }
    if (isRunning && stage && stage !== 'complete' && !seen[stage]) {
      groups.push({ stageId: stage, thoughts: [] })
    }
    return groups
  }, [thoughts, stage, isRunning])

  useEffect(() => {
    if (stage && stage !== prevStageRef.current && stage !== 'complete') {
      setExpandedStageId(stage)
      prevStageRef.current = stage
    }
  }, [stage])

  if (stageGroups.length === 0) {
    if (!isRunning) return null
    return (
      <div
        className="stage-slide-in"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
        }}
      >
        <DiamondIcon active={true} />
        <span
          style={{
            marginLeft: 12,
            fontSize: 15,
            color: 'var(--text-faint)',
          }}
        >
          Starting analysis...
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {stageGroups.map((entry) => (
        <StageEntry
          key={entry.stageId}
          stageId={entry.stageId}
          thoughts={entry.thoughts}
          isActive={isRunning && entry.stageId === stage}
          isExpanded={expandedStageId === entry.stageId}
          onToggle={() =>
            setExpandedStageId((prev) =>
              prev === entry.stageId ? null : entry.stageId,
            )
          }
        />
      ))}
    </div>
  )
}
