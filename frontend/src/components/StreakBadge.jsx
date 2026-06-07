import { Flame, Zap } from 'lucide-react';

export default function StreakBadge({ streak = 0, lastDate, size = 'md', showLabel = true }) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const active = lastDate === today || lastDate === yesterday;
  const display = active ? streak : 0;

  const sizes = { sm: { icon: 14, text: 'text-xs', pad: 'px-2 py-1' }, md: { icon: 16, text: 'text-sm', pad: 'px-3 py-1.5' }, lg: { icon: 20, text: 'text-base', pad: 'px-4 py-2' } };
  const s = sizes[size] || sizes.md;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${s.pad} ${s.text}`}
      style={{
        background: display > 0 ? 'rgba(249,115,22,0.12)' : 'rgba(100,116,139,0.1)',
        border: `1px solid ${display > 0 ? 'rgba(249,115,22,0.3)' : 'rgba(100,116,139,0.2)'}`,
        color: display > 0 ? '#fb923c' : '#64748b',
      }}>
      {display > 0
        ? <Flame size={s.icon} className="streak-glow" style={{ color: '#f97316' }} />
        : <Zap size={s.icon} />}
      <span>{display}</span>
      {showLabel && <span className="font-normal opacity-70">{display === 1 ? 'day' : 'days'}</span>}
    </div>
  );
}
