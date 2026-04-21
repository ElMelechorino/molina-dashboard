import { useApp } from '../context/AppContext';
import { supabase } from '../supabaseClient';
import { ViewMode } from '../types';
import { logError } from '../lib/logger';
import { 
  Home, Calendar, BookOpen, Bot, MessageCircle, Archive, Search, Moon, Sun, LogOut 
} from 'lucide-react';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
  const { state, dispatch } = useApp();

  const navItems: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { id: 'schedule', label: 'Horario', icon: <Calendar className="w-5 h-5" /> },
    { id: 'semesters', label: 'Semestres', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'prompts', label: 'Prompt Vault', icon: <Bot className="w-5 h-5" /> },
    { id: 'chat', label: 'Chat', icon: <MessageCircle className="w-5 h-5" /> },
    { id: 'backup', label: 'Backup', icon: <Archive className="w-5 h-5" /> },
  ];

  const activeSemester = state.semesters.find(s => s.isActive);
  const semesterSubjects = state.subjects.filter(
    s => s.semesterId === activeSemester?.id
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      logError('Sidebar', 'Logout error', e);
    } finally {
      // Clear auth data from sessionStorage (where the client stores it)
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-')) sessionStorage.removeItem(key);
      });
      dispatch({ type: 'LOGOUT' });
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 w-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col h-full z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white">Molina Dashboard</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hola{state.user?.email ? `, ${state.user.email.split('@')[0]}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                dispatch({ type: 'SET_VIEW', payload: item.id });
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${state.currentView === item.id
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <span className="flex-shrink-0 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          {/* Active Semester Subjects */}
          {activeSemester && semesterSubjects.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {activeSemester.name}
                </span>
                <span className="text-xs text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                  Activo
                </span>
              </div>
              {semesterSubjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_SUBJECT', payload: subject.id });
                    dispatch({ type: 'SET_ACTIVE_FOLDER', payload: null });
                    dispatch({ type: 'SET_VIEW', payload: 'subject' });
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${state.activeSubjectId === subject.id && state.currentView === 'subject'
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="truncate text-sm">{subject.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={() => {
                dispatch({ type: 'SET_VIEW', payload: 'search' });
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${state.currentView === 'search'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <Search className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span>Buscar</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              {state.isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>Modo Oscuro</span>
            </div>
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${state.isDarkMode ? 'bg-blue-500' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${state.isDarkMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
