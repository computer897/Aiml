import { Clock, Users, Phone, X } from 'lucide-react'

// ─── Top Bar (Google Meet style) ────────────────────────────────────────────
function TopBar({
  classData,
  user,
  classRemainingTime,
  classElapsedTime,
  showParticipants,
  participantCount,
  onToggleParticipants,
  onLeaveClass,
  isVisible = true,
}) {
  return (
    <div className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/30 to-transparent px-3 sm:px-5 pt-3 sm:pt-4 pb-14 pointer-events-none transition-all duration-300 ${!isVisible ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <h1 className="text-white text-sm sm:text-base font-semibold truncate drop-shadow-lg">
              {classData?.title || 'Classroom'}
            </h1>
            <p className="text-gray-300/80 text-[11px] sm:text-xs truncate">
              {classData?.teacher_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-black/50 backdrop-blur-md border border-white/20 rounded-lg hover:bg-black/60 transition-all duration-200">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-xs sm:text-sm font-medium">Live</span>
          </div>

          {/* Class timer - Teacher sees remaining time, Students see elapsed time */}
          {user?.role === 'teacher' && classRemainingTime !== null && (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-black/50 backdrop-blur-md border border-white/20 rounded-lg hover:bg-black/60 transition-all duration-200">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="text-white text-xs sm:text-sm font-medium">
                {Math.floor(classRemainingTime / 60)}:{(classRemainingTime % 60).toString().padStart(2, '0')} left
              </span>
            </div>
          )}
          {user?.role === 'student' && classElapsedTime > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-black/50 backdrop-blur-md border border-white/20 rounded-lg hover:bg-black/60 transition-all duration-200">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="text-white text-xs sm:text-sm font-medium">
                {Math.floor(classElapsedTime / 60)} min
              </span>
            </div>
          )}

          {/* Participants button */}
          <button
            onClick={onToggleParticipants}
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg backdrop-blur-md transition-all duration-200 transform hover:scale-105 ${
              showParticipants
                ? 'bg-primary-600/90 shadow-lg shadow-primary-600/50'
                : 'bg-black/50 hover:bg-black/60 border border-white/20'
            }`}
          >
            <Users className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-medium">{participantCount || 1}</span>
          </button>

          {/* Leave button */}
          <button
            onClick={onLeaveClass}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-red-600/90 backdrop-blur-md text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all duration-200 flex items-center gap-1.5 text-xs sm:text-sm font-medium shadow-lg shadow-red-600/50 transform hover:scale-105"
          >
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TopBar
