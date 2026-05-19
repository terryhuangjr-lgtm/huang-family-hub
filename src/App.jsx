import { useState } from 'react'
import { CalendarDays, ListTodo, ShoppingCart, UtensilsCrossed, Clapperboard } from 'lucide-react'
import CalendarView from './components/CalendarView'
import TaskList from './components/TaskList'
import ShoppingList from './components/ShoppingList'
import MealPlan from './components/MealPlan'
import Watchlist from './components/Watchlist'
import './styles/index.css'

const navItems = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
  { id: 'meals', label: 'Meals', icon: UtensilsCrossed },
  { id: 'watchlist', label: 'Watchlist', icon: Clapperboard },
]

export default function App() {
  const [activeView, setActiveView] = useState('calendar')

  return (
    <div className="app-layout">
      <header className="top-header">
        <div className="header-left">
          <h1 className="header-title">Huang Family Hub</h1>
        </div>
      </header>

      <nav className="top-nav">
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`nav-item-top ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <main className="main-content">
        <div className="content-area">
          {activeView === 'calendar' && <CalendarView onNavigate={setActiveView} />}
          {activeView === 'tasks' && <TaskList />}
          {activeView === 'shopping' && <ShoppingList />}
          {activeView === 'meals' && <MealPlan />}
          {activeView === 'watchlist' && <Watchlist />}
        </div>
      </main>
    </div>
  )
}
