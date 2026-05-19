import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Edit3 } from 'lucide-react'

export default function Watchlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeFilter, setActiveFilter] = useState('pending')
  const [formData, setFormData] = useState({
    title: '', media_type: 'movie', notes: '', added_by: 'Family'
  })

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const { data } = await supabase
        .from('watchlist')
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
    setFormData({ title: '', media_type: 'movie', notes: '', added_by: 'Family' })
    setEditItem(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim()) return
    try {
      const payload = {
        title: formData.title.trim(),
        media_type: formData.media_type,
        notes: formData.notes || null,
        added_by: formData.added_by
      }
      if (editItem) {
        await supabase.from('watchlist').update(payload).eq('id', editItem.id)
      } else {
        await supabase.from('watchlist').insert(payload)
      }
      resetForm()
      setShowForm(false)
      loadItems()
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  async function toggleWatched(item) {
    const newWatched = !item.watched
    try {
      await supabase.from('watchlist').update({
        watched: newWatched,
        watched_at: newWatched ? new Date().toISOString() : null
      }).eq('id', item.id)
      loadItems()
    } catch (err) {
      console.error('Failed to toggle:', err)
    }
  }

  async function deleteItem(id) {
    try {
      await supabase.from('watchlist').delete().eq('id', id)
      loadItems()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  function openEdit(item) {
    setEditItem(item)
    setFormData({
      title: item.title,
      media_type: item.media_type,
      notes: item.notes || '',
      added_by: item.added_by || 'Family'
    })
    setShowForm(true)
  }

  function openAdd() {
    resetForm()
    setShowForm(true)
  }

  const categories = ['all', 'movie', 'tv_show', 'documentary', 'anime']
  const categoryLabels = { all: 'All', movie: 'Movie', tv_show: 'TV Show', documentary: 'Documentary', anime: 'Anime' }

  const filteredByWatch = items.filter(i =>
    activeFilter === 'all' ? true : activeFilter === 'watched' ? i.watched : !i.watched
  )

  const filteredItems = filteredByWatch.filter(i =>
    activeCategory === 'all' ? true : i.media_type === activeCategory
  )

  if (loading) return <div className="loading-state">Loading watchlist...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Watchlist</h1>
        <p>Movies and shows we want to watch</p>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['pending', 'watched', 'all'].map(f => (
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
            {f === 'all' ? 'All' : f === 'watched' ? 'Watched' : 'To Watch'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'movie', 'tv_show', 'documentary', 'anime'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: activeCategory === cat ? 'var(--orange-light)' : 'transparent',
              color: activeCategory === cat ? 'var(--orange)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              borderColor: activeCategory === cat ? 'var(--orange)' : 'var(--border)'
            }}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-primary" onClick={openAdd} style={{ marginBottom: 16 }}>
        <Plus size={14} /> Add
      </button>

      <div className="card">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            {activeFilter === 'watched' ? 'Nothing watched yet' : 'Nothing to watch'}
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="list-item">
              <div
                className={`checkbox ${item.watched ? 'checked' : ''}`}
                onClick={() => toggleWatched(item)}
              >
                {item.watched && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="list-item-content">
                <div className="list-item-title" style={{ textDecoration: item.watched ? 'line-through' : 'none', color: item.watched ? 'var(--text-muted)' : 'var(--text)' }}>
                  {item.title}
                </div>
                <div className="list-item-sub">
                  <span className={`badge badge-${item.media_type === 'movie' ? 'orange' : item.media_type === 'tv_show' ? 'blue' : 'gray'}`}>
                    {categoryLabels[item.media_type]}
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

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { resetForm(); setShowForm(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit' : 'Add'}</h2>
              <button className="modal-close" onClick={() => { resetForm(); setShowForm(false) }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Movie or show name"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={formData.media_type} onChange={e => setFormData({ ...formData, media_type: e.target.value })}>
                    <option value="movie">Movie</option>
                    <option value="tv_show">TV Show</option>
                    <option value="documentary">Documentary</option>
                    <option value="anime">Anime</option>
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
