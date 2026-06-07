import { useState } from 'react';
import { X, BookOpen, Dumbbell, Languages, Target, Coffee, Music, Code, Heart, Star } from 'lucide-react';
import { trackers } from '../api';

const TYPES = [
  { value: 'study', label: 'Study', icon: BookOpen, color: '#3b82f6', unit: 'chapters' },
  { value: 'fitness', label: 'Fitness', icon: Dumbbell, color: '#22c55e', unit: 'sessions' },
  { value: 'language', label: 'Language', icon: Languages, color: '#f59e0b', unit: 'lessons' },
  { value: 'habit', label: 'Habit', icon: Target, color: '#ec4899', unit: 'times' },
  { value: 'skill', label: 'Skill', icon: Code, color: '#8b5cf6', unit: 'hours' },
  { value: 'custom', label: 'Custom', icon: Star, color: '#6366f1', unit: 'units' },
];

const COLORS = ['#6366f1','#8b5cf6','#3b82f6','#06b6d4','#22c55e','#f59e0b','#f97316','#ec4899','#ef4444','#14b8a6'];
const ICONS = ['target','book','dumbbell','languages','coffee','music','code','heart','star','zap'];

export default function AddTrackerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'study', color: '#3b82f6', unit: 'chapters', goal_total: '', goal_frequency: 'total' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectType = (t) => setForm(f => ({ ...f, type: t.value, color: t.color, unit: t.unit }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    setLoading(true);
    try {
      const created = await trackers.create({ ...form, goal_total: parseInt(form.goal_total) || 0, icon: form.type });
      onCreated(created);
      onClose();
    } catch {
      setError('Failed to create tracker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">New Tracker</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-hover transition-colors text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => {
                const Icon = t.icon;
                const sel = form.type === t.value;
                return (
                  <button key={t.value} type="button" onClick={() => selectType(t)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all"
                    style={{ border: `1px solid ${sel ? t.color : '#2a2a45'}`, background: sel ? `${t.color}18` : '#10101e' }}>
                    <Icon size={18} style={{ color: sel ? t.color : '#64748b' }} />
                    <span className="text-xs font-medium" style={{ color: sel ? t.color : '#94a3b8' }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Name *</label>
            <input placeholder="e.g. Physics, German A1, Morning Gym..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <textarea rows={2} placeholder="What are you tracking?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="resize-none" style={{ background: '#10101e', border: '1px solid #2a2a45', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', width: '100%', outline: 'none' }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Unit</label>
              <input placeholder="chapters, sessions, hours..." value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Goal (optional)</label>
              <input type="number" min="0" placeholder="e.g. 12 chapters" value={form.goal_total} onChange={e => setForm(f => ({ ...f, goal_total: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Goal Frequency</label>
            <select value={form.goal_frequency} onChange={e => setForm(f => ({ ...f, goal_frequency: e.target.value }))}>
              <option value="total">Total (one-time goal)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: form.color === c ? `3px solid white` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1" style={{ background: form.color }}>
              {loading ? 'Creating...' : 'Create Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
