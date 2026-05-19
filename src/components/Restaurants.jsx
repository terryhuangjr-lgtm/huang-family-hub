import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Edit3 } from 'lucide-react'

const CUISINES = ['american', 'chinese', 'japanese', 'italian', 'mexican', 'korean', 'indian', 'thai', 'vietnamese', 'mediterranean', 'french', 'other']
const CUISINE_LABELS = {
  american: 'American', chinese: 'Chinese', japanese: 'Japanese', italian: 'Italian',
  mexican: 'Mexican', korean: 'Korean', indian: 'Indian', thai: 'Thai',
  vietnamese: 'Vietnamese', mediterranean: 'Mediterranean', french: 'French', other: 'Other'
}

export default function Restaurants() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [activeFilter, setActiveFilter] = useState('pending')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '', cuisine: 'other', notes: '', added_by: 'Family'
  })

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
      setItems(data || [])
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({ name: '', cuisine: 'other', notes: '', added_by: 'Family' })
    setError('')
    setEditItem(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!formData.name.trim()) return
    try {
      const payload = {
        name: formData.name.trim(),
        cuisine: formData.cuisine,
        notes: formData.notes || null,
        added_by: formData.added_by
      }
      if (editItem) {
        await supabase.from('restaurants').update(payload).eq('id', editItem.id)
      } else {
        await supabase.from('restaurants').insert(payload)
      }
      resetForm()
      setShowForm(false)
      loadItems()
    } catch (err) {
      console.error('Failed to save:', err)
      setError('Failed to save: ' + err.message)
    }
  }

  async function toggleVisited(item) {
    const newVisited = !item.visited
    try {
      await supabase.from('restaurants').update({
        visited: newVisited,
        visited_at: newVisited ? new Date().toISOString() : null
      }).eq('id', item.id)
      loadItems()
    } catch (err) {
      console.error('Failed to toggle:', err)
    }
  }

  async function deleteItem(id) {
    try {
      await supabase.from('restaurants').delete().eq('id', id)
      loadItems()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  function openEdit(item) {
    setEditItem(item)
    setFormData({
      name: item.name,
      cuisine: item.cuisine || 'other',
      notes: item.notes || '',
      added_by: item.added_by || 'Family'
    })
    setShowForm(true)
  }

  function openAdd() {
    resetForm()
    setShowForm(true)
  }

  const filteredItems = items.filter(i =>
    activeFilter === 'all' ? true : activeFilter === 'visited' ? i.visited : !i.visited
  )

  if (loading) return <div className="loading-state">Loading restaurants...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Restaurants to Try</h1>
        <p>Places we want to eat</p>
      </div>

      <button type="button" className="btn btn-primary" onClick={openAdd} style={{ marginBottom: 16 }}>
        <Plus size={14} /> Add Restaurant
      </button>

      <div className="filter-bar" style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['pending', 'visited', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: activeFilter === f ? 'var(--orange-light)' : 'transparent',
              color: activeFilter === f ? 'var(--orange)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              borderColor: activeFilter === f ? 'var(--orange)' : 'var(--border)'
            }}
          >
            {f === 'all' ? 'All' : f === 'visited' ? 'Visited' : 'To Try'}
          </button>
        ))}
      </div>

      <div className="card">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            {activeFilter === 'visited' ? 'No restaurants visited yet' : 'No restaurants added yet'}
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="list-item">
              <div
                className={`checkbox ${item.visited ? 'checked' : ''}`}
                onClick={() => toggleVisited(item)}
              >
                {item.visited && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="list-item-content">
                <div className="list-item-title" style={{ textDecoration: item.visited ? 'line-through' : 'none', color: item.visited ? 'var(--text-muted)' : 'var(--text)' }}>
                  {item.name}
                </div>
                <div className="list-item-sub">
                  <span className={`badge badge-${item.cuisine === 'italian' || item.cuisine === 'french' ? 'orange' : item.cuisine === 'japanese' || item.cuisine === 'chinese' || item.cuisine === 'korean' || item.cuisine === 'indian' || item.cuisine === 'thai' || item.cuisine === 'vietnamese' ? 'blue' : 'gray'}`}>
                    {CUISINE_LABELS[item.cuisine] || item.cuisine}
                  </span>
                  {item.notes && <> — {item.notes}</>}
                  {item.added_by && <> Added by {item.added_by}</>}
                </div>
              </div>
              <button onClick={() => openEdit(item)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: 4 }} title="Edit">
                <Edit3 size={14} />
              </button>
              <button onClick={() => deleteItem(item.id)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(220,53,69,0.08)', color: 'var(--red)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { resetForm(); setShowForm(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Restaurant' : 'Add Restaurant'}</h2>
              <button className="modal-close" onClick={() => { resetForm(); setShowForm(false) }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Restaurant name"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cuisine</label>
                  <select value={formData.cuisine} onChange={e => setFormData({ ...formData, cuisine: e.target.value })}>
                    {CUISINES.map(c => <option key={c} value={c}>{CUISINE_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Added By</label>
                  <select value={formData.added_by} onChange={e => setFormData({ ...formData, added_by: e.target.value })}>
                    <option value="Family">Family</option>
                    <option value="Terry">Terry</option>
                    <option value="Donna">Donna</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any notes..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => { resetForm(); setShowForm(false) }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
