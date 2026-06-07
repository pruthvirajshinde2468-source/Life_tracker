import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowLeft, Plus, Check, Trash2, Edit3, Flame, Trophy, Calendar, TrendingUp, X, GripVertical, Play, Sparkles } from 'lucide-react';
import { trackers as trackersApi, items as itemsApi, entries as entriesApi, analytics, ai } from '../api';
import ProgressRing from '../components/ProgressRing';
import StreakBadge from '../components/StreakBadge';
import LogModal from '../components/LogModal';

const CustomTooltip = ({ active, payload, label, color }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg p-3 text-sm">
      <p className="text-gray-400 mb-1">{label}</p>
      <p style={{ color }}>{payload[0].value} logged</p>
    </div>
  );
};

export default function TrackerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tracker, setTracker] = useState(null);
  const [items, setItems] = useState([]);
  const [entryData, setEntryData] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [chartDays, setChartDays] = useState(30);
  const [aiMsg, setAiMsg] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [recentEntries, setRecentEntries] = useState([]);

  const load = async () => {
    const [t, its, entries] = await Promise.all([
      trackersApi.get(id),
      itemsApi.getAll(id),
      entriesApi.getAll(id, { limit: 10 }),
    ]);
    setTracker(t);
    setItems(its);
    setRecentEntries(entries);
  };

  const loadChart = async () => {
    const data = await analytics.tracker(id, chartDays);
    setEntryData(data.map(e => ({
      date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: e.value,
    })));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { loadChart(); }, [id, chartDays]);

  const toggleItem = async (item) => {
    await itemsApi.update(id, item.id, { ...item, completed: !item.completed });
    load();
  };

  const deleteItem = async (itemId) => {
    await itemsApi.delete(id, itemId);
    load();
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    await itemsApi.create(id, { name: newItem.trim() });
    setNewItem('');
    setAddingItem(false);
    load();
  };

  const getMotivation = async () => {
    if (!tracker) return;
    setLoadingAi(true);
    setAiMsg('');
    const pct = tracker.goal_total > 0 ? Math.round((tracker.total_value / tracker.goal_total) * 100) : 0;
    const prompt = `Give me a short, powerful motivational message (1-2 sentences) for someone who:
- Is tracking: ${tracker.name} (${tracker.type})
- Current streak: ${tracker.display_streak || 0} days
- Total progress: ${tracker.total_value || 0} ${tracker.unit}
${tracker.goal_total > 0 ? `- Goal completion: ${pct}%` : ''}
${items.length > 0 ? `- Items completed: ${items.filter(i => i.completed).length}/${items.length}` : ''}
Be specific and energizing, not generic.`;
    try {
      const res = await ai.generate(prompt);
      setAiMsg(res.response || 'Ollama not running. Try: ollama serve');
    } catch {
      setAiMsg('Start Ollama to get AI motivation: ollama serve');
    }
    setLoadingAi(false);
  };

  if (!tracker) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading...</div>
    </div>
  );

  const pct = tracker.goal_total > 0 ? Math.min(100, ((tracker.total_value || 0) / tracker.goal_total) * 100) : 0;
  const completedItems = items.filter(i => i.completed);
  const pendingItems = items.filter(i => !i.completed);
  const itemPct = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;
  const today = new Date().toISOString().split('T')[0];

  const stats = [
    { label: 'Current Streak', value: tracker.display_streak || 0, sub: 'days', icon: Flame, color: '#f97316' },
    { label: 'Best Streak', value: tracker.longest_streak || 0, sub: 'days', icon: Trophy, color: '#f59e0b' },
    { label: 'Total Logged', value: tracker.total_value || 0, sub: tracker.unit, icon: TrendingUp, color: tracker.color },
    { label: 'Last Logged', value: tracker.last_logged_date ? new Date(tracker.last_logged_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never', sub: '', icon: Calendar, color: '#64748b' },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/trackers')} className="p-2 rounded-lg hover:bg-hover transition-colors text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{tracker.name}</h1>
            <span className="text-xs px-2 py-1 rounded-full capitalize" style={{ background: tracker.color + '20', color: tracker.color }}>
              {tracker.type}
            </span>
            {tracker.last_logged_date === today && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#22c55e20', color: '#4ade80' }}>
                Logged today
              </span>
            )}
          </div>
          {tracker.description && <p className="text-gray-400 text-sm mt-1">{tracker.description}</p>}
        </div>
        <button onClick={() => setShowLog(true)} className="btn btn-primary" style={{ background: tracker.color }}>
          <Play size={16} /> Log Progress
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
              <Icon size={14} style={{ color }} />
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Progress */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">Overall Progress</h3>
          <div className="flex flex-col items-center gap-4">
            {tracker.goal_total > 0 ? (
              <>
                <ProgressRing percent={pct} color={tracker.color} size={120} strokeWidth={10}>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{Math.round(pct)}%</div>
                    <div className="text-xs text-gray-500">complete</div>
                  </div>
                </ProgressRing>
                <div className="text-center text-sm text-gray-400">
                  <span className="text-white font-semibold">{tracker.total_value || 0}</span> / {tracker.goal_total} {tracker.unit}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-white">{tracker.total_value || 0}</div>
                <div className="text-sm text-gray-400 mt-1">{tracker.unit} logged</div>
              </div>
            )}
            <StreakBadge streak={tracker.display_streak || 0} lastDate={tracker.last_logged_date} size="lg" />
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Activity Chart</h3>
            <div className="flex gap-1">
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => setChartDays(d)}
                  className="px-2 py-1 rounded text-xs transition-all"
                  style={{ background: chartDays === d ? tracker.color : '#1e1e35', color: chartDays === d ? 'white' : '#64748b' }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={entryData}>
              <defs>
                <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tracker.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={tracker.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip color={tracker.color} />} />
              <Area type="monotone" dataKey="value" stroke={tracker.color} strokeWidth={2} fill={`url(#grad-${id})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Items / Chapters / Lessons */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Items / Chapters</h3>
            {items.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">{completedItems.length}/{items.length} complete — {itemPct}%</p>
            )}
          </div>
          <button onClick={() => setAddingItem(true)} className="btn btn-secondary text-xs"><Plus size={14} /> Add Item</button>
        </div>

        {items.length > 0 && (
          <div className="mb-4 h-1.5 rounded-full" style={{ background: '#1e1e35' }}>
            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${itemPct}%`, background: tracker.color }} />
          </div>
        )}

        {addingItem && (
          <div className="flex gap-2 mb-3">
            <input autoFocus placeholder="Chapter name, topic, lesson..." value={newItem}
              onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} />
            <button onClick={addItem} className="btn btn-primary px-3"><Check size={16} /></button>
            <button onClick={() => { setAddingItem(false); setNewItem(''); }} className="btn btn-secondary px-3"><X size={16} /></button>
          </div>
        )}

        {items.length === 0 && !addingItem && (
          <div className="text-center py-6 text-gray-500 text-sm">
            <p>No items yet. Add chapters, lessons, or topics to track your progress.</p>
            <button onClick={() => setAddingItem(true)} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm">Add first item →</button>
          </div>
        )}

        <div className="space-y-1">
          {pendingItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg group transition-colors hover:bg-hover">
              <button onClick={() => toggleItem(item)}
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ border: `2px solid ${tracker.color}50`, background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = tracker.color; e.currentTarget.style.background = tracker.color + '20'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = tracker.color + '50'; e.currentTarget.style.background = 'transparent'; }}>
              </button>
              <span className="text-sm text-gray-300 flex-1">{item.name}</span>
              <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {completedItems.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid #2a2a45' }}>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Completed</p>
              {completedItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg group transition-colors hover:bg-hover opacity-60">
                  <button onClick={() => toggleItem(item)}
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: tracker.color, border: `2px solid ${tracker.color}` }}>
                    <Check size={12} className="text-white" />
                  </button>
                  <span className="text-sm text-gray-500 flex-1 line-through">{item.name}</span>
                  <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Motivation */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: tracker.color }} />
            <h3 className="font-semibold text-white">AI Motivation</h3>
          </div>
          <button onClick={getMotivation} disabled={loadingAi} className="btn btn-secondary text-xs">
            {loadingAi ? 'Thinking...' : 'Get Motivated'}
          </button>
        </div>
        {aiMsg ? (
          <p className="text-sm text-gray-300 leading-relaxed italic">"{aiMsg}"</p>
        ) : (
          <p className="text-sm text-gray-500">Click to get a personalized motivational message from your Ollama AI coach.</p>
        )}
      </div>

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">Recent Log</h3>
          <div className="space-y-2">
            {recentEntries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #1e1e35' }}>
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: tracker.color }} />
                  <span className="text-sm text-gray-400">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  {entry.notes && <span className="text-xs text-gray-500 italic truncate max-w-48">"{entry.notes}"</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: tracker.color }}>+{entry.value} {tracker.unit}</span>
                  <button onClick={async () => { await entriesApi.delete(entry.id); load(); loadChart(); }}
                    className="p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLog && <LogModal tracker={tracker} onClose={() => setShowLog(false)} onLogged={() => { load(); loadChart(); }} />}
    </div>
  );
}
