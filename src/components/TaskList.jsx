import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Edit3 } from 'lucide-react'

export default function TaskList() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '', assigned_to: 'Family', priority: 'medium', due_date: '', notes: ''
  })

  useEffect(() => {
    loadTasks()
    const channel = supabase.channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadTasks)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadTasks() {
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'archived')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
      setTasks(data || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleComplete(task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    try {
      await supabase.from('tasks').update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      }).eq('id', task.id)
      loadTasks()
    } catch (err) {
      console.error('Failed to toggle:', err)
    }
  }

  function resetForm() {
    setFormData({ title: '', assigned_to: 'Family', priority: 'medium', due_date: '', notes: '' })
    setNewTitle('')
    setError('')
    setEditTask(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!formData.title.trim()) return
    try {
      if (editTask) {
        await supabase.from('tasks').update({
          title: formData.title.trim(),
          assigned_to: formData.assigned_to,
          priority: formData.priority,
          due_date: formData.due_date || null,
          notes: formData.notes || null
        }).eq('id', editTask.id)
      } else {
        await supabase.from('tasks').insert({
          title: formData.title.trim(),
          assigned_to: formData.assigned_to,
          priority: formData.priority,
          due_date: formData.due_date || null,
          status: 'pending'
        })
      }
      resetForm()
      setShowForm(false)
      loadTasks()
    } catch (err) {
      console.error('Failed to save:', err)
      setError('Failed to save: ' + err.message)
    }
  }

  async function deleteTask(id) {
    try {
      await supabase.from('tasks').delete().eq('id', id)
      loadTasks()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  function openEdit(task) {
    setEditTask(task)
    setFormData({
      title: task.title,
      assigned_to: task.assigned_to || 'Family',
      priority: task.priority || 'medium',
      due_date: task.due_date || '',
      notes: task.notes || ''
    })
    setShowForm(true)
  }

  function openAdd() {
    resetForm()
    setShowForm(true)
  }

  async function quickAdd(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      await supabase.from('tasks').insert({
        title: newTitle.trim(),
        assigned_to: 'Family',
        priority: 'medium',
        status: 'pending'
      })
      setNewTitle('')
      loadTasks()
    } catch (err) {
      console.error('Failed to add:', err)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true
    if (filter === 'pending') return t.status === 'pending' || t.status === 'in_progress'
    if (filter === 'completed') return t.status === 'completed'
    if (filter === t.assigned_to) return t.status !== 'completed'
    return true
  })

  if (loading) return <div className="loading-state">Loading tasks...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Tasks</h1>
        <p>Family to-do list</p>
      </div>

      <div className="quick-add">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && quickAdd(e)}
          placeholder="Quick add a task..."
        />
        <button type="button" className="btn btn-primary" onClick={quickAdd}><Plus size={16} /></button>
        <button type="button" className="btn" onClick={openAdd} style={{ whiteSpace: 'nowrap' }}>
          + Details
        </button>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'pending', 'completed', 'Terry', 'Donna', 'Family'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: filter === f ? 'var(--orange-light)' : 'transparent',
              color: filter === f ? 'var(--orange)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              borderColor: filter === f ? 'var(--orange)' : 'var(--border)'
            }}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Active' : f === 'completed' ? 'Done' : f}
          </button>
        ))}
      </div>

      <div className="card">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">No tasks yet</div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="list-item">
              <div
                className={`checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                onClick={() => toggleComplete(task)}
              >
                {task.status === 'completed' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="list-item-content">
                <div className="list-item-title" style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none', color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text)' }}>
                  {task.title}
                </div>
                <div className="list-item-sub">
                  <span className={`member-dot ${task.assigned_to?.toLowerCase()}`} style={{ marginRight: 4 }} />
                  {task.assigned_to}
                  {task.due_date && <> Due: {new Date(task.due_date + 'T12:00:00').toLocaleDateString()}</>}
                  {task.priority === 'high' || task.priority === 'urgent' ? (
                    <span className="badge badge-red" style={{ marginLeft: 6 }}>{task.priority}</span>
                  ) : null}
                </div>
              </div>
              <button onClick={() => openEdit(task)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: 4 }} title="Edit">
                <Edit3 size={14} />
              </button>
              <button onClick={() => deleteTask(task.id)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
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

      {/* Add / Edit Task Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { resetForm(); setShowForm(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="modal-close" onClick={() => { resetForm(); setShowForm(false) }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assigned To</label>
                  <select value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}>
                    <option value="Family">Family</option>
                    <option value="Terry">Terry</option>
                    <option value="Donna">Donna</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional details..."
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => { resetForm(); setShowForm(false) }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editTask ? 'Update' : 'Add Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
