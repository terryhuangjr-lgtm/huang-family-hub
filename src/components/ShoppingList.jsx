import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2 } from 'lucide-react'

export default function ShoppingList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('pending')

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

  async function addItem(e) {
    e.preventDefault()
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
          onKeyDown={e => e.key === 'Enter' && addItem(e)}
          placeholder="Add an item..."
        />
        <button type="button" className="btn btn-primary" onClick={addItem}><Plus size={16} /></button>
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
    </div>
  )
}
