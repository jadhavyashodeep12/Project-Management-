import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { Login } from './pages/auth/login';
import { Register } from './pages/auth/register';
import api from './services/api';
import { Loader2, LogOut, LayoutDashboard, Users, Folder } from 'lucide-react';
import { ProjectList } from './pages/projects/project-list';
import { ProjectDetail } from './pages/projects/project-detail';
import { TeamsPage } from './pages/teams/teams';

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Navigation State
  const [currentView, setCurrentView] = useState<'dashboard' | 'projects' | 'teams'>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.post('/auth/logout');
    } catch {
      console.error('Logout failed');
    } finally {
      clearSession();
      setIsLoggingOut(false);
    }
  };

  // 1. Loading screen while checking auth session on start
  if (!isInitialized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#09090b] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
        <p className="text-sm text-gray-400 font-medium">Securing session...</p>
      </div>
    );
  }

  // 2. Public auth view guards
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <Register onLoginRedirect={() => setAuthView('login')} />;
    }
    return (
      <Login
        onRegisterRedirect={() => setAuthView('register')}
        onSuccess={() => {
          // Success switches view automatically
        }}
      />
    );
  }

  // Render view based on navigation state
  const renderContent = () => {
    switch (currentView) {
      case 'projects':
        if (selectedProjectId !== null) {
          return (
            <ProjectDetail
              projectId={selectedProjectId}
              onBack={() => setSelectedProjectId(null)}
            />
          );
        }
        return (
          <ProjectList
            onSelectProject={(id) => setSelectedProjectId(id)}
          />
        );
      case 'teams':
        return <TeamsPage />;
      case 'dashboard':
      default:
        return (
          <div className="max-w-4xl space-y-8 font-sans">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">
                Hello, {user?.first_name}!
              </h1>
              <p className="text-gray-400 mt-2">
                Here is what's happening with your workspace projects today.
              </p>
            </div>

            {/* Quick-stats placeholder grids */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#121214]/60 border border-white/[0.06] p-6 rounded-2xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Projects</p>
                <p className="text-3xl font-extrabold text-white mt-2">--</p>
              </div>
              <div className="bg-[#121214]/60 border border-white/[0.06] p-6 rounded-2xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks Pending</p>
                <p className="text-3xl font-extrabold text-white mt-2">--</p>
              </div>
              <div className="bg-[#121214]/60 border border-white/[0.06] p-6 rounded-2xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Sprints</p>
                <p className="text-3xl font-extrabold text-white mt-2">--</p>
              </div>
            </div>

            {/* Empty Workspace Notification */}
            <div className="bg-[#121214]/40 border border-white/[0.06] border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <div className="p-4 rounded-full bg-white/[0.02] border border-white/[0.06] mb-4 text-gray-500">
                <LayoutDashboard className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Project Dashboard Active</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                Navigate to "Projects" or "Teams" to manage boards, teams, and members.
              </p>
            </div>
          </div>
        );
    }
  };

  // 3. Private authenticated view
  return (
    <div className="min-h-screen bg-[#09090b] text-white flex font-sans">
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-white/[0.06] bg-[#0c0c0e] p-6 flex flex-col justify-between shrink-0 font-sans">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 text-white shadow-md shadow-purple-600/10">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight bg-clip-text bg-gradient-to-r from-white to-gray-400">
              PMS Workspace
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => { setCurrentView('dashboard'); setSelectedProjectId(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all border-none bg-transparent cursor-pointer ${currentView === 'dashboard' ? 'bg-white/[0.04] text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                }`}
            >
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              Dashboard
            </button>
            <button
              onClick={() => { setCurrentView('projects'); setSelectedProjectId(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all border-none bg-transparent cursor-pointer ${currentView === 'projects' ? 'bg-white/[0.04] text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                }`}
            >
              <Folder className="w-4 h-4 text-purple-400" />
              Projects
            </button>
            <button
              onClick={() => { setCurrentView('teams'); setSelectedProjectId(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all border-none bg-transparent cursor-pointer ${currentView === 'teams' ? 'bg-white/[0.04] text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                }`}
            >
              <Users className="w-4 h-4 text-purple-400" />
              Teams
            </button>
          </nav>
        </div>

        {/* User profile footer */}
        <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-semibold shrink-0 uppercase">
              {user ? `${user.first_name[0]}${user.last_name[0]}` : ''}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-50 shrink-0 border-none bg-transparent"
            title="Log out"
          >
            {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <LogOut className="w-4.5 h-4.5" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[150px] pointer-events-none" />
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
