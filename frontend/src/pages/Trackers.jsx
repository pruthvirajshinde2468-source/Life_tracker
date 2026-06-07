import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Flame, CheckCircle, Circle, BookOpen, Dumbbell, Languages, Target, Code, Star, Trash2, Play } from 'lucide-react';
import { trackers as trackersApi } from '../api';
import ProgressRing from '../components/ProgressRing';
import StreakBadge from '../components/StreakBadge';
import AddTrackerModal from '../components/AddTrackerModal';
import LogModal from '../components/LogModal';

const TYPE_ICONS = { study: BookOpen, fitness: Dumbbell, language: Languages, habit: Target, skill: Code, custom: Star };

const FILTERS = ['All', 'Study', 'Fitness', 'Language', 'Habit', 'Skill', 'Custom'];

export default function Trackers() {
  const navigate = useNavigate();
  const [trackers, setTrackers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [logTarget, setLogTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = () => trackersApi.getAll().then(setTrackers);
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const filtered = trackers.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || t.type === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  const confirmDelete = async (t) => {
    if (window.confirm(`Delete "${t.name}"? This cannot be undone.`)) {
      await trackersApi.delete(t.id);
      load();
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trackers</h1>
          <p className="text-gray-400 text-sm mt-1">{trackers.length} tracker{trackers.length !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Plus size={16} /> New Tracker</button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input placeholder="Search trackers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: filter === f ? '#6366f1' : '#1e1e35', color: filter === f ? 'white' : '#94a3b8', border: `1px solid ${filter === f ? '#6366f1' : '#2a2a45'}` }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 mb-4">{search || filter !== 'All' ? 'No trackers match your search' : 'No trackers yet'}</p>
          {!search && filter === 'All' && (
            <button onClick={() => setShowAdd(true)} className="btn btn-primary mx-auto"><Plus size={16} /> Create First Tracker</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(t => {
            const Icon = TYPE_ICONS[t.type] || Star;
            const pct = t.goal_total > 0 ? Math.min(100, ((t.total_value || 0) / t.goal_total) * 100) : 0;
            const loggedToday = t.last_logged_date === today;
            const activeStreak = t.last_logged_date === today || t.last_logged_date === yesterday;
            const itemPct = t.total_items > 0 ? Math.round((t.completed_items / t.total_items) * 100) : 0;

            return (
              <div key={t.id} className="card group relative overflow-hidden cursor-pointer"
                onClick={() => navigate(`/trackers/${t.id}`)}>
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${t.color}, transparent)` }} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: t.color + '20' }}>
                        <Icon size={18} style={{ color: t.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white truncate">{t.name}</h3>
                          {loggedToday && <CheckCircle size={14} className="flex-shrink-0" style={{ color: '#22c55e' }} />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description || t.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setLogTarget(t)} className="p-1.5 rounded-lg hover:bg-green-500/10 text-gray-500 hover:text-green-400 transition-colors">
                        <Play size={14} />
                      </button>
                      <button onClick={() => confirmDelete(t)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="space-y-3 flex-1">
                      {t.goal_total > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                            <span>Progress</span>
                            <span style={{ color: t.color }}>{t.total_value || 0} / {t.goal_total} {t.unit}</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#1e1e35' }}>
                            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: t.color }} />
                          </div>
                        </div>
                      )}

                      {t.total_items > 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle size={12} style={{ color: t.completed_items > 0 ? '#22c55e' : '#64748b' }} />
                          <span>{t.completed_items || 0}/{t.total_items} items</span>
                          {t.completed_items > 0 && <span style={{ color: t.color }}>{itemPct}%</span>}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <StreakBadge streak={t.current_streak} lastDate={t.last_logged_date} size="sm" />
                        {t.longest_streak > 0 && (
                          <span className="text-xs text-gray-500">Best: {t.longest_streak}d</span>
                        )}
                      </div>
                    </div>

                    {t.goal_total > 0 && (
                      <div className="ml-4">
                        <ProgressRing percent={pct} color={t.color} size={60} strokeWidth={5}>
                          <span className="text-xs font-bold" style={{ color: t.color }}>{Math.round(pct)}%</span>
                        </ProgressRing>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddTrackerModal onClose={() => setShowAdd(false)} onCreated={load} />}
      {logTarget && <LogModal tracker={logTarget} onClose={() => setLogTarget(null)} onLogged={load} />}
    </div>
  );
}
