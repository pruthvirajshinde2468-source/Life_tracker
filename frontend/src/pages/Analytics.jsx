import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Award, Flame, Calendar, ChevronDown } from 'lucide-react';
import { analytics as analyticsApi, trackers as trackersApi } from '../api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg p-3 text-sm">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span style={{ color: p.color || p.fill }}>{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  );
};

function Heatmap({ data }) {
  const today = new Date();
  const weeks = [];
  const dateMap = Object.fromEntries(data.map(d => [d.date, d.value]));
  const maxVal = Math.max(...data.map(d => d.value), 1);

  for (let w = 51; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7) - (today.getDay() - d));
      const key = date.toISOString().split('T')[0];
      week.push({ date: key, value: dateMap[key] || 0, future: date > today });
    }
    weeks.push(week);
  }

  const months = [];
  let lastMonth = '';
  weeks.forEach((week, wi) => {
    const m = new Date(week[0].date).toLocaleDateString('en-US', { month: 'short' });
    if (m !== lastMonth) { months.push({ label: m, pos: wi }); lastMonth = m; }
  });

  return (
    <div>
      <div className="flex gap-px mb-1">
        {months.map((m, i) => (
          <div key={i} className="text-xs text-gray-600" style={{ marginLeft: i === 0 ? m.pos * 13 : (m.pos - months[i-1].pos) * 13 - 20 }}>
            {m.label}
          </div>
        ))}
      </div>
      <div className="flex gap-px">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-px">
            {week.map((day, di) => {
              const intensity = day.future ? 0 : Math.min(1, day.value / maxVal);
              const alpha = day.value === 0 ? 0.06 : 0.15 + intensity * 0.85;
              return (
                <div key={di} title={`${day.date}: ${day.value} activities`}
                  className="w-3 h-3 rounded-sm transition-colors"
                  style={{ background: day.value > 0 ? `rgba(99,102,241,${alpha})` : 'rgba(255,255,255,0.05)' }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [report, setReport] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [selectedTracker, setSelectedTracker] = useState('all');

  const load = async () => {
    const [rep, wk, trackerList] = await Promise.all([
      analyticsApi.report(),
      analyticsApi.weekly(),
      trackersApi.getAll(),
    ]);
    setReport(rep);
    setWeeklyData(wk);
    setTrackers(trackerList);
    const hmData = await analyticsApi.heatmap(selectedTracker === 'all' ? null : selectedTracker);
    setHeatmapData(hmData);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    analyticsApi.heatmap(selectedTracker === 'all' ? null : selectedTracker).then(setHeatmapData);
  }, [selectedTracker]);

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const totalWeekSessions = weeklyData.reduce((s, d) => s + d.total, 0);
  const activeDaysThisWeek = weeklyData.filter(d => d.total > 0).length;
  const bestStreak = Math.max(...trackers.map(t => t.longest_streak || 0), 0);
  const activeStreaks = trackers.filter(t => t.last_logged_date === today || t.last_logged_date === yesterday).length;

  const weekChartData = weeklyData.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    total: d.total,
    ...Object.fromEntries(d.entries.map(e => [e.name, e.total])),
  }));

  const trackerColors = Object.fromEntries(trackers.map(t => [t.name, t.color]));

  const pieData = report.map(r => ({
    name: r.tracker.name,
    value: r.week_total,
    color: r.tracker.color,
  })).filter(d => d.value > 0);

  const topTracker = report.sort((a, b) => b.week_total - a.week_total)[0];

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Your progress at a glance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Week Sessions', value: totalWeekSessions, icon: TrendingUp, color: '#6366f1', sub: 'last 7 days' },
          { label: 'Active Days', value: `${activeDaysThisWeek}/7`, icon: Calendar, color: '#22c55e', sub: 'this week' },
          { label: 'Active Streaks', value: activeStreaks, icon: Flame, color: '#f97316', sub: 'ongoing' },
          { label: 'Best Streak', value: bestStreak, icon: Award, color: '#f59e0b', sub: 'days record' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
                <p className="text-xs mt-1" style={{ color: color + 'aa' }}>{sub}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Activity Heatmap</h3>
            <p className="text-xs text-gray-500 mt-0.5">Last 12 months</p>
          </div>
          <select
            value={selectedTracker}
            onChange={e => setSelectedTracker(e.target.value)}
            style={{ width: 'auto', paddingRight: 32 }}
            className="text-sm">
            <option value="all">All Trackers</option>
            {trackers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto pb-2">
          <Heatmap data={heatmapData} />
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
          <span>Less</span>
          {[0.06, 0.25, 0.5, 0.75, 1].map((a, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(99,102,241,${a})` }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-5">
          <h3 className="font-semibold text-white mb-4">Weekly Breakdown by Tracker</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              {trackers.slice(0, 5).map(t => (
                <Bar key={t.id} dataKey={t.name} stackId="a" fill={t.color} radius={trackers.indexOf(t) === trackers.slice(0,5).length - 1 ? [4,4,0,0] : [0,0,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">This Week's Mix</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#16162a', border: '1px solid #2a2a45', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-gray-400 truncate max-w-24">{d.name}</span>
                    </div>
                    <span className="text-gray-300 font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Log activities to see breakdown</div>
          )}
        </div>
      </div>

      {/* Per-Tracker Report */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-4">Weekly Report — All Trackers</h3>
        <div className="space-y-4">
          {report.map(({ tracker, streak, week_entries, week_total, active_days, items_total, items_done }) => {
            const t = tracker;
            const streakActive = streak?.last_logged_date === today || streak?.last_logged_date === yesterday;
            const displayStreak = streakActive ? (streak?.current_streak || 0) : 0;
            const itemPct = items_total > 0 ? Math.round((items_done / items_total) * 100) : 0;

            return (
              <div key={t.id} className="p-4 rounded-xl" style={{ background: '#10101e', border: '1px solid #2a2a45' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                    <span className="font-semibold text-white">{t.name}</span>
                    <span className="text-xs text-gray-500 capitalize">{t.type}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">{active_days}/7 days</span>
                    <span className="font-semibold" style={{ color: t.color }}>{week_total} {t.unit}</span>
                    {displayStreak > 0 && (
                      <div className="flex items-center gap-1 text-orange-400">
                        <Flame size={14} className="streak-glow" />
                        <span>{displayStreak}d</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {week_entries.map(e => (
                    <div key={e.date} className="text-center">
                      <div className="h-8 rounded flex items-end justify-center pb-1 mb-1"
                        style={{ background: e.value > 0 ? t.color + '25' : '#1e1e35' }}>
                        {e.value > 0 && <div className="w-1.5 rounded-full" style={{ height: `${Math.min(100, e.value * 20)}%`, minHeight: 6, background: t.color }} />}
                      </div>
                      <div className="text-xs text-gray-600">{new Date(e.date).toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                    </div>
                  ))}
                </div>

                {items_total > 0 && (
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                    <span>{items_done}/{items_total} items complete</span>
                    <div className="flex-1 h-1 rounded-full" style={{ background: '#1e1e35' }}>
                      <div className="h-1 rounded-full" style={{ width: `${itemPct}%`, background: t.color }} />
                    </div>
                    <span style={{ color: t.color }}>{itemPct}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
