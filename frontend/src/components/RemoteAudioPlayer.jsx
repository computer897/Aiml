import { useRef, useEffect } from 'react'

// ─── Remote Audio Player ─────────────────────────────────────────────────────
// Dedicated <audio> elements for each remote peer — guarantees audio playback
// Elements MUST be appended to the DOM for autoplay to work in all browsers.
function RemoteAudioPlayer({ remoteStreams }) {
  const audioRefs = useRef({})
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    Object.entries(remoteStreams).forEach(([socketId, { stream }]) => {
      if (!stream) return
      const audioTracks = stream.getAudioTracks()
      console.log(`[RemoteAudioPlayer] Peer ${socketId} — audio tracks:`, audioTracks.length, audioTracks.map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })))
      if (audioTracks.length === 0) return

      let audio = audioRefs.current[socketId]
      if (!audio) {
        audio = document.createElement('audio')
        audio.autoplay = true
        audio.playsInline = true
        // Append to DOM — required for autoplay in some browsers
        container.appendChild(audio)
        audioRefs.current[socketId] = audio
        console.log(`[RemoteAudioPlayer] Created <audio> element for peer ${socketId}`)
      }
      if (audio.srcObject !== stream) {
        audio.srcObject = stream
        audio.play().then(() => {
          console.log(`[RemoteAudioPlayer] Audio playing for peer ${socketId}`)
        }).catch(err => {
          console.warn(`[RemoteAudioPlayer] play() failed for peer ${socketId}:`, err)
        })
      }
    })

    // Cleanup removed peers
    Object.keys(audioRefs.current).forEach(socketId => {
      if (!remoteStreams[socketId]) {
        const audio = audioRefs.current[socketId]
        if (audio) {
          audio.srcObject = null
          audio.remove()
          console.log(`[RemoteAudioPlayer] Removed <audio> element for peer ${socketId}`)
        }
        delete audioRefs.current[socketId]
      }
    })
  }, [remoteStreams])

  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(a => { if (a) { a.srcObject = null; a.remove() } })
      audioRefs.current = {}
    }
  }, [])

  // Hidden container div so audio elements are in the DOM
  return <div ref={containerRef} style={{ display: 'none' }} />
}

export default RemoteAudioPlayer
