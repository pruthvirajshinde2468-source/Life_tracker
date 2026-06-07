import { useState, useEffect } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { entries, items as itemsApi } from '../api';

export default function LogModal({ tracker, onClose, onLogged }) {
  const [value, setValue] = useState(1);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemList, setItemList] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    itemsApi.getAll(tracker.id).then(setItemList).catch(() => {});
  }, [tracker.id]);

  const toggleItem = (id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async () => {
    setLoading(true);
    try {
      const result = await entries.log(tracker.id, { value, notes, date, item_ids: selectedItems });
      if (selectedItems.length > 0) {
        await Promise.all(selectedItems.map(id => {
          const item = itemList.find(i => i.id === id);
          if (item && !item.completed) return itemsApi.update(tracker.id, id, { ...item, completed: true });
        }));
      }
      setMsg(`Logged! Streak: ${result.streak?.current_streak || 0} days`);
      setTimeout(() => { onLogged(); onClose(); }, 1200);
    } catch {
      setMsg('Failed to log entry');
    } finally {
      setLoading(false);
    }
  };

  const pendingItems = itemList.filter(i => !i.completed);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-white">Log Progress</h2>
            <p className="text-sm text-gray-400 mt-0.5" style={{ color: tracker.color }}>{tracker.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-hover transition-colors text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        {msg ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">✓</div>
            <p className="text-green-400 font-semibold text-lg">{msg}</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Amount ({tracker.unit})</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setValue(v => Math.max(0.5, v - 1))} className="btn btn-secondary p-2"><Minus size={16} /></button>
                <input type="number" step="0.5" min="0.5" value={value} onChange={e => setValue(parseFloat(e.target.value) || 1)} className="text-center text-xl font-bold" style={{ maxWidth: 100 }} />
                <button onClick={() => setValue(v => v + 1)} className="btn btn-secondary p-2"><Plus size={16} /></button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            {pendingItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Mark items complete (optional)</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {pendingItems.map(item => (
                    <button key={item.id} type="button" onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left"
                      style={{ background: selectedItems.includes(item.id) ? `${tracker.color}15` : '#10101e', border: `1px solid ${selectedItems.includes(item.id) ? tracker.color + '40' : '#2a2a45'}` }}>
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: selectedItems.includes(item.id) ? tracker.color : 'transparent', border: `2px solid ${selectedItems.includes(item.id) ? tracker.color : '#2a2a45'}` }}>
                        {selectedItems.includes(item.id) && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-sm text-gray-300">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Notes (optional)</label>
              <textarea rows={2} placeholder="How did it go?" value={notes} onChange={e => setNotes(e.target.value)}
                className="resize-none" style={{ background: '#10101e', border: '1px solid #2a2a45', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', width: '100%', outline: 'none' }} />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={submit} disabled={loading} className="btn btn-primary flex-1" style={{ background: tracker.color }}>
                {loading ? 'Logging...' : 'Log Progress'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
