import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
const API = 'http://localhost:8080/api'
function formatDuration(mins) {
  if (!mins || mins === 0) return null
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}hr ${m}min` : `${h}hr`
  }
  return `${mins}min`
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

export default function Dashboard() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(today)
  const [habits, setHabits] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [newHabit, setNewHabit] = useState({ name: '', description: '', durationMinutes: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [monthHabits, setMonthHabits] = useState({})
  const [showCalendar, setShowCalendar] = useState(false)

  const isToday = (date) => date.toDateString() === today.toDateString()
  const isPast = (date) => date < today && !isToday(date)
  const isFuture = (date) => date > today && !isToday(date)
  const formatDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const fetchHabitsForDate = async (date) => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/habits/date/${formatDate(date)}`, { headers })
      setHabits(res.data)
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token')
        navigate('/')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchMonthData = async () => {
    try {
      const res = await axios.get(`${API}/habits`, { headers })
      const grouped = {}
      res.data.forEach(h => {
        if (!h.date) return
        const d = h.date
        if (!grouped[d]) grouped[d] = { total: 0, completed: 0 }
        grouped[d].total++
        if (h.completed) grouped[d].completed++
      })
      setMonthHabits(grouped)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchHabitsForDate(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    fetchMonthData()
  }, [habits])

  const handleDayClick = (date) => {
    if (isFuture(date)) return
    setSelectedDate(date)
    setShowForm(false)
    setShowCalendar(false)
  }

  const handleToggle = async (id) => {
    if (!isToday(selectedDate)) return
    try {
      const res = await axios.put(`${API}/habits/${id}/toggle`, {}, { headers })
      setHabits(habits.map(h => h.id === id ? res.data : h))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    if (!isToday(selectedDate)) return
    try {
      await axios.delete(`${API}/habits/${id}`, { headers })
      setHabits(habits.filter(h => h.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async () => {
    if (!newHabit.name.trim()) { setError('Habit name is required'); return }
    if (newHabit.durationMinutes && parseInt(newHabit.durationMinutes) < 0) {
      setError('Duration cannot be negative'); return
    }
    try {
      const res = await axios.post(`${API}/habits`, {
        name: newHabit.name,
        description: newHabit.description,
        durationMinutes: parseInt(newHabit.durationMinutes) || 0,
      }, { headers })
      setHabits(prev => [...prev, res.data])
      setNewHabit({ name: '', description: '', durationMinutes: '' })
      setShowForm(false)
      setError('')
    } catch (err) {
      setError('Failed to create habit')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const nextMonth = () => {
    const now = new Date()
    if (currentYear === now.getFullYear() && currentMonth === now.getMonth()) return
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const getDotColor = (dateStr) => {
    const data = monthHabits[dateStr]
    if (!data || data.total === 0) return null
    if (data.completed === data.total) return 'bg-emerald-500'
    if (data.completed === 0) return 'bg-red-500'
    return 'bg-violet-500'
  }

  const completed = habits.filter(h => h.completed).length
  const total = habits.length
  const score = total > 0 ? Math.round((completed / total) * 100) : 0

  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December']
  const dayNames = ['S','M','T','W','T','F','S']

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const prevMonthDays = getDaysInMonth(currentYear, currentMonth === 0 ? 11 : currentMonth - 1)

  const calendarDays = []
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, current: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, current: true })
  }
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push({ day: calendarDays.length - daysInMonth - firstDay + 1, current: false })
  }

  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const str = formatDate(d)
    const data = monthHabits[str]
    last7.push({
      label: d.getDate(),
      pct: data && data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      isToday: i === 0
    })
  }

  const selectedStr = formatDate(selectedDate)
  const selectedLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  })

  const CalendarPanel = () => (
    <div className="p-5">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-medium text-white">
          {monthNames[currentMonth]} {currentYear}
        </span>
        <div className="flex gap-1.5">
          <button onClick={prevMonth} className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 flex items-center justify-center transition-colors text-sm">‹</button>
          <button onClick={nextMonth} className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 flex items-center justify-center transition-colors text-sm">›</button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d, i) => (
          <div key={i} className="text-center text-xs text-zinc-500 font-medium py-1.5">{d}</div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((item, idx) => {
          if (!item.current) {
            return (
              <div key={idx} className="h-10 flex flex-col items-center justify-center gap-0.5">
                <span className="text-sm text-zinc-800">{item.day}</span>
                <div className="w-1.5 h-1.5 rounded-full"></div>
              </div>
            )
          }
          const date = new Date(currentYear, currentMonth, item.day)
          const dateStr = formatDate(date)
          const isSelected = selectedStr === dateStr
          const isTodayDay = isToday(date)
          const isFutureDay = isFuture(date)
          const dotColor = getDotColor(dateStr)

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(date)}
              disabled={isFutureDay}
              className={`h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors
                ${isSelected ? 'bg-violet-600 text-white' : ''}
                ${isTodayDay && !isSelected ? 'bg-violet-950 text-violet-300 font-medium' : ''}
                ${!isSelected && !isTodayDay && !isFutureDay ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : ''}
                ${isFutureDay ? 'text-zinc-700 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-sm">{item.day}</span>
              <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : dotColor || 'bg-transparent'}`}></div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 mb-5">
        {[
          ['bg-emerald-500', 'All done'],
          ['bg-violet-500', 'Partial'],
          ['bg-red-500', 'Missed'],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${c}`}></div>
            <span className="text-xs text-zinc-500">{l}</span>
          </div>
        ))}
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'This week', value: `${last7.reduce((a, b) => a + b.pct, 0) / 7 | 0}%`, sub: 'avg score' },
          { label: 'Today', value: `${score}%`, sub: 'completion' },
          { label: 'This month', value: Object.values(monthHabits).reduce((a, b) => a + b.completed, 0), sub: 'done' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="text-xs text-zinc-600 mb-1.5">{s.label}</div>
            <div className="text-lg font-medium text-white">{s.value}</div>
            <div className="text-xs text-zinc-600 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* Navbar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-600 rounded-md flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1.5" fill="white"/>
              <rect x="11" y="3" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="3" y="11" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white"/>
            </svg>
          </div>
          <span className="text-sm font-medium">HabitTracker</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/stats')} className="text-xs text-zinc-500 hover:text-white transition-colors">Stats</button>
          <button onClick={handleLogout} className="text-xs text-zinc-500 hover:text-white transition-colors">Logout</button>
        </div>
      </div>

      {/* Mobile date bar — shows selected date + calendar toggle */}
      <div className="lg:hidden border-b border-zinc-800 px-4 py-3 flex items-center justify-between bg-zinc-900">
        <div>
          <div className="text-sm font-medium text-white">{selectedLabel}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {isToday(selectedDate) ? 'Today' : isPast(selectedDate) ? 'Past day — view only' : ''}
          </div>
        </div>
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors
            ${showCalendar ? 'bg-violet-600 border-violet-600 text-white' : 'border-zinc-700 text-zinc-400 hover:text-white'}
          `}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {showCalendar ? 'Hide' : 'Calendar'}
        </button>
      </div>

      {/* Mobile calendar dropdown */}
      {showCalendar && (
        <div className="lg:hidden border-b border-zinc-800 bg-zinc-950">
          <CalendarPanel />
        </div>
      )}

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — Calendar panel (desktop only) */}
        <div className="hidden lg:block w-80 flex-shrink-0 border-r border-zinc-800 overflow-y-auto">
          <CalendarPanel />
        </div>

        {/* Right — Day detail panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Day header — desktop only */}
          <div className="hidden lg:block px-6 py-4 border-b border-zinc-800 flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-lg font-medium text-white">{selectedLabel}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {isToday(selectedDate) ? 'Today — tap habits to toggle' : isPast(selectedDate) ? 'Past day — view only' : ''}
                </div>
              </div>
              {isToday(selectedDate) && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0"
                >
                  + Add habit
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { val: completed, label: 'completed', color: 'text-emerald-400' },
                { val: total - completed, label: 'remaining', color: 'text-zinc-400' },
                { val: `${score}%`, label: 'score', color: 'text-violet-400' },
              ].map(p => (
                <div key={p.label} className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 text-center">
                  <div className={`text-xl font-medium ${p.color}`}>{p.val}</div>
                  <div className="text-xs text-zinc-600 mt-1">{p.label}</div>
                </div>
              ))}
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full">
              <div className="h-1.5 bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${score}%` }} />
            </div>
          </div>

          {/* Mobile score bar */}
          <div className="lg:hidden px-4 py-3 border-b border-zinc-800 flex-shrink-0">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { val: completed, label: 'done', color: 'text-emerald-400' },
                { val: total - completed, label: 'left', color: 'text-zinc-400' },
                { val: `${score}%`, label: 'score', color: 'text-violet-400' },
              ].map(p => (
                <div key={p.label} className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 text-center">
                  <div className={`text-lg font-medium ${p.color}`}>{p.val}</div>
                  <div className="text-xs text-zinc-600">{p.label}</div>
                </div>
              ))}
            </div>
            <div className="h-1 bg-zinc-800 rounded-full">
              <div className="h-1 bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${score}%` }} />
            </div>
          </div>

          {/* Mobile add button */}
          {isToday(selectedDate) && (
            <div className="lg:hidden px-4 py-2 flex-shrink-0">
              <button
                onClick={() => setShowForm(!showForm)}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                + Add habit
              </button>
            </div>
          )}

          {/* Add habit form */}
          {showForm && (
            <div className="px-4 lg:px-6 py-4 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
              <div className="text-xs font-medium text-zinc-400 mb-3">New habit</div>
              <div className="flex flex-col gap-2.5">
                <input
                  type="text"
                  placeholder="Habit name *"
                  value={newHabit.name}
                  onChange={e => setNewHabit({ ...newHabit, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newHabit.description}
                  onChange={e => setNewHabit({ ...newHabit, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="Duration in minutes (optional)"
                    value={newHabit.durationMinutes}
                    onChange={e => setNewHabit({ ...newHabit, durationMinutes: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  />
                  {newHabit.durationMinutes > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-violet-400">
                      {formatDuration(parseInt(newHabit.durationMinutes))}
                    </div>
                  )}
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">Create</button>
                  <button onClick={() => { setShowForm(false); setError('') }} className="text-zinc-500 hover:text-white text-xs px-4 py-2 rounded-lg transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Habits list */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
            {loading ? (
              <div className="text-center text-zinc-700 py-16 text-sm">Loading...</div>
            ) : habits.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-600 text-sm">No habits for this day.</p>
                {isToday(selectedDate) && (
                  <p className="text-zinc-700 text-xs mt-1">Tap "+ Add habit" to get started!</p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {habits.map(habit => (
                  <div
                    key={habit.id}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors
                      ${habit.completed ? 'bg-zinc-900 border-emerald-900'
                        : isPast(selectedDate) && !habit.completed ? 'bg-zinc-900 border-red-900 opacity-60'
                        : 'bg-zinc-900 border-zinc-800'}
                    `}
                  >
                    <button
                      onClick={() => handleToggle(habit.id)}
                      disabled={!isToday(selectedDate)}
                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                        ${habit.completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}
                        ${isToday(selectedDate) && !habit.completed ? 'hover:border-violet-500 cursor-pointer' : 'cursor-default'}
                      `}
                    >
                      {habit.completed && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${habit.completed ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {habit.name}
                      </p>
                      {habit.description && (
                        <p className="text-xs text-zinc-600 mt-0.5 truncate">{habit.description}</p>
                      )}
                    </div>

                    {habit.durationMinutes > 0 && (
                      <span className="text-xs text-zinc-500 flex-shrink-0">{formatDuration(habit.durationMinutes)}</span>
                    )}

                    {habit.streak > 0 && (
                      <span className="text-xs font-medium text-amber-500 flex-shrink-0">{habit.streak}d</span>
                    )}

                    {isPast(selectedDate) && !habit.completed && (
                      <span className="text-xs text-red-500 flex-shrink-0">missed</span>
                    )}

                    {isToday(selectedDate) && (
                      <button onClick={() => handleDelete(habit.id)} className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last 7 days bar chart */}
          <div className="px-4 lg:px-6 py-4 border-t border-zinc-800 bg-zinc-900 flex-shrink-0">
            <div className="text-xs text-zinc-600 mb-3">Last 7 days</div>
            <div className="flex items-end gap-1.5 h-10">
              {last7.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm transition-all
                      ${d.isToday ? 'bg-violet-500' : d.pct === 100 ? 'bg-emerald-500' : d.pct > 0 ? 'bg-violet-700' : 'bg-zinc-800'}
                    `}
                    style={{ height: `${Math.max(d.pct * 0.36, d.pct > 0 ? 6 : 3)}px` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              {last7.map((d, i) => (
                <div key={i} className={`flex-1 text-center text-xs ${d.isToday ? 'text-violet-400 font-medium' : 'text-zinc-700'}`}>
                  {d.label}
                </div>
              ))}
            </div>
          </div>

          {/* All done banner */}
          {score === 100 && total > 0 && (
            <div className="px-4 py-2.5 bg-emerald-950 border-t border-emerald-900 flex-shrink-0">
              <p className="text-xs text-emerald-400 text-center font-medium">All habits done for today — great work!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}