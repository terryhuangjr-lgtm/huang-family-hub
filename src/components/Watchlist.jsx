import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2 } from 'lucide-react'

export default function Watchlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [formData, setFormData] = useState({ title: '', media_type: 'movie', added_by: 'Family' })

  useEffect(() => {
    loadItems()
    const channel = supabase.channel('watchlist-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlist' }, loadItems)
      .subscribe()
    return () => supabase.removeChannel(channel)
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

  async function toggleWatched(item) {
    try {
      await supabase.from('watchlist').update({
        watched: !item.watched,
        watched_at: !item.watched ? new Date().toISOString() : null
      }).eq('id', item.id)
      loadItems()
    } catch (err) {
      console.error('Failed to toggle:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.title.trim()) return
    try {
      await supabase.from('watchlist').insert({ ...formData, title: formData.title.trim() })
      setFormData({ title: '', media_type: 'movie', added_by: 'Family' })
      setShowForm(false)
      loadItems()
    } catch (err) {
      console.error('Failed to add:', err)
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

  const filteredItems = items.filter(i => {
    if (filter === 'all') return true
    if (filter === 'to-watch') return !i.watched
    if (filter === 'watched') return i.watched
    return true
  })

  if (loading) return <div className="loading-state">Loading watchlist...</div>

  const mediaIcons = {
    movie: 'Movie', tv_show: 'TV Show', documentary: 'Doc', anime: 'Anime'
  }

  return (
    <div>
      <div className="page-header">
        <h1>Watchlist</h1>
        <p>Movies and shows to watch</p>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['all', 'to-watch', 'watched'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: filter === f ? 'var(--orange-light)' : 'transparent',
              color: filter === f ? 'var(--orange)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              borderColor: filter === f ? 'var(--orange)' : 'var(--border)'
            }}
          >
            {f === 'all' ? 'All' : f === 'to-watch' ? 'To Watch' : 'Watched'}
          </button>
        ))}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="card">
        {filteredItems.length === 0 ? (
          <div className="empty-state">No items in this list</div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="watchlist-item">
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
              <div className="watchlist-info">
                <div className={`watchlist-title ${item.watched ? 'watched' : ''}`}>
                  {item.title}
                </div>
                <div className="watchlist-meta">
                  <span className={`badge badge-${item.media_type === 'movie' ? 'blue' : item.media_type === 'tv_show' ? 'purple' : 'gray'}`}>
                    {mediaIcons[item.media_type] || item.media_type}
                  </span>
                  {item.added_by && <> Added by {item.added_by}</>}
                  {item.watched && item.watched_at && <> Watched {new Date(item.watched_at).toLocaleDateString()}</>}
                </div>
              </div>
              <button onClick={() => deleteItem(item.id)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add to Watchlist</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Movie or show title" autoFocus />
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
