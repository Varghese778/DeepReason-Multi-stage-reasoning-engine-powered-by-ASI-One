import { useState, useRef, useCallback } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const initialState = {
  sessionId: null,
  stage: '',
  isRunning: false,
  subQuestions: [],
  research: {},
  brief: null,
  thoughts: [],
  error: null,
}
export function usePipeline() {
  const [state, setState] = useState(initialState)
  const esRef = useRef(null)
  const tokenBufferRef = useRef([])
  const closeEventSource = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }, [])
  const startPipeline = useCallback(async (queryInput) => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setState({ ...initialState, isRunning: true })
    tokenBufferRef.current = []
    let sessionId
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryInput),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }))
        setState(s => ({ ...s, error: err.detail || 'Failed to start pipeline', isRunning: false }))
        return
      }
      const data = await res.json()
      sessionId = data.session_id
    } catch (err) {
      setState(s => ({ ...s, error: err.message || 'Network error', isRunning: false }))
      return
    }
    setState(s => ({ ...s, sessionId }))
    const es = new EventSource(`${API_BASE}/api/stream/${sessionId}`)
    esRef.current = es
    es.onmessage = (e) => {
      let event
      try {
        event = JSON.parse(e.data)
      } catch {
        return
      }
      const { event_type, stage, payload } = event
      switch (event_type) {
        case 'token':
          tokenBufferRef.current.push(payload)
          break
        case 'thought': {
          const record = { stage, thought: payload, timestamp_ms: event.timestamp_ms }
          setState(s => ({ ...s, stage, thoughts: [...s.thoughts, record] }))
          break
        }
        case 'stage_start':
          setState(s => ({ ...s, stage }))
          break
        case 'stage_complete': {
          try {
            const parsed = JSON.parse(payload)
            if (stage === '1') {
              setState(s => ({ ...s, subQuestions: Array.isArray(parsed) ? parsed : [] }))
            } else if (stage.startsWith('2A-')) {
              const sqId = stage.slice(3)
              setState(s => ({ ...s, research: { ...s.research, [sqId]: parsed } }))
            } else if (stage.startsWith('2B-')) {
              const sqId = stage.slice(3)
              setState(s => ({
                ...s,
                research: {
                  ...s.research,
                  [sqId]: { ...(s.research[sqId] || {}), critique: parsed },
                },
              }))
            }
          } catch {
            // non-JSON or unrecognised stage, ignore
          }
          break
        }
        case 'brief_ready': {
          try {
            const brief = JSON.parse(payload)
            setState(s => ({ ...s, brief }))
          } catch {
            // ignore malformed
          }
          break
        }
        case 'done':
          setState(s => ({ ...s, isRunning: false, stage: 'complete' }))
          if (esRef.current) {
            esRef.current.close()
            esRef.current = null
          }
          break
        case 'error': {
          let message = payload
          try {
            const parsed = JSON.parse(payload)
            message = parsed.error || payload
          } catch {
            // use raw payload
          }
          setState(s => ({ ...s, error: message, isRunning: false }))
          if (esRef.current) {
            esRef.current.close()
            esRef.current = null
          }
          break
        }
        default:
          break
      }
    }
    es.onerror = () => {
      setState(s => ({
        ...s,
        error: s.error || 'Connection lost. Please try again.',
        isRunning: false,
      }))
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [])
  const reset = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    tokenBufferRef.current = []
    setState(initialState)
  }, [])
  return { ...state, startPipeline, reset }
}