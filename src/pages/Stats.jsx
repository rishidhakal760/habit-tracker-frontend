import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'
const API = 'https://habittracker-1-wmm5.onrender.com/api'
export default function Stats() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const [completionRate, setCompletionRate] = useState(0)
  const [allHabits, setAllHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartTab, setChartTab] = useState('weekly')

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [rateRes, allRes] = await Promise.all([
          axios.get(`${API}/habits/stats/completion`, { headers }),
          axios.get(`${API}/habits`, { headers }),
        ])
        setCompletionRate(Math.round(rateRes.data))
        setAllHabits(allRes.data)
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token')
          navigate('/')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const formatDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Group all habits by date
  const habitsByDate = useMemo(() => {
    const grouped = {}
    allHabits.forEach(h => {
      if (!h.date) return
      if (!grouped[h.date]) grouped[h.date] = { total: 0, completed: 0 }
      grouped[h.date].total++
      if (h.completed) grouped[h.date].completed++
    })
    return grouped
  }, [allHabits])

  // Weekly chart data — last 7 days
  const weeklyData = useMemo(() => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const str = formatDate(d)
      const day = habitsByDate[str]
      data.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        pct: day && day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0,
        isToday: i === 0,
      })
    }
    return data
  }, [habitsByDate])

  // Monthly chart data — last 30 days grouped by week
  const monthlyData = useMemo(() => {
    const weeks = []
    for (let w = 3; w >= 0; w--) {
      const weekDays = []
      for (let d = 6; d >= 0; d--) {
        const date = new Date()
        date.setDate(date.getDate() - (w * 7 + d))
        const str = formatDate(date)
        const day = habitsByDate[str]
        weekDays.push(day && day.total > 0 ? (day.completed / day.total) * 100 : 0)
      }
      const avg = Math.round(weekDays.reduce((a, b) => a + b, 0) / 7)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (w * 7 + 6))
      weeks.push({
        label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        pct: avg,
        isToday: w === 0,
      })
    }
    return weeks
  }, [habitsByDate])

  // Yearly chart data — last 12 months
  const yearlyData = useMemo(() => {
    const months = []
    for (let m = 11; m >= 0; m--) {
      const date = new Date()
      date.setMonth(date.getMonth() - m)
      const year = date.getFullYear()
      const month = date.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const pcts = []
      for (let d = 1; d <= daysInMonth; d++) {
        const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const day = habitsByDate[str]
        if (day && day.total > 0) pcts.push((day.completed / day.total) * 100)
      }
      months.push({
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        pct: pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
        isToday: m === 0,
      })
    }
    return months
  }, [habitsByDate])

  const chartData = chartTab === 'weekly' ? weeklyData
    : chartTab === 'monthly' ? monthlyData
    : yearlyData

  // Sparkline for each habit — last 7 days
  const getSparkline = (habitName) => {
    const sparks = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const str = formatDate(d)
      const dayHabits = allHabits.filter(h => h.date === str && h.name === habitName)
      sparks.push(dayHabits.length > 0 && dayHabits[0].completed)
    }
    return sparks
  }

  // Top habits by streak
  const uniqueHabitNames = [...new Set(allHabits.map(h => h.name))]
  const topStreaks = uniqueHabitNames.map(name => {
    const latest = allHabits
      .filter(h => h.name === name)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    return { name, streak: latest?.streak || 0 }
  }).sort((a, b) => b.streak - a.streak).slice(0, 5)

  const totalCompleted = allHabits.filter(h => h.completed).length
  const totalHabits = allHabits.length
  const longestStreak = topStreaks[0]?.streak || 0

  const pieData = [
    { name: 'Completed', value: completionRate },
    { name: 'Remaining', value: 100 - completionRate },
  ]

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Loading stats...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* Navbar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-5 py-3 flex items-center justify-between flex-shrink-0">
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
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/dashboard')} className="text-xs text-zinc-500 hover:text-white transition-colors">Dashboard</button>
          <button onClick={handleLogout} className="text-xs text-zinc-500 hover:text-white transition-colors">Logout</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 py-8">

        <div className="mb-8">
          <h1 className="text-xl font-medium text-white">Your stats</h1>
          <p className="text-xs text-zinc-500 mt-1">Overview of your habit performance</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Overall completion', value: `${completionRate}%`, color: 'text-violet-400' },
            { label: 'Total completed', value: totalCompleted, color: 'text-emerald-400' },
            { label: 'Total habits', value: totalHabits, color: 'text-white' },
            { label: 'Longest streak', value: `${longestStreak}d`, color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-600 mb-2">{s.label}</div>
              <div className={`text-2xl font-medium ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">

          {/* Pie chart */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-sm font-medium text-white mb-1">Completion rate</div>
            <div className="text-xs text-zinc-500 mb-4">All time habit completion</div>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell fill="#7c3aed"/>
                    <Cell fill="#27272a"/>
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <div className="text-3xl font-medium text-violet-400">{completionRate}%</div>
                <div className="text-xs text-zinc-500 mt-1">habits completed</div>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                  <span className="text-xs text-zinc-500">Completed</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                  <span className="text-xs text-zinc-500">Remaining</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top streaks with sparklines */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-sm font-medium text-white mb-1">Top streaks</div>
            <div className="text-xs text-zinc-500 mb-4">Consistency over last 7 days</div>
            {topStreaks.length === 0 ? (
              <p className="text-xs text-zinc-600 py-4">No streaks yet — keep going!</p>
            ) : (
              <div className="space-y-3">
                {topStreaks.map((h, i) => {
                  const sparks = getSparkline(h.name)
                  return (
                    <div key={h.name} className="flex items-center gap-3">
                      {/* Rank */}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
                        ${i === 0 ? 'bg-amber-950 text-amber-400' : 'bg-zinc-800 text-zinc-500'}
                      `}>
                        {i + 1}
                      </div>

                      {/* Name + sparkline */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-300 truncate mb-1.5">{h.name}</div>
                        <div className="flex gap-0.5">
                          {sparks.map((done, si) => (
                            <div
                              key={si}
                              className={`w-4 h-4 rounded-sm ${done ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Streak count */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <span className="text-sm">🔥</span>
                        <span className="text-base font-medium text-amber-400 leading-none mt-0.5">{h.streak}</span>
                        <span className="text-xs text-zinc-600 mt-0.5">days</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bar chart with tabs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-white mb-1">Performance</div>
              <div className="text-xs text-zinc-500">Completion % by period</div>
            </div>
            {/* Tab switcher */}
            <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
              {['weekly', 'monthly', 'yearly'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setChartTab(tab)}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors capitalize
                    ${chartTab === tab
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'}
                  `}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={chartTab === 'yearly' ? 24 : 32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false}/>
              <XAxis
                dataKey="label"
                tick={{ fill: '#52525b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#52525b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: '#18181b',
                  border: '0.5px solid #3f3f46',
                  borderRadius: 8,
                  fontSize: 12
                }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value) => [`${value}%`, 'Completion']}
                cursor={{ fill: '#27272a' }}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isToday ? '#7c3aed' : entry.pct === 100 ? '#10b981' : entry.pct > 0 ? '#7c3aed99' : '#27272a'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}