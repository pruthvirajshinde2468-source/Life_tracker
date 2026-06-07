const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const id = (r) => Number(r.lastInsertRowid); // node:sqlite returns BigInt

// ── Streak helpers ────────────────────────────────────────────────────────────
function getToday() { return new Date().toISOString().split('T')[0]; }
function getYesterday() { return new Date(Date.now() - 86400000).toISOString().split('T')[0]; }

function updateStreak(trackerId, logDate) {
  const streak = db.prepare('SELECT * FROM streaks WHERE tracker_id = ?').get(trackerId);
  const prevDay = new Date(new Date(logDate).getTime() - 86400000).toISOString().split('T')[0];

  if (!streak) {
    db.prepare('INSERT INTO streaks (tracker_id,current_streak,longest_streak,last_logged_date,streak_start_date) VALUES (?,1,1,?,?)').run(trackerId, logDate, logDate);
    return;
  }
  if (streak.last_logged_date === logDate) return;

  let newStreak = streak.current_streak || 0;
  let newStart = streak.streak_start_date || logDate;

  if (!streak.last_logged_date) {
    newStreak = 1; newStart = logDate;
  } else if (streak.last_logged_date === prevDay) {
    newStreak = newStreak + 1;
  } else {
    newStreak = 1; newStart = logDate;
  }

  const newLongest = Math.max(streak.longest_streak || 0, newStreak);
  db.prepare('UPDATE streaks SET current_streak=?,longest_streak=?,last_logged_date=?,streak_start_date=? WHERE tracker_id=?')
    .run(newStreak, newLongest, logDate, newStart, trackerId);
}

function recalcStreak(trackerId) {
  const entries = db.prepare('SELECT DISTINCT date FROM entries WHERE tracker_id = ? ORDER BY date ASC').all(trackerId);
  if (entries.length === 0) {
    db.prepare('UPDATE streaks SET current_streak=0,longest_streak=0,last_logged_date=NULL,streak_start_date=NULL WHERE tracker_id=?').run(trackerId);
    return;
  }
  let cur = 1, longest = 1, curStart = entries[0].date;
  for (let i = 1; i < entries.length; i++) {
    const diff = Math.round((new Date(entries[i].date) - new Date(entries[i-1].date)) / 86400000);
    if (diff === 1) { cur++; if (cur > longest) longest = cur; }
    else { cur = 1; curStart = entries[i].date; }
  }
  const last = entries[entries.length - 1].date;
  const t = getToday(), y = getYesterday();
  db.prepare('UPDATE streaks SET current_streak=?,longest_streak=?,last_logged_date=?,streak_start_date=? WHERE tracker_id=?')
    .run((last === t || last === y) ? cur : 0, longest, last, curStart, trackerId);
}

// ── Trackers ──────────────────────────────────────────────────────────────────
app.get('/api/trackers', (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, s.current_streak, s.longest_streak, s.last_logged_date, s.streak_start_date,
      COUNT(DISTINCT ti.id) AS total_items,
      SUM(CASE WHEN ti.completed=1 THEN 1 ELSE 0 END) AS completed_items,
      COALESCE((SELECT SUM(value) FROM entries e WHERE e.tracker_id=t.id),0) AS total_value,
      COALESCE((SELECT COUNT(*) FROM entries e WHERE e.tracker_id=t.id AND e.date=date('now','localtime')),0) AS logged_today
    FROM trackers t
    LEFT JOIN streaks s ON s.tracker_id=t.id
    LEFT JOIN tracker_items ti ON ti.tracker_id=t.id
    GROUP BY t.id ORDER BY t.created_at DESC
  `).all();
  res.json(rows);
});

app.post('/api/trackers', (req, res) => {
  const { name, description, type, icon, color, unit, goal_total, goal_frequency } = req.body;
  const r = db.prepare('INSERT INTO trackers (name,description,type,icon,color,unit,goal_total,goal_frequency) VALUES (?,?,?,?,?,?,?,?)')
    .run(name, description||'', type||'custom', icon||'target', color||'#6366f1', unit||'sessions', goal_total||0, goal_frequency||'daily');
  const newId = id(r);
  db.prepare('INSERT OR IGNORE INTO streaks (tracker_id) VALUES (?)').run(newId);
  res.json(db.prepare('SELECT * FROM trackers WHERE id=?').get(newId));
});

app.get('/api/trackers/:tid', (req, res) => {
  const t = db.prepare(`
    SELECT t.*, s.current_streak, s.longest_streak, s.last_logged_date, s.streak_start_date,
      COUNT(DISTINCT ti.id) AS total_items,
      SUM(CASE WHEN ti.completed=1 THEN 1 ELSE 0 END) AS completed_items,
      COALESCE((SELECT SUM(value) FROM entries e WHERE e.tracker_id=t.id),0) AS total_value
    FROM trackers t
    LEFT JOIN streaks s ON s.tracker_id=t.id
    LEFT JOIN tracker_items ti ON ti.tracker_id=t.id
    WHERE t.id=? GROUP BY t.id
  `).get(req.params.tid);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const today = getToday(), yest = getYesterday();
  t.streak_active = t.last_logged_date === today || t.last_logged_date === yest;
  t.display_streak = t.streak_active ? (t.current_streak || 0) : 0;
  res.json(t);
});

app.put('/api/trackers/:tid', (req, res) => {
  const { name, description, type, icon, color, unit, goal_total, goal_frequency } = req.body;
  db.prepare('UPDATE trackers SET name=?,description=?,type=?,icon=?,color=?,unit=?,goal_total=?,goal_frequency=? WHERE id=?')
    .run(name, description||'', type, icon, color, unit, goal_total||0, goal_frequency, req.params.tid);
  res.json(db.prepare('SELECT * FROM trackers WHERE id=?').get(req.params.tid));
});

app.delete('/api/trackers/:tid', (req, res) => {
  db.prepare('DELETE FROM trackers WHERE id=?').run(req.params.tid);
  res.json({ success: true });
});

// ── Items ─────────────────────────────────────────────────────────────────────
app.get('/api/trackers/:tid/items', (req, res) => {
  res.json(db.prepare('SELECT * FROM tracker_items WHERE tracker_id=? ORDER BY order_index,id').all(req.params.tid));
});

app.post('/api/trackers/:tid/items', (req, res) => {
  const { name, description } = req.body;
  const mx = db.prepare('SELECT COALESCE(MAX(order_index),0) AS m FROM tracker_items WHERE tracker_id=?').get(req.params.tid);
  const r = db.prepare('INSERT INTO tracker_items (tracker_id,name,description,order_index) VALUES (?,?,?,?)')
    .run(req.params.tid, name, description||'', (mx?.m || 0) + 1);
  res.json(db.prepare('SELECT * FROM tracker_items WHERE id=?').get(id(r)));
});

app.put('/api/trackers/:tid/items/:iid', (req, res) => {
  const { name, description, completed } = req.body;
  const at = completed ? new Date().toISOString() : null;
  db.prepare('UPDATE tracker_items SET name=?,description=?,completed=?,completed_at=? WHERE id=? AND tracker_id=?')
    .run(name, description||'', completed?1:0, at, req.params.iid, req.params.tid);
  res.json(db.prepare('SELECT * FROM tracker_items WHERE id=?').get(req.params.iid));
});

app.delete('/api/trackers/:tid/items/:iid', (req, res) => {
  db.prepare('DELETE FROM tracker_items WHERE id=? AND tracker_id=?').run(req.params.iid, req.params.tid);
  res.json({ success: true });
});

app.post('/api/trackers/:tid/items/reorder', (req, res) => {
  const { items } = req.body;
  const update = db.prepare('UPDATE tracker_items SET order_index=? WHERE id=?');
  db.exec('BEGIN');
  try { items.forEach((itemId, idx) => update.run(idx, itemId)); db.exec('COMMIT'); }
  catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json({ success: true });
});

// ── Entries ───────────────────────────────────────────────────────────────────
app.post('/api/trackers/:tid/log', (req, res) => {
  const { value, notes, date, item_ids } = req.body;
  const logDate = date || getToday();
  const existing = db.prepare('SELECT id,value FROM entries WHERE tracker_id=? AND date=?').get(req.params.tid, logDate);

  let entryId;
  if (existing) {
    db.prepare('UPDATE entries SET value=value+?,notes=?,item_ids=? WHERE id=?')
      .run(value||1, notes||'', JSON.stringify(item_ids||[]), existing.id);
    entryId = existing.id;
  } else {
    const r = db.prepare('INSERT INTO entries (tracker_id,date,value,notes,item_ids) VALUES (?,?,?,?,?)')
      .run(req.params.tid, logDate, value||1, notes||'', JSON.stringify(item_ids||[]));
    entryId = id(r);
  }

  updateStreak(req.params.tid, logDate);
  const streak = db.prepare('SELECT * FROM streaks WHERE tracker_id=?').get(req.params.tid);
  const entry = db.prepare('SELECT * FROM entries WHERE id=?').get(entryId);
  res.json({ entry, streak });
});

app.get('/api/trackers/:tid/entries', (req, res) => {
  const limit = parseInt(req.query.limit) || 60;
  const offset = parseInt(req.query.offset) || 0;
  res.json(db.prepare('SELECT * FROM entries WHERE tracker_id=? ORDER BY date DESC LIMIT ? OFFSET ?').all(req.params.tid, limit, offset));
});

app.delete('/api/entries/:eid', (req, res) => {
  const e = db.prepare('SELECT * FROM entries WHERE id=?').get(req.params.eid);
  if (!e) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM entries WHERE id=?').run(req.params.eid);
  recalcStreak(e.tracker_id);
  res.json({ success: true });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
app.get('/api/analytics/overview', (req, res) => {
  const today = getToday(), yest = getYesterday();
  const weekAgo = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];

  const total_trackers = db.prepare('SELECT COUNT(*) AS cnt FROM trackers').get()?.cnt || 0;
  const active_streaks = db.prepare('SELECT COUNT(*) AS cnt FROM streaks WHERE last_logged_date=? OR last_logged_date=?').get(today, yest)?.cnt || 0;
  const today_logs = db.prepare('SELECT COUNT(DISTINCT tracker_id) AS cnt FROM entries WHERE date=?').get(today)?.cnt || 0;
  const week_logs = db.prepare('SELECT COUNT(*) AS cnt FROM entries WHERE date>=?').get(weekAgo)?.cnt || 0;
  const month_logs = db.prepare('SELECT COUNT(*) AS cnt FROM entries WHERE date>=?').get(monthAgo)?.cnt || 0;

  res.json({ total_trackers, active_streaks, today_logs, week_logs, month_logs });
});

app.get('/api/analytics/weekly', (req, res) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i*86400000).toISOString().split('T')[0];
    const rows = db.prepare(`
      SELECT e.tracker_id, t.name, t.color, t.unit, SUM(e.value) AS total
      FROM entries e JOIN trackers t ON t.id=e.tracker_id
      WHERE e.date=? GROUP BY e.tracker_id
    `).all(d);
    days.push({ date: d, entries: rows, total: rows.reduce((s, r) => s + (r.total || 0), 0) });
  }
  res.json(days);
});

app.get('/api/analytics/heatmap', (req, res) => {
  const { tracker_id } = req.query;
  const start = new Date(Date.now() - 365*86400000).toISOString().split('T')[0];
  const rows = tracker_id
    ? db.prepare('SELECT date, SUM(value) AS value FROM entries WHERE tracker_id=? AND date>=? GROUP BY date ORDER BY date').all(tracker_id, start)
    : db.prepare('SELECT date, COUNT(DISTINCT tracker_id) AS value FROM entries WHERE date>=? GROUP BY date ORDER BY date').all(start);
  res.json(rows);
});

app.get('/api/analytics/tracker/:tid', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const start = new Date(Date.now() - days*86400000).toISOString().split('T')[0];
  res.json(db.prepare('SELECT date, value, notes FROM entries WHERE tracker_id=? AND date>=? ORDER BY date ASC').all(req.params.tid, start));
});

app.get('/api/analytics/report', (req, res) => {
  const weekAgo = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
  const trackers = db.prepare('SELECT * FROM trackers').all();

  const report = trackers.map(t => {
    const streak = db.prepare('SELECT * FROM streaks WHERE tracker_id=?').get(t.id);
    const week_entries_raw = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i*86400000).toISOString().split('T')[0];
      const e = db.prepare('SELECT COALESCE(SUM(value),0) AS value FROM entries WHERE tracker_id=? AND date=?').get(t.id, d);
      week_entries_raw.push({ date: d, value: e?.value || 0 });
    }
    const items = db.prepare('SELECT completed FROM tracker_items WHERE tracker_id=?').all(t.id);
    const week_total = week_entries_raw.reduce((s, e) => s + e.value, 0);
    const active_days = week_entries_raw.filter(e => e.value > 0).length;
    return { tracker: t, streak, week_entries: week_entries_raw, week_total, active_days, items_total: items.length, items_done: items.filter(i => i.completed).length };
  });

  res.json(report);
});

// ── AI / Ollama ───────────────────────────────────────────────────────────────
app.get('/api/ai/models', async (req, res) => {
  try {
    const s = db.prepare('SELECT value FROM settings WHERE key=?').get('ollama_url');
    const url = (s?.value || 'http://localhost:11434') + '/api/tags';
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    res.json({ models: data.models || [], available: true });
  } catch {
    res.json({ models: [], available: false });
  }
});

app.post('/api/ai/generate', async (req, res) => {
  const { prompt, model } = req.body;
  const urlRow = db.prepare('SELECT value FROM settings WHERE key=?').get('ollama_url');
  const modelRow = db.prepare('SELECT value FROM settings WHERE key=?').get('ollama_model');
  const ollamaUrl = urlRow?.value || 'http://localhost:11434';
  const ollamaModel = model || modelRow?.value || 'llama3';

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel, prompt, stream: false }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    res.json({ response: data.response, model: ollamaModel });
  } catch (err) {
    res.status(503).json({ error: 'Ollama not available', details: err.message });
  }
});

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

app.put('/api/settings', (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)');
  db.exec('BEGIN');
  try {
    for (const [k, v] of Object.entries(req.body)) upsert.run(k, v);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`\x1b[32m✓\x1b[0m Tracker API → http://localhost:${PORT}`));
