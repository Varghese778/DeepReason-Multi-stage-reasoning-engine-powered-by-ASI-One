const EXAMPLE_QUESTIONS = [
  'Should we raise a seed round or stay bootstrapped?',
  'Build vs buy vs partner for our auth system?',
  'Launch in India or Southeast Asia first?',
  'Monthly subscription or usage-based pricing?',
]

const CAPABILITIES = [
  {
    icon: '🔍',
    title: 'Multi-Stage Reasoning',
    description:
      'Decomposes complex questions into structured sub-questions, researches each independently, then synthesises into a decision brief.',
  },
  {
    icon: '🧠',
    title: 'Visible Thinking',
    description:
      'Every reasoning step is captured and displayed. See exactly how ASI:One thinks through your problem, not just the final answer.',
  },
  {
    icon: '⚡',
    title: 'Challenge & Refine',
    description:
      'Disagree with any finding? Challenge it. The system re-reasons that section with your objection without restarting from scratch.',
  },
]

export default function LandingPage({ onExampleClick, children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: 'calc(100vh - 52px - 40px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 40,
          padding: '48px 24px',
          width: '100%',
          maxWidth: 720,
        }}
      >
        {/* ── Hero ── */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '3.5rem',
              fontWeight: 700,
              lineHeight: 1.1,
              margin: '0 0 12px',
              background: 'linear-gradient(135deg, #2E75B6, #9DC3E6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            DeepReason
          </h1>
          <p
            style={{
              fontSize: '1.2rem',
              fontWeight: 300,
              color: 'var(--text-heading)',
              margin: '0 0 16px',
            }}
          >
            Ask once. Reason deeply. Decide confidently.
          </p>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 14px',
              borderRadius: 9999,
              border: '1px solid var(--accent)',
              color: 'var(--accent-light)',
              fontSize: '0.75rem',
            }}
          >
            ⚡ Powered by ASI:One
          </span>
        </div>

        {/* ── Capability cards ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            width: '100%',
          }}
        >
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              style={{
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                transition: 'background-color 0.3s, border-color 0.3s',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{cap.icon}</span>
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-heading)',
                  margin: 0,
                }}
              >
                {cap.title}
              </h3>
              <p
                style={{
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  color: 'var(--text-muted)',
                  margin: 0,
                }}
              >
                {cap.description}
              </p>
            </div>
          ))}
        </div>

        {/* ── Example questions ── */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <span
            style={{
              display: 'block',
              fontSize: '0.75rem',
              color: 'var(--text-faint)',
              marginBottom: 12,
            }}
          >
            Try one of these:
          </span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onExampleClick(q)}
                className="example-pill"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* ── Embedded input form ── */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 16,
            padding: '16px 20px',
            transition: 'background-color 0.3s, border-color 0.3s',
          }}
        >
          {children}
        </div>

        {/* ── Footer note ── */}
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-faint)',
            margin: 0,
          }}
        >
          Analyzes in 30–90 seconds depending on reasoning depth selected
        </p>
      </div>
    </div>
  )
}