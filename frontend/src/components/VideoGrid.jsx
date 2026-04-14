import { useMemo } from 'react'
import { Users, MonitorUp } from 'lucide-react'
import VideoTile from './VideoTile'
import RemoteAudioPlayer from './RemoteAudioPlayer'
import { useActiveSpeaker } from '../hooks/useActiveSpeaker'

// ─── Google Meet Video Grid ─────────────────────────────────────────────────
function VideoGrid({ localStream, localVideoOn, localMicOn, remoteStreams, remoteCameraStatus, user, canvasRef, isScreenSharing, screenShareStream }) {
  const participants = useMemo(() => {
    const roster = []

    if (user?.role === 'teacher' && localStream) {
      roster.push({
        id: 'teacher-local',
        stream: localStream,
        name: user?.name || 'Teacher',
        role: 'teacher',
        isLocal: true,
        videoOn: localVideoOn,
        micOn: localMicOn,
      })
    }

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

    return roster.sort((a, b) => (a.role === 'teacher' ? -1 : b.role === 'teacher' ? 1 : 0))
  }, [localStream, localVideoOn, localMicOn, remoteStreams, remoteCameraStatus, user?.name, user?.role])

  const teacher = participants.find(participant => participant.role === 'teacher') || null
  const students = participants.filter(participant => participant.role !== 'teacher')
  const visibleStudents = students.filter(student => student.videoOn)
  const hiddenStudents = students.filter(student => !student.videoOn)
  const selfPreview = user?.role === 'student' && localStream ? {
    id: 'self-preview',
    stream: localStream,
    name: user?.name || 'You',
    role: user?.role,
    isLocal: true,
    videoOn: localVideoOn,
    micOn: localMicOn,
  } : null

  const speakerCandidates = useMemo(
    () => [teacher, ...visibleStudents, selfPreview].filter(Boolean),
    [teacher, visibleStudents, selfPreview]
  )
  const activeSpeakerId = useActiveSpeaker(speakerCandidates)

  const mainStream = isScreenSharing && screenShareStream ? screenShareStream : teacher?.stream || null
  const mainName = isScreenSharing ? (teacher?.name || 'Screen share') : (teacher?.name || 'Teacher')
  const mainVideoOn = isScreenSharing ? true : teacher?.videoOn

  const renderTile = (participant, size = 'normal') => (
    <VideoTile
      key={participant.id}
      stream={participant.stream}
      name={participant.name}
      role={participant.role}
      isLocal={participant.isLocal}
      videoOn={participant.videoOn}
      micOn={participant.micOn}
      size={size}
      fit="contain"
      isScreenShare={false}
      isActiveSpeaker={activeSpeakerId === participant.id}
    />
  )

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,_rgba(3,7,18,0.95),_rgba(3,7,18,1))]">
      <RemoteAudioPlayer remoteStreams={remoteStreams} />

      {isScreenSharing ? (
        <div className="relative flex-1 min-h-0 p-2 sm:p-3 lg:p-4">
          <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl">
            {mainStream ? (
              <VideoTile
                stream={mainStream}
                name={mainName}
                role="teacher"
                isLocal={teacher?.isLocal}
                videoOn={mainVideoOn}
                micOn={teacher?.micOn}
                fit="contain"
                isScreenShare={true}
                isActiveSpeaker={activeSpeakerId === teacher?.id || isScreenSharing}
                className="main-video"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black">
                <div className="text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
                    <MonitorUp className="w-10 h-10 text-white/80" />
                  </div>
                  <p className="text-white font-semibold">Screen share not available</p>
                  <p className="text-gray-400 text-sm mt-1">Waiting for the teacher to present</p>
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-md border border-white/10 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-xs font-semibold uppercase tracking-wide">Screen sharing</span>
            </div>

            <div className="students-strip">
              {visibleStudents.map(student => (
                <div key={student.id} className="flex-shrink-0 w-36 sm:w-44 h-24 sm:h-28 rounded-2xl overflow-hidden bg-black/50 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-white/20">
                  {renderTile(student, 'small')}
                </div>
              ))}
              {hiddenStudents.map(student => (
                <div key={student.id} className="flex-shrink-0 w-36 sm:w-44 h-24 sm:h-28 rounded-2xl overflow-hidden bg-black/50 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-white/20">
                  {renderTile(student, 'small')}
                </div>
              ))}
              {selfPreview && (
                <div className="flex-shrink-0 w-36 sm:w-44 h-24 sm:h-28 rounded-2xl overflow-hidden bg-black/50 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-white/20">
                  {renderTile(selfPreview, 'small')}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-3 p-2 sm:p-3 lg:p-4">
          <div className="relative min-h-[42vh] flex-[1.2] overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl">
            {mainStream ? (
              <VideoTile
                stream={mainStream}
                name={mainName}
                role="teacher"
                isLocal={teacher?.isLocal}
                videoOn={mainVideoOn}
                micOn={teacher?.micOn}
                fit="contain"
                isScreenShare={false}
                isActiveSpeaker={activeSpeakerId === teacher?.id}
                className="main-video"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black">
                <div className="text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-2xl">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-white font-semibold">Waiting for the teacher</p>
                  <p className="text-gray-400 text-sm mt-1">Main video will appear here</p>
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-md border border-white/10 shadow-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white text-xs font-semibold uppercase tracking-wide">Live</span>
            </div>

            {selfPreview && (
              <div className="absolute bottom-4 right-4 z-20 w-32 sm:w-40 h-20 sm:h-24 rounded-2xl overflow-hidden border border-white/15 shadow-xl bg-black/80 transition-all duration-300 hover:shadow-2xl hover:border-white/25">
                {renderTile(selfPreview, 'small')}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 space-y-3">
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-white text-sm font-semibold tracking-wide uppercase">Students</h2>
                <span className="text-gray-400 text-xs">{visibleStudents.length} active</span>
              </div>
              {visibleStudents.length > 0 ? (
                <div className="students-grid">
                  {visibleStudents.map(student => (
                    <div key={student.id} className="min-h-[140px] sm:min-h-[180px] overflow-hidden rounded-2xl bg-black/60 border border-white/10 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-white/20 hover:scale-105">
                      {renderTile(student, 'normal')}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-gray-400">
                  No student cameras are active yet.
                </div>
              )}
            </div>

            {hiddenStudents.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-white text-xs font-semibold tracking-wide uppercase">Camera off</h3>
                  <span className="text-gray-400 text-xs">{hiddenStudents.length}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {hiddenStudents.map(student => (
                    <div key={student.id} className="flex-shrink-0 w-36 sm:w-44 h-24 sm:h-28 rounded-2xl overflow-hidden bg-black/60 border border-white/10 transition-all duration-300 hover:shadow-xl hover:border-white/20">
                      {renderTile(student, 'small')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {!isScreenSharing && participants.length === 0 && (
        <div className="absolute bottom-28 sm:bottom-32 left-1/2 transform -translate-x-1/2 z-10 animate-fade-in">
          <div className="px-4 py-2 bg-gray-800/90 backdrop-blur-sm rounded-full text-gray-400 text-sm border border-gray-700/50">
            {user?.role === 'teacher' ? 'Waiting for students to join...' : 'Connecting to classroom...'}
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoGrid
