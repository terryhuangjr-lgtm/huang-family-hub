import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }

export default function MealPlan() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()))
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ day_of_week: 0, meal_type: 'dinner', dish: '', notes: '' })

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

  function getMeal(dayIdx, type) {
    return meals.find(m => m.day_of_week === dayIdx && m.meal_type === type)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.dish.trim()) return
    try {
      // Upsert: check if exists first
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
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><Plus size={14} /> Add</button>
      </div>

      {/* Weekly Grid */}
      {MEAL_TYPES.map(type => (
        <div key={type} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {MEAL_LABELS[type]}
          </div>
          <div className="meal-grid">
            {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => (
              <>
                <div key={`label-${dayIdx}`} className="meal-day-label">{DAY_SHORT[dayIdx]}</div>
                <div key={`cell-${dayIdx}`} className="meal-cell">
                  {(() => {
                    const meal = getMeal(dayIdx, type)
                    if (!meal) return <div className="empty-state" style={{ padding: 0, fontSize: 12 }}>Empty</div>
                    return (
                      <div>
                        <div className="meal-dish">{meal.dish}</div>
                        {meal.notes && <div className="meal-notes">{meal.notes}</div>}
                        <button
                          onClick={() => removeMeal(meal)}
                          style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, marginTop: 4, padding: 0 }}
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })()}
                </div>
              </>
            ))}
          </div>
        </div>
      ))}

      {/* Add Meal Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Meal</h2>
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
                <button type="submit" className="btn btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
