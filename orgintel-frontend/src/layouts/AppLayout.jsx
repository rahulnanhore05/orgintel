import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/navigation/AppHeader';
import { Sidebar } from '../components/navigation/Sidebar';
import { CitationDrawer } from '../components/chat/CitationDrawer';
import { ToastContainer } from '../components/feedback/ToastContainer';

export function AppLayout() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppHeader />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <main
          id="main-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'var(--bg-app)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet />
        </main>
      </div>
      <CitationDrawer />
      <ToastContainer />
    </div>
  );
}
