import { useState } from 'react'
import CalendarView from './components/CalendarView'
import TaskList from './components/TaskList'
import ShoppingList from './components/ShoppingList'
import MealPlan from './components/MealPlan'
import Watchlist from './components/Watchlist'
import './styles/index.css'

const navItems = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'meals', label: 'Meals' },
  { id: 'watchlist', label: 'Watchlist' },
]

export default function App() {
  const [activeView, setActiveView] = useState('calendar')

  return (
    <div className="app-layout">
      <main className="main-content">
        <div className="content-area">
          {activeView === 'calendar' && <CalendarView onNavigate={setActiveView} />}
          {activeView === 'tasks' && <TaskList />}
          {activeView === 'shopping' && <ShoppingList />}
          {activeView === 'meals' && <MealPlan />}
          {activeView === 'watchlist' && <Watchlist />}
        </div>
      </main>

      <nav className="bottom-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item-bottom ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
