import { useState } from 'react'

export default function ChallengeInput({
  sectionName,
  sessionId,
  currentSectionJson,
  submitChallenge,
  isChallengingSection,
  onCancel,
}) {
  const [challengeText, setChallengeText] = useState('')

  const isThisLoading = isChallengingSection === sectionName
  const isOtherLoading = isChallengingSection !== null && !isThisLoading

  const handleSubmit = () => {
    if (!challengeText.trim() || isThisLoading) return
    submitChallenge({
      session_id: sessionId,
      section_name: sectionName,
      challenge_text: challengeText.trim(),
      current_section_json: currentSectionJson,
    })
  }

  return (
    <div
      className="mt-3 rounded-md p-3 flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--card-nested-bg)',
        border: '1px solid var(--border-primary)',
      }}
    >
      <textarea
        value={challengeText}
        onChange={(e) => setChallengeText(e.target.value)}
        maxLength={500}
        placeholder="Provide your objection, missing context, or counter-argument to this section..."
        className="w-full rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        style={{
          minHeight: '80px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-primary)',
        }}
        disabled={isThisLoading}
      />
      <span className="text-xs text-right" style={{ color: 'var(--text-faint)' }}>
        {challengeText.length}/500
      </span>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!challengeText.trim() || isThisLoading || isOtherLoading}
          className="btn-analyze flex-1 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isThisLoading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Re-analyzing...
            </>
          ) : (
            'Re-analyze this section'
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isThisLoading}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: 'var(--pill-text)',
            border: '1px solid var(--border-primary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
