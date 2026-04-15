import { useMemo, useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import VideoTile from './VideoTile'
import RemoteAudioPlayer from './RemoteAudioPlayer'
import { useActiveSpeaker } from '../hooks/useActiveSpeaker'

// ─── Google Meet Video Grid ─────────────────────────────────────────────────

// Mobile layout: exactly matches Google Meet behavior
const getMobileLayout = (count) => {
  if (count === 1) return 'grid-cols-1 grid-rows-1'
  if (count === 2) return 'grid-cols-1 grid-rows-2'
  if (count <= 4) return 'grid-cols-2 grid-rows-2'
  return 'grid-cols-2 auto-rows-fr'
}

// Desktop grid column calculation
const getGridCols = (count) => {
  if (count === 1) return 'lg:grid-cols-1'
  if (count === 2) return 'lg:grid-cols-2'
  if (count <= 4) return 'lg:grid-cols-2'
  if (count <= 6) return 'lg:grid-cols-3'
  if (count <= 9) return 'lg:grid-cols-3'
  return 'lg:grid-cols-4'
}

function VideoGrid({ localStream, localVideoOn, localMicOn, remoteStreams, remoteCameraStatus, user, canvasRef, isScreenSharing, screenShareStream }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Detect mobile/tablet screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Build unified participant roster (no role hierarchy)
  const allParticipants = useMemo(() => {
    const roster = []

    // Add all remote participants
    Object.entries(remoteStreams).forEach(([socketId, { stream, userInfo }]) => {
      roster.push({
        id: socketId,
        stream,
        name: userInfo?.userName || (userInfo?.role === 'teacher' ? 'Teacher' : 'Student'),
        role: userInfo?.role || 'student',
        isLocal: false,
        videoOn: remoteCameraStatus[socketId] !== false,
        micOn: userInfo?.micOn,
      })
    })

    // Add self if available
    if (localStream) {
      roster.push({
        id: 'self',
        stream: localStream,
        name: user?.name || 'You',
        role: user?.role || 'student',
        isLocal: true,
        videoOn: localVideoOn,
        micOn: localMicOn,
      })
    }

    return roster
  }, [localStream, localVideoOn, localMicOn, remoteStreams, remoteCameraStatus, user?.name, user?.role])

  const activeSpeakerId = useActiveSpeaker(allParticipants)

  const renderTile = (participant) => (
    <VideoTile
      key={participant.id}
      stream={participant.stream}
      name={participant.name}
      role={participant.role}
      isLocal={participant.isLocal}
      videoOn={participant.videoOn}
      micOn={participant.micOn}
      fit="cover"
      isScreenShare={false}
      isActiveSpeaker={activeSpeakerId === participant.id}
    />
  )

  // Screen sharing mode
  if (isScreenSharing && screenShareStream) {
    // Mobile: Full-screen share with floating participant tiles at bottom
    if (isMobile) {
      return (
        <div className="relative w-full h-full min-h-0 overflow-hidden bg-black">
          <RemoteAudioPlayer remoteStreams={remoteStreams} />

          {/* Main screen share - edge to edge */}
          <div className="absolute inset-0 z-0">
            <VideoTile
              stream={screenShareStream}
              name="Screen share"
              role="teacher"
              isLocal={false}
              videoOn={true}
              micOn={false}
              fit="contain"
              isScreenShare={true}
              isActiveSpeaker={true}
            />

            {/* Screen sharing indicator */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md border border-white/10 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-xs font-semibold uppercase tracking-wide">Sharing</span>
            </div>
          </div>

          {/* Bottom overlay improves readability above thumbnails */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

          {/* Participants strip at bottom - horizontal scroll */}
          {allParticipants.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 z-20 px-2 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {allParticipants.map(participant => (
                <div
                  key={participant.id}
                  className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-black/80 border-2 shadow-lg transition-all duration-300 ${
                    activeSpeakerId === participant.id
                      ? 'border-blue-400 shadow-lg shadow-blue-400/50'
                      : 'border-white/10'
                  }`}
                >
                  {renderTile(participant)}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Desktop: Screen share as main content with participants side panel
    return (
      <div className="w-full h-full min-h-0 flex overflow-hidden bg-black">
        <RemoteAudioPlayer remoteStreams={remoteStreams} />

        {/* Main screen share area */}
        <div className="relative flex-1 min-h-0 p-4">
          <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            <VideoTile
              stream={screenShareStream}
              name="Screen share"
              role="teacher"
              isLocal={false}
              videoOn={true}
              micOn={false}
              fit="contain"
              isScreenShare={true}
              isActiveSpeaker={true}
            />

            {/* Screen sharing indicator */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-md border border-white/10 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-xs font-semibold uppercase tracking-wide">Screen sharing</span>
            </div>
          </div>
        </div>

        {/* Participants side panel */}
        {allParticipants.length > 0 && (
          <div className="w-40 min-h-0 flex flex-col gap-2 p-4 overflow-y-auto bg-black/50 border-l border-white/10">
            {allParticipants.map(participant => (
              <div
                key={participant.id}
                className={`flex-shrink-0 h-28 rounded-lg overflow-hidden bg-black/60 border-2 transition-all duration-300 ${
                  activeSpeakerId === participant.id
                    ? 'border-blue-400 shadow-lg shadow-blue-400/50'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {renderTile(participant)}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Standard grid mode: mobile-first responsive layout
  const hostParticipant = allParticipants.find(participant => participant.role === 'teacher')
  const hasAnyStudentVideoOn = allParticipants.some(participant => participant.role === 'student' && participant.videoOn)
  const shouldFocusHost = Boolean(hostParticipant) && !hasAnyStudentVideoOn
  const visibleParticipants = shouldFocusHost && hostParticipant ? [hostParticipant] : allParticipants

  const totalParticipants = visibleParticipants.length
  const mobileLayoutClass = getMobileLayout(totalParticipants)
  const desktopLayoutClass = getGridCols(totalParticipants)

  return (
    <div className="meet-container w-full h-full min-h-0 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,_rgba(3,7,18,0.95),_rgba(3,7,18,1))]">
      <RemoteAudioPlayer remoteStreams={remoteStreams} />

      {totalParticipants > 0 ? (
        <div className="video-grid flex-1 min-h-0 p-2 sm:p-3 lg:p-4 overflow-auto">
          <div className={`grid w-full h-full gap-2 sm:gap-3 lg:gap-4 ${isMobile ? mobileLayoutClass : `md:grid-cols-3 ${desktopLayoutClass}`}`}>
            {visibleParticipants.map(participant => (
              <div
                key={participant.id}
                className={`relative w-full h-full rounded-2xl overflow-hidden bg-black/60 border-2 transition-all duration-300 ${
                  activeSpeakerId === participant.id
                    ? 'border-blue-400 shadow-lg shadow-blue-400/50'
                    : 'border-white/10 hover:border-white/20 hover:shadow-lg'
                }`}
              >
                {renderTile(participant)}

                {/* Name badge at bottom-left */}
                <div className="absolute bottom-2 left-2 z-10 text-white text-xs font-medium truncate">
                  {participant.name}
                </div>

                {/* Mute indicator at bottom-right */}
                {!participant.micOn && (
                  <div className="absolute bottom-2 right-2 z-10 text-red-400 text-xs">
                    🔇
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-2xl">
              <Users className="w-12 h-12 text-white" />
            </div>
            <p className="text-white font-semibold text-lg">Waiting for participants...</p>
            <p className="text-gray-400 text-sm mt-2">They will appear here when they join</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoGrid
