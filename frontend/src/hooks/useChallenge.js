import { useState, useCallback } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export function useChallenge(onBriefUpdate) {
  const [isChallengingSection, setIsChallengingSection] = useState(null)
  const [challengeError, setChallengeError] = useState(null)
  const submitChallenge = useCallback(async (challengeInput) => {
    setIsChallengingSection(challengeInput.section_name)
    setChallengeError(null)
    let response
    try {
      response = await fetch(`${API_BASE}/api/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(challengeInput),
      })
    } catch (err) {
      setChallengeError(err.message || 'Network error')
      setIsChallengingSection(null)
      return
    }
    if (!response.ok) {
      setChallengeError('Challenge request failed')
      setIsChallengingSection(null)
      return
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          let event
          try {
            event = JSON.parse(line.slice(6))
          } catch {
            continue
          }
          const { event_type, payload } = event
          if (event_type === 'brief_ready') {
            try {
              onBriefUpdate(JSON.parse(payload))
            } catch {
              // ignore malformed brief
            }
          } else if (event_type === 'done') {
            setIsChallengingSection(null)
          } else if (event_type === 'error') {
            let message = payload
            try {
              message = JSON.parse(payload).error || payload
            } catch {
              // use raw payload
            }
            setChallengeError(message)
            setIsChallengingSection(null)
          }
        }
      }
    } catch (err) {
      setChallengeError(err.message || 'Stream read error')
      setIsChallengingSection(null)
    }
  }, [onBriefUpdate])
  const cancelChallenge = useCallback(() => {
    setIsChallengingSection(null)
    setChallengeError(null)
  }, [])
  return { isChallengingSection, challengeError, submitChallenge, cancelChallenge }
}