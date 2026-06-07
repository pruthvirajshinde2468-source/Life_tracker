import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Flame, TrendingUp, Calendar, Activity, Plus, ChevronRight, Zap, Trophy, Check } from 'lucide-react';
import { analytics, trackers as trackersApi, ai } from '../api';
import ProgressRing from '../components/ProgressRing';
import StreakBadge from '../components/StreakBadge';
import LogModal from '../components/LogModal';
import AddTrackerModal from '../components/AddTrackerModal';

const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg p-3 text-sm">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [logTarget, setLogTarget] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const load = async () => {
    const [ov, wk, trs] = await Promise.all([analytics.overview(), analytics.weekly(), trackersApi.getAll()]);
    setOverview(ov);
    setWeeklyData(wk);
    setTrackers(trs);
  };

  useEffect(() => { load(); }, []);

  const getAiInsight = async () => {
    if (loadingAi) return;
    setLoadingAi(true);
    setAiInsight('');
    const activeTrackers = trackers.slice(0, 3).map(t => ({
      name: t.name, type: t.type, streak: t.current_streak || 0,
      total: t.total_value || 0, unit: t.unit,
    }));
    const prompt = `You are a motivating life coach. Here's my tracker data: ${JSON.stringify(activeTrackers)}. Give me ONE powerful, specific insight or tip (2-3 sentences max) to help me stay consistent and grow. Be direct and encouraging.`;
    try {
      const res = await ai.generate(prompt);
      setAiInsight(res.response || 'Ollama is not running. Start it with: ollama serve');
    } catch {
      setAiInsight('Start Ollama (ollama serve) and install a model (ollama pull llama3) to get AI insights.');
    }
    setLoadingAi(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const activeStreakTrackers = trackers.filter(t => t.last_logged_date === today || t.last_logged_date === yesterday);
  const notLoggedToday = trackers.filter(t => t.last_logged_date !== today);

  const chartData = weeklyData.map(day => {
    const d = new Date(day.date);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    return { label, total: day.total, entries: day.entries };
  });

  const statCards = [
    { label: 'Trackers', value: overview?.total_trackers || 0, icon: Activity, color: '#6366f1', sub: 'active goals' },
    { label: 'Active Streaks', value: overview?.active_streaks || 0, icon: Flame, color: '#f97316', sub: 'on fire' },
    { label: 'Logged Today', value: overview?.today_logs || 0, icon: Calendar, color: '#22c55e', sub: 'activities' },
    { label: 'This Week', value: overview?.week_logs || 0, icon: TrendingUp, color: '#3b82f6', sub: 'sessions' },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting} 👋</h1>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus size={16} /> New Tracker
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-bold text-white mt-1">{value}</p>
                <p className="text-xs mt-1" style={{ color: color + 'aa' }}>{sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
                <Icon size={20} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Weekly Chart */}
        <div className="col-span-3 card p-5">
          <h3 className="font-semibold text-white mb-4">This Week's Activity</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={32}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.label === new Date().toLocaleDateString('en-US', { weekday: 'short' }) ? '#6366f1' : '#6366f130'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Streaks Panel */}
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Active Streaks</h3>
            <Flame size={18} className="streak-glow" style={{ color: '#f97316' }} />
          </div>
          {activeStreakTrackers.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <Zap size={24} className="mx-auto mb-2 opacity-30" />
              No active streaks. Log something today!
            </div>
          ) : (
            <div className="space-y-3">
              {activeStreakTrackers.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between cursor-pointer hover:opacity-80" onClick={() => navigate(`/trackers/${t.id}`)}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    <span className="text-sm text-gray-300 truncate max-w-24">{t.name}</span>
                  </div>
                  <StreakBadge streak={t.current_streak} lastDate={t.last_logged_date} size="sm" />
                </div>
              ))}
            </div>
          )}
          {activeStreakTrackers.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid #2a2a45' }}>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Trophy size={12} style={{ color: '#f59e0b' }} />
                Best combined streak: {Math.max(...trackers.map(t => t.longest_streak || 0), 0)} days
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Log + Trackers */}
      <div className="grid grid-cols-2 gap-6">
        {/* Log Today */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">Log Today</h3>
          {notLoggedToday.length === 0 ? (
            <div className="text-center py-6 text-green-400 text-sm">
              <Check size={24} className="mx-auto mb-2" />
              All logged for today!
            </div>
          ) : (
            <div className="space-y-2">
              {notLoggedToday.slice(0, 5).map(t => (
                <button key={t.id} onClick={() => setLogTarget(t)}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left"
                  style={{ background: '#10101e', border: '1px solid #2a2a45' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = t.color + '50'; e.currentTarget.style.background = t.color + '08'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a45'; e.currentTarget.style.background = '#10101e'; }}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                    <span className="text-sm text-gray-300">{t.name}</span>
                    <span className="text-xs text-gray-500">{t.unit}</span>
                  </div>
                  <Plus size={16} className="text-gray-500" />
                </button>
              ))}
              {notLoggedToday.length > 5 && <p className="text-xs text-gray-500 text-center">+{notLoggedToday.length - 5} more</p>}
            </div>
          )}
        </div>

        {/* AI Insight */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">AI Coach</h3>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#6366f120', color: '#818cf8' }}>Ollama</span>
          </div>
          {aiInsight ? (
            <p className="text-sm text-gray-300 leading-relaxed">{aiInsight}</p>
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-500 text-sm mb-4">Get a personalized insight based on your current progress</div>
              <button onClick={getAiInsight} disabled={loadingAi} className="btn btn-secondary">
                {loadingAi ? (
                  <span className="flex items-center gap-2"><span className="animate-spin">◌</span> Thinking...</span>
                ) : (
                  <span>Get AI Insight</span>
                )}
              </button>
            </div>
          )}
          {aiInsight && (
            <button onClick={getAiInsight} disabled={loadingAi} className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              {loadingAi ? 'Thinking...' : 'Get another insight →'}
            </button>
          )}
        </div>
      </div>

      {/* All Trackers Preview */}
      {trackers.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">All Trackers</h3>
            <button onClick={() => navigate('/trackers')} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {trackers.slice(0, 6).map(t => {
              const pct = t.goal_total > 0 ? Math.min(100, ((t.total_value || 0) / t.goal_total) * 100) : 0;
              const loggedToday = t.last_logged_date === today;
              return (
                <button key={t.id} onClick={() => navigate(`/trackers/${t.id}`)}
                  className="card card-interactive p-4 text-left flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <ProgressRing percent={pct} color={t.color} size={52} strokeWidth={5}>
                      <span className="text-xs font-bold" style={{ color: t.color }}>{Math.round(pct)}%</span>
                    </ProgressRing>
                    {loggedToday && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400" style={{ border: '2px solid #16162a' }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white truncate">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.total_value || 0} {t.unit}</p>
                    <StreakBadge streak={t.current_streak} lastDate={t.last_logged_date} size="sm" showLabel={false} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {trackers.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-white mb-2">No trackers yet</h2>
          <p className="text-gray-400 mb-6">Create your first tracker to start building habits and tracking progress</p>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary mx-auto"><Plus size={16} /> Create First Tracker</button>
        </div>
      )}

      {logTarget && <LogModal tracker={logTarget} onClose={() => setLogTarget(null)} onLogged={load} />}
      {showAdd && <AddTrackerModal onClose={() => setShowAdd(false)} onCreated={load} />}
    </div>
  );
}
