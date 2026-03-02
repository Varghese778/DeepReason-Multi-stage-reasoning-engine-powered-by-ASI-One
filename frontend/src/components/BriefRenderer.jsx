import { useState, useEffect } from 'react'
import { useChallenge } from '../hooks/useChallenge'
import ConfidenceBar from './ConfidenceBar'
import ChallengeInput from './ChallengeInput'

function SectionCard({ title, sessionId, sectionName, currentSectionJson, children, submitChallenge, isChallengingSection, hideChallenge }) {
  const [showChallenge, setShowChallenge] = useState(false)

  return (
    <div
      className="rounded-lg overflow-hidden transition-colors"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        transition: 'background-color 0.3s, border-color 0.3s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <h3
          className="font-bold uppercase"
          style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--accent-light)' }}
        >
          {title}
        </h3>
        {!hideChallenge && (
          <button
            onClick={() => setShowChallenge((v) => !v)}
            className="text-xs rounded px-2 py-0.5 transition-colors"
            style={{
              color: 'var(--pill-text)',
              border: '1px solid var(--border-primary)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)' }}
          >
            {showChallenge ? 'Cancel' : 'Challenge this'}
          </button>
        )}
      </div>
      <div className="p-4">
        {children}
        {showChallenge && (
          <ChallengeInput
            sectionName={sectionName}
            sessionId={sessionId}
            currentSectionJson={currentSectionJson}
            submitChallenge={submitChallenge}
            isChallengingSection={isChallengingSection}
            onCancel={() => setShowChallenge(false)}
          />
        )}
      </div>
    </div>
  )
}

export default function BriefRenderer({ brief, sessionId }) {
  const [liveBrief, setLiveBrief] = useState(brief)

  useEffect(() => {
    setLiveBrief(brief)
  }, [brief])

  const { submitChallenge, isChallengingSection, challengeError } = useChallenge(setLiveBrief)

  if (!liveBrief) return null

  return (
    <div className="flex flex-col gap-4">
      {liveBrief.coverage_gaps?.length > 0 && (
        <div
          className="rounded-md p-3 text-sm"
          style={{
            backgroundColor: 'rgba(127,96,0,0.15)',
            border: '1px solid rgba(127,96,0,0.4)',
            color: '#FFD54F',
          }}
        >
          ⚠ Coverage gaps: some angles could not be fully researched:{' '}
          <strong>{liveBrief.coverage_gaps.join(', ')}</strong>
        </div>
      )}

      {challengeError && (
        <div
          className="rounded-md p-3 text-sm"
          style={{
            backgroundColor: 'rgba(131,60,0,0.15)',
            border: '1px solid rgba(131,60,0,0.4)',
            color: '#FF8A65',
          }}
        >
          Challenge error: {challengeError}
        </div>
      )}

      <div
        className="rounded-lg p-4"
        style={{
          background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))',
          borderLeft: '3px solid var(--accent)',
        }}
      >
        <h3
          className="font-bold uppercase mb-2"
          style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--accent-light)' }}
        >
          TL;DR
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{liveBrief.executive_summary}</p>
      </div>

      <SectionCard
        title="Key Findings"
        sessionId={sessionId}
        sectionName="key_findings"
        currentSectionJson={JSON.stringify(liveBrief.key_findings)}
        submitChallenge={submitChallenge}
        isChallengingSection={isChallengingSection}
      >
        <div className="flex flex-col gap-3">
          {liveBrief.key_findings.map((f, i) => (
            <div
              key={i}
              className="rounded-md p-3"
              style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--card-nested-bg)' }}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{f.finding}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {f.source_sq_ids.map((id) => (
                  <span
                    key={id}
                    className="text-xs rounded px-2 py-0.5"
                    style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-light)' }}
                  >
                    {id}
                  </span>
                ))}
              </div>
              <ConfidenceBar score={f.confidence} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Trade-offs"
        sessionId={sessionId}
        sectionName="trade_offs"
        currentSectionJson={JSON.stringify(liveBrief.trade_offs)}
        submitChallenge={submitChallenge}
        isChallengingSection={isChallengingSection}
      >
        <div className="flex flex-col gap-4">
          {liveBrief.trade_offs.map((t, i) => (
            <div key={i}>
              <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--accent-light)' }}>{t.option}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#66BB6A' }}>Pros</p>
                  <ul className="flex flex-col gap-1">
                    {t.pros.map((p, j) => (
                      <li key={j} className="text-xs flex gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex-shrink-0" style={{ color: '#66BB6A' }}>+</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#EF5350' }}>Cons</p>
                  <ul className="flex flex-col gap-1">
                    {t.cons.map((c, j) => (
                      <li key={j} className="text-xs flex gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex-shrink-0" style={{ color: '#EF5350' }}>-</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Recommendation"
        sessionId={sessionId}
        sectionName="recommendation"
        currentSectionJson={JSON.stringify(liveBrief.recommendation)}
        submitChallenge={submitChallenge}
        isChallengingSection={isChallengingSection}
      >
        <div
          className="rounded-md p-3 flex flex-col gap-2"
          style={{
            background: 'linear-gradient(135deg, rgba(55,86,35,0.25), rgba(55,86,35,0.1))',
            borderLeft: '3px solid #375623',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            <span className="font-bold" style={{ color: '#66BB6A' }}>Recommended: </span>
            {liveBrief.recommendation.primary}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--accent-light)' }}>Rationale: </span>
            {liveBrief.recommendation.rationale}
          </p>
          <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold not-italic" style={{ color: 'var(--accent-light)' }}>Conditions: </span>
            {liveBrief.recommendation.conditions}
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Open Questions"
        sessionId={sessionId}
        sectionName="open_questions"
        currentSectionJson={JSON.stringify(liveBrief.open_questions)}
        submitChallenge={submitChallenge}
        isChallengingSection={isChallengingSection}
      >
        <ol className="flex flex-col gap-2 list-decimal list-inside">
          {liveBrief.open_questions.map((q, i) => (
            <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{q}</li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard
        title="Confidence"
        sessionId={sessionId}
        sectionName="confidence_overview"
        currentSectionJson={JSON.stringify(liveBrief.confidence_overview)}
        submitChallenge={submitChallenge}
        isChallengingSection={isChallengingSection}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold w-16" style={{ color: 'var(--accent-light)' }}>Overall</span>
            <div className="flex-1">
              <ConfidenceBar score={liveBrief.confidence_overview.overall} />
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{liveBrief.confidence_overview.narrative}</p>
        </div>
      </SectionCard>
    </div>
  )
}
