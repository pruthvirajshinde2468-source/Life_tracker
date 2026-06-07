import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const trackers = {
  getAll: () => api.get('/trackers').then(r => r.data),
  get: (id) => api.get(`/trackers/${id}`).then(r => r.data),
  create: (data) => api.post('/trackers', data).then(r => r.data),
  update: (id, data) => api.put(`/trackers/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/trackers/${id}`).then(r => r.data),
};

export const items = {
  getAll: (tid) => api.get(`/trackers/${tid}/items`).then(r => r.data),
  create: (tid, data) => api.post(`/trackers/${tid}/items`, data).then(r => r.data),
  update: (tid, iid, data) => api.put(`/trackers/${tid}/items/${iid}`, data).then(r => r.data),
  delete: (tid, iid) => api.delete(`/trackers/${tid}/items/${iid}`).then(r => r.data),
  reorder: (tid, ids) => api.post(`/trackers/${tid}/items/reorder`, { items: ids }).then(r => r.data),
};

export const entries = {
  log: (tid, data) => api.post(`/trackers/${tid}/log`, data).then(r => r.data),
  getAll: (tid, params) => api.get(`/trackers/${tid}/entries`, { params }).then(r => r.data),
  delete: (id) => api.delete(`/entries/${id}`).then(r => r.data),
};

export const analytics = {
  overview: () => api.get('/analytics/overview').then(r => r.data),
  weekly: () => api.get('/analytics/weekly').then(r => r.data),
  heatmap: (tracker_id) => api.get('/analytics/heatmap', { params: tracker_id ? { tracker_id } : {} }).then(r => r.data),
  tracker: (id, days) => api.get(`/analytics/tracker/${id}`, { params: { days } }).then(r => r.data),
  report: () => api.get('/analytics/report').then(r => r.data),
};

export const ai = {
  models: () => api.get('/ai/models').then(r => r.data),
  generate: (prompt, model) => api.post('/ai/generate', { prompt, model }).then(r => r.data),
};

export const settings = {
  get: () => api.get('/settings').then(r => r.data),
  update: (data) => api.put('/settings', data).then(r => r.data),
};
