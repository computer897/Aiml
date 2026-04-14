import {
  Mic, MicOff, Video, VideoOff, MessageSquare,
  MonitorUp, Hand, HelpCircle, Phone, Users
} from 'lucide-react'

// ─── Bottom Control Bar (Google Meet style) ──────────────────────────────────
function ControlBar({
  micOn,
  videoOn,
  isScreenSharing,
  screenShareSupported,
  showChat,
  showEngagement,
  showDoubts,
  unreadMessages,
  doubts,
  user,
  onMicToggle,
  onVideoToggle,
  onScreenShare,
  onTogglePanel,
  onLeaveClass,
  onRaiseDoubt,
  isVisible = true,
}) {
  const pendingDoubts = doubts?.filter(d => d.status === 'pending') || []

  return (
    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 sm:px-6 py-3 sm:py-7 safe-bottom overflow-hidden transition-all duration-300 ${!isVisible ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'}`}>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-2 sm:justify-between">
        {/* Left side buttons */}
        <div className="flex items-center gap-2 order-2 sm:order-1 shrink-0">
          {user?.role === 'teacher' && (
            <button
              onClick={() => onTogglePanel('engagement')}
              className={`p-2.5 sm:p-3 rounded-full transition-all duration-200 transform hover:scale-110 ${
                showEngagement
                  ? 'bg-primary-600 shadow-lg shadow-primary-600/50'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Engagement"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          )}
        </div>

        {/* Center controls */}
        <div className="order-1 sm:order-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Mic */}
          <button
            onClick={onMicToggle}
            className={`p-3 sm:p-4 rounded-full transition-all duration-200 transform hover:scale-110 shrink-0 ${
              micOn
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/50'
            }`}
            title={micOn ? 'Turn off microphone' : 'Turn on microphone'}
          >
            {micOn ? <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          </button>

          {/* Video */}
          <button
            onClick={onVideoToggle}
            className={`p-3 sm:p-4 rounded-full transition-all duration-200 transform hover:scale-110 shrink-0 ${
              videoOn
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/50'
            }`}
            title={videoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {videoOn ? <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          </button>

          {/* Screen share - Teacher only */}
          {user?.role === 'teacher' && (
            <button
              onClick={onScreenShare}
              className={`p-3 sm:p-4 rounded-full transition-all duration-200 transform hover:scale-110 relative shrink-0 ${
                isScreenSharing
                  ? 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/50'
                  : screenShareSupported
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-700/50 cursor-not-allowed'
              }`}
              title={
                !screenShareSupported
                  ? 'Screen sharing not supported on this device'
                  : isScreenSharing
                    ? 'Stop presenting'
                    : 'Present now'
              }
            >
              <MonitorUp className={`w-5 h-5 sm:w-6 sm:h-6 ${screenShareSupported ? 'text-white' : 'text-white/50'}`} />
              {!screenShareSupported && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-[8px] flex items-center justify-center text-gray-900 font-bold">!</span>
              )}
            </button>
          )}

          {/* Chat */}
          <button
            onClick={() => onTogglePanel('chat')}
            className={`p-3 sm:p-4 rounded-full transition-all duration-200 transform hover:scale-110 relative shrink-0 ${
              showChat
                ? 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/50'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            {unreadMessages > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold animate-bounce">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </button>

          {/* Doubt (student) / Doubts queue (teacher) */}
          {user?.role === 'student' && (
            <button
              onClick={onRaiseDoubt}
              className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-full bg-orange-600 hover:bg-orange-700 transition-all duration-200 transform hover:scale-110 flex items-center gap-1.5 shrink-0 shadow-lg shadow-orange-600/50"
              title="Raise a doubt"
            >
              <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span className="text-white font-semibold text-xs hidden sm:inline">Raise Hand</span>
            </button>
          )}
          {user?.role === 'teacher' && (
            <button
              onClick={() => onTogglePanel('doubts')}
              className={`p-3 sm:p-4 rounded-full transition-all duration-200 transform hover:scale-110 relative shrink-0 ${
                showDoubts
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/50'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Student doubts"
            >
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              {pendingDoubts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold animate-bounce">
                  {pendingDoubts.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Right side */}
        <div className="order-3 flex items-center gap-2 shrink-0">
          <button
            onClick={onLeaveClass}
            className="p-2.5 sm:p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-200 transform hover:scale-110 shrink-0 shadow-lg shadow-red-600/50"
            title="Leave call"
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ControlBar
