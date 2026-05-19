import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }
const MEAL_COLORS = { breakfast: '#f7931a', lunch: '#6f42c1', dinner: '#007bff' }

export default function MealPlan() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()))
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ day_of_week: 0, meal_type: 'dinner', dish: '', notes: '' })
  const [error, setError] = useState('')

  function getWeekStart(d) {
    const dt = new Date(d)
    const day = dt.getDay()
    dt.setDate(dt.getDate() - day)
    return dt.toISOString().split('T')[0]
  }

  useEffect(() => { loadMeals() }, [weekStart])

  async function loadMeals() {
    try {
      const { data } = await supabase
        .from('meal_plan')
        .select('*')
        .eq('week_start', weekStart)
        .order('day_of_week')
        .order('meal_type')
      setMeals(data || [])
    } catch (err) {
      console.error('Failed to load meals:', err)
    } finally {
      setLoading(false)
    }
  }

  function getMealsForDay(dayIdx) {
    return meals.filter(m => m.day_of_week === dayIdx)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!formData.dish.trim()) return
    try {
      const existing = meals.find(m => m.day_of_week === formData.day_of_week && m.meal_type === formData.meal_type)
      if (existing) {
        await supabase.from('meal_plan').update({ dish: formData.dish, notes: formData.notes }).eq('id', existing.id)
      } else {
        await supabase.from('meal_plan').insert({ week_start: weekStart, ...formData, dish: formData.dish })
      }
      setShowForm(false)
      loadMeals()
    } catch (err) {
      console.error('Failed to save:', err)
      setError('Failed to save: ' + err.message)
    }
  }

  async function removeMeal(meal) {
    try {
      await supabase.from('meal_plan').delete().eq('id', meal.id)
      loadMeals()
    } catch (err) {
      console.error('Failed to remove:', err)
    }
  }

  const weekStartDate = new Date(weekStart + 'T12:00:00')

  if (loading) return <div className="loading-state">Loading meal plan...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Meal Plan</h1>
        <p>Weekly meal planning</p>
      </div>

      <div className="calendar-nav" style={{ marginBottom: 16 }}>
        <div className="calendar-nav-buttons">
          <button className="btn btn-sm" onClick={() => {
            const d = new Date(weekStart)
            d.setDate(d.getDate() - 7)
            setWeekStart(d.toISOString().split('T')[0])
          }}><ChevronLeft size={16} /></button>
          <button className="btn btn-sm" onClick={() => {
            const d = new Date(weekStart)
            d.setDate(d.getDate() + 7)
            setWeekStart(d.toISOString().split('T')[0])
          }}><ChevronRight size={16} /></button>
        </div>
        <h2 style={{ fontSize: 16 }}>{weekStartDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {new Date(weekStartDate.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><Plus size={14} /> Add Meal</button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(220,53,69,0.08)', color: 'var(--red)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Unified 7-Day x 3-Meal Grid */}
      <div className="meal-grid-unified">
        {/* Header Row */}
        <div className="meal-grid-header" style={{ background: 'var(--bg-card)', fontWeight: 600 }}>Day</div>
        {DAY_SHORT.map((d, i) => (
          <div key={i} className="meal-grid-header" style={{ background: 'var(--bg-card)', fontWeight: 600 }}>
            {d}
          </div>
        ))}

        {/* Meal Type Rows */}
        {MEAL_TYPES.map(type => (
          <div key={type} style={{ display: 'contents' }}>
            <div
              className="meal-grid-header"
              style={{
                background: 'var(--bg-card)',
                fontWeight: 600,
                color: MEAL_COLORS[type],
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {MEAL_LABELS[type]}
            </div>
            {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
              const dayMeals = getMealsForDay(dayIdx)
              const meal = dayMeals.find(m => m.meal_type === type)
              return (
                <div
                  key={`${type}-${dayIdx}`}
                  className="meal-grid-cell"
                  onClick={() => {
                    setFormData({ day_of_week: dayIdx, meal_type: type, dish: meal?.dish || '', notes: meal?.notes || '' })
                    setShowForm(true)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {meal ? (
                    <div>
                      <div className="meal-dish" style={{ fontSize: 12 }}>{meal.dish}</div>
                      {meal.notes && <div className="meal-notes" style={{ fontSize: 10 }}>{meal.notes}</div>}
                      <button
                        onClick={e => { e.stopPropagation(); removeMeal(meal) }}
                        style={{
                          border: 'none', background: 'none', color: 'var(--text-muted)',
                          cursor: 'pointer', fontSize: 10, padding: 0, marginTop: 2
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, opacity: 0.5 }}>—</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Add/Edit Meal Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formData.dish ? 'Edit Meal' : 'Add Meal'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Day</label>
                  <select value={formData.day_of_week} onChange={e => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}>
                    {DAY_NAMES.map((name, i) => (
                      <option key={i} value={i}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Meal</label>
                  <select value={formData.meal_type} onChange={e => setFormData({ ...formData, meal_type: e.target.value })}>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Dish</label>
                <input value={formData.dish} onChange={e => setFormData({ ...formData, dish: e.target.value })} placeholder="What are we eating?" autoFocus />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Recipe, restaurant, etc." />
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{formData.dish ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
