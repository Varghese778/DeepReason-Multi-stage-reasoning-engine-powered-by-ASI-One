import { useState, useEffect, useRef, useMemo } from 'react'

const STAGES = [
  { key: 'decompose', label: 'Decomposing', icon: '◈', match: (s) => s === '1' },
  {
    key: 'research',
    label: 'Researching',
    icon: '◎',
    match: (s) => s === '2' || s.startsWith('2A-') || s.startsWith('2B-'),
  },
  { key: 'synthesise', label: 'Synthesizing', icon: '⬡', match: (s) => s === '3' },
  { key: 'complete', label: 'Complete', icon: '✓', match: (s) => s === 'complete' },
]

function stageIndex(stage) {
  return STAGES.findIndex((s) => s.match(stage))
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function useTypewriter(text, speed = 30) {
  const [displayed, setDisplayed] = useState('')
  const prevTextRef = useRef('')

  useEffect(() => {
    if (text === prevTextRef.current) return
    prevTextRef.current = text
    setDisplayed('')
    if (!text) return
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return displayed
}

function getStatusText(stage, subQuestions) {
  if (stage === '1') {
    return 'Breaking your question into focused research angles...'
  }
  if (stage.startsWith('2A-')) {
    const sqId = stage.replace('2A-', '')
    const sq = subQuestions.find((q) => q.id === sqId)
    if (sq) {
      const truncated =
        sq.question.length > 60 ? sq.question.slice(0, 60) + '...' : sq.question
      return `Researching: ${truncated}`
    }
    return 'Researching sub-question...'
  }
  if (stage.startsWith('2B-')) {
    return 'Running self-critique on findings...'
  }
  if (stage === '2') {
    return 'Preparing research phase...'
  }
  if (stage === '3') {
    return 'Synthesizing all findings into a structured brief...'
  }
  if (stage === 'complete') {
    return 'Analysis complete.'
  }
  return ''
}

export default function ProgressTracker({ stage, subQuestions, research, isRunning }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    if (!isRunning) return
    startRef.current = Date.now()
    setElapsed(0)
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning])

  const activeIdx = stageIndex(stage)
  const isDone = stage === 'complete'
  const inResearch = stage === '2' || stage.startsWith('2A-') || stage.startsWith('2B-')

  const statusText = useMemo(
    () => getStatusText(stage, subQuestions),
    [stage, subQuestions],
  )
  const typedStatus = useTypewriter(statusText)

  return (
    <div
      className="rounded-xl p-8 mx-auto w-full flex flex-col items-center gap-8"
      style={{ backgroundColor: '#1E1E1E', maxWidth: 640 }}
    >
      <h3 className="text-white text-lg font-semibold">
        {isDone ? 'Analysis complete ✓' : 'Analyzing your question...'}
      </h3>

      <div className="flex items-center justify-center w-full gap-0">
        {STAGES.map((s, idx) => {
          const isActive = s.match(stage)
          const isComplete = activeIdx >= 0 && idx < activeIdx
          const lineBefore = idx > 0
          const prevComplete = activeIdx >= 0 && idx <= activeIdx

          return (
            <div key={s.key} className="flex items-center" style={{ flex: idx < STAGES.length - 1 ? 1 : 'none' }}>
              {lineBefore && (
                <div className="flex-1 h-0.5 relative overflow-hidden" style={{ minWidth: 32 }}>
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: '#333' }}
                  />
                  {prevComplete && (
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: '#2E75B6' }}
                    />
                  )}
                  {isActive && (
                    <div
                      className="absolute inset-0 progress-line-sweep"
                      style={{
                        background: 'linear-gradient(90deg, #2E75B6 0%, #2E75B6 50%, transparent 100%)',
                      }}
                    />
                  )}
                </div>
              )}

              <div className="flex flex-col items-center gap-2 relative" style={{ width: 60 }}>
                {isActive && !isDone && (
                  <div
                    className="absolute stage-pulse-ring rounded-full"
                    style={{
                      width: 52,
                      height: 52,
                      border: '2px solid #2E75B6',
                      top: -2,
                    }}
                  />
                )}
                <div
                  className="flex items-center justify-center rounded-full transition-all duration-300"
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: isComplete
                      ? '#1F4E79'
                      : isActive
                      ? '#2E75B6'
                      : '#333',
                    border: `2px solid ${
                      isComplete
                        ? '#1F4E79'
                        : isActive
                        ? '#2E75B6'
                        : '#444'
                    }`,
                    boxShadow: isActive && !isDone ? '0 0 20px rgba(46,117,182,0.4)' : 'none',
                  }}
                >
                  <span
                    className={`text-lg select-none ${
                      isActive && !isDone ? 'stage-icon-pulse' : ''
                    }`}
                    style={{
                      color: isComplete || isActive ? '#fff' : '#666',
                    }}
                  >
                    {isComplete ? '✓' : s.icon}
                  </span>
                </div>
                <span
                  className="text-xs font-medium whitespace-nowrap"
                  style={{
                    color: isActive
                      ? '#9DC3E6'
                      : isComplete
                      ? '#6B8AAE'
                      : '#555',
                  }}
                >
                  {s.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {subQuestions.length > 0 && (inResearch || isDone) && (
        <div className="flex items-center justify-center gap-2">
          {subQuestions.map((sq) => {
            const hasResearch = research[sq.id] !== undefined
            const isResearching =
              inResearch && (stage === `2A-${sq.id}` || stage === `2B-${sq.id}`)
            const isFailed = isDone && !hasResearch

            let bgColor = '#444'
            let className = ''
            if (isResearching) {
              bgColor = '#2E75B6'
              className = 'sq-dot-pulse'
            } else if (hasResearch) {
              bgColor = '#375623'
            } else if (isFailed) {
              bgColor = '#833C00'
            }

            return (
              <div
                key={sq.id}
                className={`rounded-full ${className}`}
                style={{ width: 8, height: 8, backgroundColor: bgColor }}
                title={sq.question || sq.id}
              />
            )
          })}
        </div>
      )}

      {isRunning && statusText && (
        <p
          className="text-sm font-mono text-center"
          style={{ color: '#888', minHeight: '1.25rem' }}
        >
          {typedStatus}
          <span className="typewriter-cursor">|</span>
        </p>
      )}

      <p className="text-xs self-end" style={{ color: '#555' }}>
        {formatElapsed(elapsed)} elapsed
      </p>
    </div>
  )
}
