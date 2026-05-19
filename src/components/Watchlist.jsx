import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Edit3 } from 'lucide-react'

const CATEGORIES = ['Family Movie', 'Kids', 'Date Night', 'Must Watch', 'Terry', 'Donna']

export default function Watchlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [activeCategory, setActiveCategory] = useState('Family Movie')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '', category: 'Family Movie', notes: '', url: ''
  })

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const { data } = await supabase
        .from('watchlist')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setItems(data || [])
    } catch (err) {
      console.error('Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({ title: '', category: activeCategory, notes: '', url: '' })
    setError('')
    setEditItem(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!formData.title.trim()) return
    try {
      if (editItem) {
        await supabase.from('watchlist').update({
          title: formData.title.trim(),
          category: formData.category,
          notes: formData.notes || null,
          url: formData.url || null
        }).eq('id', editItem.id)
      } else {
        await supabase.from('watchlist').insert({
          title: formData.title.trim(),
          category: formData.category,
          notes: formData.notes || null,
          url: formData.url || null,
          status: 'pending'
        })
      }
      resetForm()
      setShowForm(false)
      loadItems()
    } catch (err) {
      console.error('Failed to save:', err)
      setError('Failed to save: ' + err.message)
    }
  }

  async function markWatched(item) {
    try {
      await supabase.from('watchlist').update({ status: 'watched' }).eq('id', item.id)
      loadItems()
    } catch (err) {
      console.error('Failed to mark watched:', err)
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
      category: item.category,
      notes: item.notes || '',
      url: item.url || ''
    })
    setShowForm(true)
  }

  function openAdd() {
    resetForm()
    setShowForm(true)
  }

  const categoryCounts = {}
  items.forEach(i => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1
  })

  const filteredItems = items.filter(i => i.category === activeCategory || activeCategory === 'all')

  if (loading) return <div className="loading-state">Loading watchlist...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Watchlist</h1>
        <p>Movies and shows we want to watch</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
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
            {cat} {categoryCounts[cat] ? `(${categoryCounts[cat]})` : ''}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-primary" onClick={openAdd} style={{ marginBottom: 16 }}>
        <Plus size={14} /> Add Movie/Show
      </button>

      <div className="card">
        {filteredItems.length === 0 ? (
          <div className="empty-state">Nothing in this category</div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="list-item">
              <div className="list-item-content">
                <div className="list-item-title">{item.title}</div>
                <div className="list-item-sub">
                  {item.notes && <>{item.notes}</>}
                  {item.url && <> • <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--orange)', textDecoration: 'none' }}>Link</a></>}
                </div>
              </div>
              <button onClick={() => markWatched(item)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: 4, fontSize: 11 }} title="Mark watched">
                ✓ Watched
              </button>
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
              <h2>{editItem ? 'Edit Movie/Show' : 'Add Movie/Show'}</h2>
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
              <div className="form-group">
                <label>Category</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Why we want to watch this?"
                />
              </div>
              <div className="form-group">
                <label>Link (optional)</label>
                <input
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  placeholder="IMDb, YouTube, trailer URL..."
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
