import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Settings, Layers, Zap } from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trackers', icon: Layers, label: 'Trackers' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#0c0c1e', borderRight: '1px solid #2a2a45' }}>
      <div className="p-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-white text-sm">Life Tracker</div>
          <div className="text-xs" style={{ color: '#64748b' }}>Stay consistent</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`
            }
            style={({ isActive }) => isActive ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' } : {}}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} style={isActive ? { color: '#818cf8' } : {}} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid #2a2a45' }}>
        <div className="text-xs text-center" style={{ color: '#334155' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </aside>
  );
}
