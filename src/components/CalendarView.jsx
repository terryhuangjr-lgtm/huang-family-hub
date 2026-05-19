import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Trash2 } from 'lucide-react'

const MEMBER_COLORS = {
  Terry: '#007bff',
  Donna: '#28a745',
  Sienna: '#e83e8c',
  Genevieve: '#6f42c1',
  Family: '#f7931a'
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const RECURRENCE_OPTIONS = [
  { value: '', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
]

export default function CalendarView({ onNavigate }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [recurrenceCount, setRecurrenceCount] = useState(12)
  const [formData, setFormData] = useState({
    title: '', description: '', event_date: new Date().toISOString().split('T')[0],
    event_end_date: '', event_time: '', event_type: 'general', family_member: 'Family',
    location: '', all_day: false, duration_minutes: 60,
    recurring_pattern: ''
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  useEffect(() => { loadEvents() }, [currentDate])

  async function loadEvents() {
    try {
      const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0]
      const endOfNextMonth = new Date(year, month + 2, 0).toISOString().split('T')[0]
      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('event_date', startOfMonth)
        .lte('event_date', endOfNextMonth)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
      setEvents(data || [])
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      title: '', description: '', event_date: new Date().toISOString().split('T')[0],
      event_end_date: '', event_time: '', event_type: 'general', family_member: 'Family',
      location: '', all_day: false, duration_minutes: 60,
      recurring_pattern: ''
    })
    setEditingEvent(null)
    setRecurrenceCount(12)
  }

  function getNextOccurrences(dateStr, pattern, count) {
    const dates = [dateStr]
    if (!pattern) return dates
    const start = new Date(dateStr + 'T12:00:00')
    for (let i = 1; i < count; i++) {
      const next = new Date(start)
      if (pattern === 'daily') next.setDate(next.getDate() + i)
      else if (pattern === 'weekly') next.setDate(next.getDate() + i * 7)
      else if (pattern === 'biweekly') next.setDate(next.getDate() + i * 14)
      else if (pattern === 'monthly') next.setMonth(next.getMonth() + i)
      dates.push(next.toISOString().split('T')[0])
    }
    return dates
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim()) return
    try {
      const basePayload = { ...formData, title: formData.title.trim() }
      
      if (editingEvent) {
        await supabase.from('calendar_events').update(basePayload).eq('id', editingEvent.id)
      } else if (basePayload.recurring_pattern) {
        const dates = getNextOccurrences(basePayload.event_date, basePayload.recurring_pattern, recurrenceCount)
        const inserts = dates.map(d => ({ ...basePayload, event_date: d }))
        await supabase.from('calendar_events').insert(inserts)
      } else if (basePayload.event_end_date && basePayload.event_end_date !== basePayload.event_date) {
        // Multi-day event: create one event per day
        const start = new Date(basePayload.event_date + 'T12:00:00')
        const end = new Date(basePayload.event_end_date + 'T12:00:00')
        const dates = []
        const current = new Date(start)
        while (current <= end) {
          dates.push(current.toISOString().split('T')[0])
          current.setDate(current.getDate() + 1)
        }
        const inserts = dates.map(d => ({ ...basePayload, event_date: d }))
        await supabase.from('calendar_events').insert(inserts)
      } else {
        await supabase.from('calendar_events').insert(basePayload)
      }
      
      resetForm()
      setShowForm(false)
      loadEvents()
    } catch (err) {
      console.error('Failed to save event:', err)
    }
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return
    try {
      await supabase.from('calendar_events').delete().eq('id', id)
      loadEvents()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  function editEvent(ev) {
    setEditingEvent(ev)
    setFormData({
      title: ev.title, description: ev.description || '',
      event_date: ev.event_date, event_time: ev.event_time || '',
      event_type: ev.event_type, family_member: ev.family_member,
      location: ev.location || '', all_day: ev.all_day,
      duration_minutes: ev.duration_minutes,
      recurring_pattern: ev.recurring_pattern || ''
    })
    setShowForm(true)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const selectedStr = selectedDate || todayStr
  const dayEvents = events.filter(e => e.event_date === selectedStr)

  function formatTime(timeStr) {
    if (!timeStr) return ''
    const parts = timeStr.split(':')
    let h = parseInt(parts[0], 10)
    let m = parts[1] || '00'
    const ampm = h >= 12 ? 'PM' : 'AM'
    if (h === 0) h = 12
    else if (h > 12) h -= 12
    return `${h}:${m} ${ampm} ET`
  }

  function formatEndTime(timeStr, durationMin) {
    if (!timeStr || !durationMin) return ''
    const parts = timeStr.split(':')
    let h = parseInt(parts[0], 10)
    let m = parseInt(parts[1] || '0', 10)
    const totalMin = h * 60 + m + durationMin
    h = Math.floor(totalMin / 60) % 24
    m = totalMin % 60
    const ampm = h >= 12 ? 'PM' : 'AM'
    if (h === 0) h = 12
    else if (h > 12) h -= 12
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`
  }

  function getEventsForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.event_date === dateStr)
  }

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }

  const days = []
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: prevMonthDays - firstDay + i + 1, other: true })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, other: false })
  }
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, other: true })
    }
  }

  if (loading) return <div className="loading-state">Loading calendar...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Family Calendar</h1>
        <p>Shared calendar for the Huang family</p>
      </div>

      <div className="calendar-nav">
        <div className="calendar-nav-buttons">
          <button className="btn btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
          <button className="btn btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
        </div>
        <h2>{MONTHS[month]} {year}</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="calendar-grid">
        {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        {days.map((d, i) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
          const dayEvents = getEventsForDay(d.day)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedStr
          return (
            <div
              key={i}
              className={`calendar-day ${d.other ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
              style={isSelected ? { background: 'var(--orange-light)' } : {}}
            >
              <div className="calendar-day-number">{d.day}</div>
              <div>
                {[...new Set(dayEvents.map(e => e.family_member))].map(m => (
                  <div key={m} className={`calendar-event-dot ${m.toLowerCase()}`} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Day Events */}
      <div className="event-list">
        <div className="event-list-header">
          <h3>{new Date(selectedStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
          <button className="btn btn-sm btn-primary" onClick={() => {
            resetForm()
            setFormData(prev => ({ ...prev, event_date: selectedStr }))
            setShowForm(true)
          }}>
            <Plus size={14} /> Add
          </button>
        </div>
        {dayEvents.length === 0 ? (
          <div className="empty-state">No events for this day</div>
        ) : (
          dayEvents.map(ev => (
            <div key={ev.id} className={`event-item ${ev.family_member.toLowerCase()}`}>
              <div className="event-item-content">
                <div className="event-item-title" onClick={() => editEvent(ev)} style={{ cursor: 'pointer' }}>
                  {ev.title}
                </div>
                <div className="event-item-meta">
                  {ev.duration_minutes === 0 ? (
                    <><Clock size={12} /> All Day</>
                  ) : ev.event_time ? (
                    <><Clock size={12} /> {formatTime(ev.event_time)}{ev.duration_minutes > 0 ? ` – ${formatEndTime(ev.event_time, ev.duration_minutes)}` : ''}  </>
                  ) : null}
                  {ev.location && <><MapPin size={12} /> {ev.location}  </>}
                  {ev.recurring_pattern && <span className="badge badge-orange" style={{ marginLeft: 4 }}>{ev.recurring_pattern}</span>}
                  <span className={`event-item-member ${ev.family_member.toLowerCase()}`}>
                    {ev.family_member}
                  </span>
                </div>
              </div>
              <button className="btn btn-icon btn-sm" onClick={() => deleteEvent(ev.id)} style={{ border: 'none', color: 'var(--text-muted)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEvent ? 'Edit Event' : 'New Event'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Event title" autoFocus />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={formData.event_date} onChange={e => setFormData({ ...formData, event_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input type="time" value={formData.event_time} onChange={e => setFormData({ ...formData, event_time: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration</label>
                  <select value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}>
                    <option value="0">All Day</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
                {formData.duration_minutes === 0 && (
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={formData.event_end_date} onChange={e => setFormData({ ...formData, event_end_date: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={formData.event_type} onChange={e => setFormData({ ...formData, event_type: e.target.value })}>
                    <option value="general">General</option>
                    <option value="appointment">Appointment</option>
                    <option value="school">School</option>
                    <option value="activity">Activity</option>
                    <option value="trip">Trip</option>
                    <option value="birthday">Birthday</option>
                    <option value="holiday">Holiday</option>
                    <option value="doctor">Doctor</option>
                    <option value="sport">Sport</option>
                    <option value="date_night">Date Night</option>
                    <option value="meal">Meal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Family Member</label>
                  <select value={formData.family_member} onChange={e => setFormData({ ...formData, family_member: e.target.value })}>
                    <option value="Family">Family</option>
                    <option value="Terry">Terry</option>
                    <option value="Donna">Donna</option>
                    <option value="Sienna">Sienna</option>
                    <option value="Genevieve">Genevieve</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Location" />
              </div>

              {/* Recurrence */}
              <div className="form-row">
                <div className="form-group">
                  <label>Recurrence</label>
                  <select value={formData.recurring_pattern} onChange={e => setFormData({ ...formData, recurring_pattern: e.target.value })}>
                    {RECURRENCE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {formData.recurring_pattern && !editingEvent && (
                  <div className="form-group">
                    <label>Generate (weeks/months)</label>
                    <input
                      type="number"
                      min="2"
                      max="52"
                      value={recurrenceCount}
                      onChange={e => setRecurrenceCount(parseInt(e.target.value) || 12)}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Details..." />
              </div>
              {formData.recurring_pattern && !editingEvent && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  This will generate {recurrenceCount} events starting from the selected date.
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingEvent ? 'Update' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
