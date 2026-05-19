import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2 } from 'lucide-react'

export default function ShoppingList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    item: '', category: 'groceries', quantity: 1, notes: '', added_by: 'Family'
  })

  useEffect(() => {
    loadItems()
    const channel = supabase.channel('shopping-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, loadItems)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadItems() {
    try {
      const { data } = await supabase
        .from('shopping_list')
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

  async function toggleItem(item) {
    const newStatus = item.status === 'bought' ? 'pending' : 'bought'
    try {
      await supabase.from('shopping_list').update({
        status: newStatus,
        bought_at: newStatus === 'bought' ? new Date().toISOString() : null
      }).eq('id', item.id)
      loadItems()
    } catch (err) {
      console.error('Failed to toggle:', err)
    }
  }

  function resetForm() {
    setFormData({ item: '', category: 'groceries', quantity: 1, notes: '', added_by: 'Family' })
    setNewItem('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!formData.item.trim()) return
    try {
      await supabase.from('shopping_list').insert({
        item: formData.item.trim(),
        category: formData.category,
        quantity: formData.quantity || 1,
        notes: formData.notes || null,
        added_by: formData.added_by
      })
      resetForm()
      setShowForm(false)
      loadItems()
    } catch (err) {
      console.error('Failed to add:', err)
      setError('Failed to add: ' + err.message)
    }
  }

  async function deleteItem(id) {
    try {
      await supabase.from('shopping_list').delete().eq('id', id)
      loadItems()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  async function quickAdd(e) {
    e.preventDefault()
    setError('')
    if (!newItem.trim()) return
    try {
      await supabase.from('shopping_list').insert({
        item: newItem.trim(),
        added_by: 'Family'
      })
      setNewItem('')
      loadItems()
    } catch (err) {
      console.error('Failed to add:', err)
      setError('Failed to add: ' + err.message)
    }
  }

  const filteredItems = items.filter(i =>
    filter === 'all' ? true : i.status === filter
  )

  if (loading) return <div className="loading-state">Loading shopping list...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Shopping List</h1>
        <p>Family grocery and household items</p>
      </div>

      <div className="quick-add">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && quickAdd(e)}
          placeholder="Quick add an item..."
        />
        <button type="button" className="btn btn-primary" onClick={quickAdd}><Plus size={16} /></button>
        <button type="button" className="btn" onClick={() => { setError(''); resetForm(); setShowForm(true) }} style={{ whiteSpace: 'nowrap' }}>
          + Details
        </button>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['pending', 'bought', 'all'].map(f => (
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
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        {filteredItems.length === 0 ? (
          <div className="empty-state">No items</div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="list-item">
              <div
                className={`checkbox ${item.status === 'bought' ? 'checked' : ''}`}
                onClick={() => toggleItem(item)}
              >
                {item.status === 'bought' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="list-item-content">
                <div className="list-item-title" style={{ textDecoration: item.status === 'bought' ? 'line-through' : 'none', color: item.status === 'bought' ? 'var(--text-muted)' : 'var(--text)' }}>
                  {item.item}
                </div>
                <div className="list-item-sub">
                  <span className={`badge badge-${item.category === 'groceries' ? 'orange' : item.category === 'household' ? 'blue' : 'gray'}`}>
                    {item.category}
                  </span>
                  {item.quantity && <> x{item.quantity}</>}
                  {item.notes && <> — {item.notes}</>}
                  {item.added_by && <> Added by {item.added_by}</>}
                </div>
              </div>
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

      {/* Add Item Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Item</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item</label>
                <input
                  value={formData.item}
                  onChange={e => setFormData({ ...formData, item: e.target.value })}
                  placeholder="What do we need?"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    <option value="groceries">Groceries</option>
                    <option value="household">Household</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="form-row">
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
                  placeholder="Brand, size, special instructions..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
