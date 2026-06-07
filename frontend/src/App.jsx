import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Trackers from './pages/Trackers';
import TrackerDetail from './pages/TrackerDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trackers" element={<Trackers />} />
          <Route path="/trackers/:id" element={<TrackerDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}
