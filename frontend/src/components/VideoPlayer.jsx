import { Monitor } from 'lucide-react'

function VideoPlayer({ user, videoOn }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        {videoOn ? (
          // Placeholder for actual video stream
          <div className="relative">
            <div className="w-40 h-40 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
              <Monitor className="w-20 h-20 text-white" />
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-green-500 px-3 py-1 rounded-full">
              <span className="text-white text-xs font-semibold">● LIVE</span>
            </div>
          </div>
        ) : (
          <div className="w-40 h-40 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <span className="text-white text-5xl font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </span>
          </div>
        )}
        <p className="text-white text-2xl font-semibold mb-2">{user?.name}</p>
        <p className="text-gray-400 text-sm uppercase tracking-wide">{user?.role}</p>
      </div>
    </div>
  )
}

export default VideoPlayer
