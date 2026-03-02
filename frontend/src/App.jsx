import { useState, useRef, useEffect } from 'react'
import { usePipeline } from './hooks/usePipeline'
import { useThemeToggle } from './hooks/useTheme'
import ReasoningStages from './components/ReasoningStages'
import BriefRenderer from './components/BriefRenderer'
import LandingPage from './components/LandingPage'
import BackgroundDoodles from './components/BackgroundDoodles'
import { briefToMarkdown, copyToClipboard } from './utils/export'

const DOMAINS = [
  { label: 'Startup', value: 'startup' },
  { label: 'Technical', value: 'tech' },
  { label: 'Research', value: 'research' },
  { label: 'General', value: 'general' },
]

const DEPTHS = [3, 5, 7]

const TAVILY_ENABLED = import.meta.env.VITE_TAVILY_ENABLED === 'true'

export default function App() {
  const {
    sessionId,
    stage,
    isRunning,
    brief,
    thoughts,
    error,
    startPipeline,
    reset,
  } = usePipeline()

  const { isDark, toggle: toggleTheme } = useThemeToggle()

  const [question, setQuestion] = useState('')
  const [domain, setDomain] = useState('general')
  const [depth, setDepth] = useState(3)
  const [webEnabled, setWebEnabled] = useState(false)
  const textareaRef = useRef(null)

  const showLanding = !isRunning && !brief && !error
  const showBrief = !isRunning && !!brief
  const showContent = isRunning || !!brief || !!error

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!question.trim() || isRunning) return
    startPipeline({ question: question.trim(), domain, depth, web_enabled: webEnabled })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExampleClick = (q) => {
    setQuestion(q)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleNewAnalysis = () => {
    reset()
    setQuestion('')
  }

  const handleCopy = () => {
    if (!brief) return
    const md = briefToMarkdown(brief, { question, domain, depth })
    copyToClipboard(md)
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [question])

  /* ── The input form (reused in landing + fixed bar) ── */
  const inputForm = (
    <form onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a complex question..."
        disabled={isRunning}
        rows={1}
        style={{
          width: '100%',
          minHeight: 52,
          maxHeight: 200,
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--text-heading)',
          fontSize: '0.9375rem',
          resize: 'none',
          outline: 'none',
          lineHeight: 1.5,
          fontFamily: 'inherit',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {/* Domain selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label
              htmlFor="domain-select"
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}
            >
              Domain
            </label>
            <select
              id="domain-select"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="config-select"
            >
              {DOMAINS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Depth selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label
              htmlFor="depth-select"
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}
            >
              Depth
            </label>
            <select
              id="depth-select"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="config-select"
            >
              {DEPTHS.map((d) => (
                <option key={d} value={d}>
                  {d} {d === 3 ? '(Quick)' : d === 5 ? '(Balanced)' : '(Deep)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {TAVILY_ENABLED && (
            <button
              type="button"
              onClick={() => setWebEnabled((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                opacity: webEnabled ? 1 : 0.3,
                transition: 'opacity 0.15s',
                padding: 4,
              }}
              title={webEnabled ? 'Web search on' : 'Web search off'}
            >
              🌐
            </button>
          )}

          <button
            type={isRunning ? 'button' : 'submit'}
            onClick={isRunning ? reset : undefined}
            disabled={!isRunning && !question.trim()}
            className="send-btn"
            style={{
              backgroundColor:
                !isRunning && !question.trim()
                  ? 'var(--border-primary)'
                  : 'var(--accent)',
              cursor:
                !isRunning && !question.trim()
                  ? 'default'
                  : 'pointer',
            }}
          >
            {isRunning ? '■' : '→'}
          </button>
        </div>
      </div>
    </form>
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background-color 0.3s',
      }}
    >
      <BackgroundDoodles />

      {/* ── Header ── */}
      <header
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
          borderBottom: '1px solid var(--header-border)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span style={{ color: 'var(--text-heading)', fontWeight: 600, fontSize: '1rem' }}>
          DeepReason
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            DR
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: showLanding ? 40 : 140,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 20px' }}>
          {showLanding && (
            <LandingPage onExampleClick={handleExampleClick}>
              {inputForm}
            </LandingPage>
          )}

          {showContent && (
            <div style={{ paddingTop: 32 }}>
              <ReasoningStages
                thoughts={thoughts}
                stage={stage}
                isRunning={isRunning}
              />

              {error && !isRunning && (
                <div
                  style={{
                    backgroundColor: 'rgba(131,60,0,0.15)',
                    border: '1px solid rgba(131,60,0,0.4)',
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 24,
                  }}
                >
                  <p
                    style={{
                      color: '#FF8A65',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      margin: '0 0 8px',
                    }}
                  >
                    Pipeline error
                  </p>
                  <p
                    style={{
                      color: '#FFAB91',
                      fontSize: '0.875rem',
                      margin: 0,
                    }}
                  >
                    {error}
                  </p>
                </div>
              )}

              {showBrief && (
                <div style={{ marginTop: 24 }}>
                  <BriefRenderer brief={brief} sessionId={sessionId} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Fixed bottom bar (only when running or brief shown) ── */}
      {!showLanding && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-primary)',
            borderTop: '1px solid var(--header-border)',
            padding: '16px 0 24px',
            zIndex: 100,
            transition: 'background-color 0.3s',
          }}
        >
          <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 20px' }}>
            {showBrief ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleNewAnalysis}
                  className="new-analysis-btn"
                  style={{ flex: 1 }}
                >
                  New analysis
                </button>
                <button onClick={handleCopy} className="copy-md-btn">
                  Copy MD
                </button>
              </div>
            ) : (
              inputForm
            )}
          </div>
        </div>
      )}
    </div>
  )
}
