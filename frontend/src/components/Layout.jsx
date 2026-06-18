import Navbar  from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children, sidebar = true }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6" style={{ paddingTop: 52 }}>
        <div className={`flex gap-8 ${sidebar ? '' : 'justify-center'}`}>
          {sidebar && <Sidebar />}
          <main className="flex-1 min-w-0 py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
