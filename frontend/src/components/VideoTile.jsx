import { memo, useRef, useEffect } from 'react'
import { MicOff } from 'lucide-react'

// ─── Video Tile (Reusable) ───────────────────────────────────────────────────
const VideoTile = memo(function VideoTile({ stream, name, role, isLocal, videoOn, size = 'normal', micOn, mirror = isLocal, fit = 'contain', isScreenShare = false, isActiveSpeaker = false, className = '' }) {
  const videoRef = useRef(null)
  const showVideo = stream && videoOn === true

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream
        // Log audio track state for debugging
        const audioTracks = stream.getAudioTracks()
        console.log(`[VideoTile] ${isLocal ? 'LOCAL' : 'REMOTE'} (${name}) stream attached — audio tracks:`, audioTracks.length, audioTracks.map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })))
        console.log(`[VideoTile] <video> element muted=${isLocal} for ${name}`)
        el.play().catch(err => console.warn(`[VideoTile] play() failed for ${name}:`, err))
      }
    } else {
      if (el.srcObject) {
        el.srcObject = null
      }
    }
  }, [stream, isLocal, name])

  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'
  const isSmall = size === 'small'
  const avatarSize = isSmall ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-16 h-16 sm:w-24 sm:h-24'
  const textSize = isSmall ? 'text-sm' : 'text-2xl sm:text-4xl'
  const badgeText = isSmall ? 'text-[10px]' : 'text-xs'

  return (
    <div className={`relative w-full h-full bg-gray-950 rounded-2xl overflow-hidden group transition-all duration-300 transform ${isActiveSpeaker ? 'ring-2 ring-green-400/80 shadow-lg shadow-green-500/40 scale-105' : 'ring-1 ring-white/10'} ${className}`}>
      {/* Video element — muted ONLY for local preview (isLocal), unmuted for remote so audio plays */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${fit === 'contain' ? 'main-video object-contain bg-black' : 'object-contain bg-black'} ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={mirror ? { transform: 'scaleX(-1)' } : undefined}
      />
      {/* Avatar fallback when camera is off */}
      {!showVideo && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800">
          <div className={`${avatarSize} ${role === 'teacher' ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'} rounded-full flex items-center justify-center shadow-xl`}>
            <span className={`text-white ${textSize} font-bold`}>{initials}</span>
          </div>
        </div>
      )}
      {/* Name badge */}
      <div className={`absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 flex items-center gap-1 ${isScreenShare ? 'z-20' : ''}`}>
        <div className={`px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black/60 backdrop-blur-sm rounded-md text-white ${badgeText} font-medium max-w-[100px] sm:max-w-[140px] truncate flex items-center gap-1`}>
          {isLocal ? 'You' : name || 'Participant'}
          {role === 'teacher' && !isSmall && ' (Host)'}
          {micOn === false && <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400 flex-shrink-0" />}
        </div>
      </div>
      {/* Pin indicator for teacher */}
      {role === 'teacher' && !isSmall && !isScreenShare && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-600/80 backdrop-blur-sm rounded-md text-white text-[10px] font-semibold uppercase tracking-wider">
          Host
        </div>
      )}
    </div>
  )
})

VideoTile.displayName = 'VideoTile'

export default VideoTile
