import { useState } from 'react'
import { Calendar, Clock, BookOpen, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { weeklySchedule, scheduledClasses } from '../../data/mockData'

const colorMap = {
  primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400', dot: 'bg-primary-500', border: 'border-primary-200 dark:border-primary-700' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500', border: 'border-purple-200 dark:border-purple-700' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500', border: 'border-cyan-200 dark:border-cyan-700' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-700' },
}

const daysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function StudentCalendarTab() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(today.getDate())
  const [view, setView] = useState('month') // 'month' | 'week'

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  // Events on the selected date
  const selectedDateEvents = scheduledClasses.filter(cls => {
    const d = new Date(cls.date)
    return d.getDate() === selectedDate && d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  // Build calendar grid
  const calendarDays = []
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  // Check if a day has events
  const hasEvent = (day) => {
    return scheduledClasses.some(cls => {
      const d = new Date(cls.date)
      return d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View your class schedule and events</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('month')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${view === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
          >Month</button>
          <button onClick={() => setView('week')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${view === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
          >Week</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card-interactive p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {months[currentMonth]} {currentYear}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {view === 'month' ? (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center py-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{d}</span>
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />
                  const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                  const isSelected = day === selectedDate
                  const dayHasEvent = hasEvent(day)

                  return (
                    <button key={day} onClick={() => setSelectedDate(day)}
                      className={`relative p-2.5 rounded-xl text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                          : isToday
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {day}
                      {dayHasEvent && (
                        <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary-500'}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            /* Week timetable view */
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-5 gap-3">
                  {weeklySchedule.map(day => (
                    <div key={day.day} className="space-y-2">
                      <div className="text-center py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{day.day}</span>
                      </div>
                      {day.slots.map((slot, idx) => {
                        const c = colorMap[slot.color] || colorMap.primary
                        return (
                          <div key={idx} className={`p-3 rounded-xl ${c.bg} border ${c.border} hover:scale-[1.02] transition-transform cursor-pointer`}>
                            <p className={`text-[11px] font-bold ${c.text}`}>{slot.time}</p>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white mt-1">{slot.subject}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{slot.teacher}</p>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Selected day events */}
        <div className="space-y-4">
          <div className="card-interactive p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              {daysFull[new Date(currentYear, currentMonth, selectedDate).getDay()]}, {months[currentMonth]} {selectedDate}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>

          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map(evt => {
              const c = colorMap[evt.color] || colorMap.primary
              return (
                <div key={evt.id} className="card-interactive p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
                      <BookOpen className={`w-5 h-5 ${c.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{evt.subject}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{evt.topic}</p>
                      <p className="text-xs text-gray-400 mt-1">{evt.teacher}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {evt.time}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {evt.studentCount}</span>
                      </div>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-semibold">
                        {evt.duration}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="card-interactive p-8 text-center">
              <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No events</p>
              <p className="text-xs text-gray-400 mt-1">No classes scheduled for this day</p>
            </div>
          )}

          {/* Upcoming this week */}
          <div className="card-interactive p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Upcoming This Week
            </h3>
            <div className="space-y-2">
              {scheduledClasses.slice(0, 3).map(cls => {
                const c = colorMap[cls.color] || colorMap.primary
                return (
                  <div key={cls.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <div className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{cls.subject}</p>
                      <p className="text-[10px] text-gray-400">{cls.date} &middot; {cls.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentCalendarTab
