import { useState, useEffect, useRef, useMemo } from 'react'

// ─── Active Speaker Detection Hook ───────────────────────────────────────────
// Detects the participant with the highest audio level and returns their ID
function useActiveSpeaker(participants) {
  const [activeSpeakerId, setActiveSpeakerId] = useState(null)
  const audioContextRef = useRef(null)
  const analyserRefs = useRef([])
  const timerRef = useRef(null)

  const participantSignature = useMemo(
    () => participants.map(participant => `${participant.id}:${participant.stream?.id || 'none'}`).join('|'),
    [participants]
  )

  useEffect(() => {
    const candidates = participants.filter(participant => participant.stream && participant.stream.getAudioTracks().length > 0)

    if (typeof window === 'undefined' || candidates.length === 0) {
      setActiveSpeakerId(null)
      return
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      setActiveSpeakerId(null)
      return
    }

    const audioContext = new AudioContextClass()
    audioContextRef.current = audioContext

    analyserRefs.current = candidates.map(participant => {
      const source = audioContext.createMediaStreamSource(participant.stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)

      return {
        participant,
        source,
        analyser,
        buffer: new Uint8Array(analyser.fftSize),
      }
    })

    const measure = () => {
      let bestId = null
      let bestLevel = 0

      analyserRefs.current.forEach(({ participant, analyser, buffer }) => {
        analyser.getByteTimeDomainData(buffer)

        let sum = 0
        for (let i = 0; i < buffer.length; i += 1) {
          const normalized = (buffer[i] - 128) / 128
          sum += normalized * normalized
        }

        const level = Math.sqrt(sum / buffer.length)
        if (level > bestLevel) {
          bestLevel = level
          bestId = participant.id
        }
      })

      setActiveSpeakerId(bestLevel >= 0.02 ? bestId : null)
      timerRef.current = window.setTimeout(measure, 250)
    }

    audioContext.resume?.().catch(() => {})
    measure()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      analyserRefs.current.forEach(({ source, analyser }) => {
        try { source.disconnect() } catch { /* ignore */ }
        try { analyser.disconnect() } catch { /* ignore */ }
      })
      analyserRefs.current = []

      if (audioContextRef.current) {
        audioContextRef.current.close?.().catch(() => {})
        audioContextRef.current = null
      }
    }
  }, [participantSignature])

  return activeSpeakerId
}

export { useActiveSpeaker }
