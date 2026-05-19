import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2 } from 'lucide-react'

export default function TaskList() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [filter, setFilter] = useState('all')

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

  async function addTask(e) {
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

  async function deleteTask(id) {
    try {
      await supabase.from('tasks').delete().eq('id', id)
      loadTasks()
    } catch (err) {
      console.error('Failed to delete:', err)
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
          onKeyDown={e => e.key === 'Enter' && addTask(e)}
          placeholder="Add a task..."
        />
        <button type="button" className="btn btn-primary" onClick={addTask}><Plus size={16} /></button>
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
              <button onClick={() => deleteTask(task.id)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
