import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080812' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
