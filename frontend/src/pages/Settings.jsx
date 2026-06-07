import { useState, useEffect } from 'react';
import { Check, AlertCircle, RefreshCw, Brain, Palette, Database, Download, Upload } from 'lucide-react';
import { settings as settingsApi, ai } from '../api';

export default function Settings() {
  const [form, setForm] = useState({ ollama_url: 'http://localhost:11434', ollama_model: 'llama3' });
  const [models, setModels] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    settingsApi.get().then(s => setForm(prev => ({ ...prev, ...s })));
    checkOllama();
  }, []);

  const checkOllama = async () => {
    setLoading(true);
    try {
      const data = await ai.models();
      setOllamaStatus(data.available);
      setModels(data.models || []);
    } catch {
      setOllamaStatus(false);
    }
    setLoading(false);
  };

  const save = async () => {
    await settingsApi.update(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your tracker preferences</p>
      </div>

      {/* Ollama Settings */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={18} style={{ color: '#8b5cf6' }} />
          <h3 className="font-semibold text-white">Ollama AI</h3>
          {ollamaStatus !== null && (
            <span className="ml-auto text-xs px-2 py-1 rounded-full flex items-center gap-1.5"
              style={{ background: ollamaStatus ? '#22c55e15' : '#ef444415', color: ollamaStatus ? '#4ade80' : '#f87171', border: `1px solid ${ollamaStatus ? '#22c55e30' : '#ef444430'}` }}>
              {ollamaStatus ? <Check size={10} /> : <AlertCircle size={10} />}
              {ollamaStatus ? 'Connected' : 'Not running'}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Ollama URL</label>
            <input value={form.ollama_url} onChange={e => setForm(f => ({ ...f, ollama_url: e.target.value }))} placeholder="http://localhost:11434" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Default Model</label>
            {models.length > 0 ? (
              <select value={form.ollama_model} onChange={e => setForm(f => ({ ...f, ollama_model: e.target.value }))}>
                {models.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            ) : (
              <input value={form.ollama_model} onChange={e => setForm(f => ({ ...f, ollama_model: e.target.value }))} placeholder="llama3" />
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={checkOllama} disabled={loading} className="btn btn-secondary">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Check Connection
            </button>
          </div>

          {!ollamaStatus && (
            <div className="p-4 rounded-lg text-sm" style={{ background: '#1e1e35', border: '1px solid #2a2a45' }}>
              <p className="text-gray-300 font-medium mb-2">How to setup Ollama:</p>
              <ol className="space-y-1 text-gray-400 list-decimal list-inside">
                <li>Download from <span className="text-indigo-400">ollama.ai</span></li>
                <li>Run: <code className="text-green-400 bg-black/30 px-1 rounded">ollama serve</code></li>
                <li>Install a model: <code className="text-green-400 bg-black/30 px-1 rounded">ollama pull llama3</code></li>
                <li>Click "Check Connection" above</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} style={{ color: '#3b82f6' }} />
          <h3 className="font-semibold text-white">Data Management</h3>
        </div>
        <div className="space-y-3 text-sm text-gray-400">
          <p>Your data is stored locally in <code className="text-green-400 bg-black/20 px-1 rounded text-xs">backend/data/tracker.db</code> (SQLite).</p>
          <p>To backup: copy that file to a safe location.</p>
          <div className="flex gap-3 mt-4">
            <button className="btn btn-secondary text-xs" onClick={() => alert('Copy backend/data/tracker.db to backup your data')}>
              <Download size={14} /> Backup Info
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">About</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex justify-between"><span>App</span><span className="text-gray-300">Life Tracker v1.0</span></div>
          <div className="flex justify-between"><span>Backend</span><span className="text-gray-300">Express + SQLite</span></div>
          <div className="flex justify-between"><span>Frontend</span><span className="text-gray-300">React + Vite + Tailwind</span></div>
          <div className="flex justify-between"><span>AI</span><span className="text-gray-300">Ollama (local)</span></div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={save} className="btn btn-primary">
          {saved ? <><Check size={16} /> Saved!</> : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
