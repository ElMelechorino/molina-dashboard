import { useEffect, useState } from 'react';
import { supabase } from "./supabaseClient";
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ScheduleWidget } from './components/ScheduleWidget';
import { DashboardHome } from './components/DashboardHome';
import { SemesterManager } from './components/SemesterManager';
import { SubjectView } from './components/SubjectView';
import { PromptVault } from './components/PromptVault';
import { GlobalSearch } from './components/GlobalSearch';
import { BackupExport } from './components/BackupExport';
import { ScheduleView } from './components/ScheduleView';
import { semestersService } from './services/semesters.service';
import { subjectsService } from './services/subjects.service';
import { foldersService } from './services/folders.service';
import { notesService } from './services/notes.service';
import { tasksService } from './services/tasks.service';
import { promptsService } from './services/prompts.service';
import { log, logError } from './lib/logger';


function AppContent() {
  const { state, dispatch } = useApp();
  const [authChecked, setAuthChecked] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        log('App', 'Loading all data from Supabase...');
        const [semesters, subjects, folders, notes, tasks, prompts] = await Promise.all([
          semestersService.getAll(),
          subjectsService.getAll(),
          foldersService.getAll(),
          notesService.getAll(),
          tasksService.getAll(),
          promptsService.getAll(),
        ]);

        dispatch({ type: 'SET_SEMESTERS', payload: semesters });
        dispatch({ type: 'SET_SUBJECTS', payload: subjects });
        dispatch({ type: 'SET_FOLDERS', payload: folders });
        dispatch({ type: 'SET_NOTES', payload: notes });
        dispatch({ type: 'SET_TASKS', payload: tasks });
        dispatch({ type: 'SET_PROMPTS', payload: prompts });

        // Set active semester
        const active = semesters.find(s => s.isActive);
        if (active) {
          dispatch({ type: 'SET_ACTIVE_SEMESTER', payload: active.id });
        }

        log('App', 'All data loaded successfully', {
          semesters: semesters.length,
          subjects: subjects.length,
          folders: folders.length,
          notes: notes.length,
          tasks: tasks.length,
          prompts: prompts.length,
        });

        setDataLoaded(true);
      } catch (err) {
        logError('App', 'Failed to load data', err);
        // Still mark data as loaded so the UI isn't stuck on loading
        setDataLoaded(true);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      log('App', `Auth event: ${event}`, { userId: session?.user?.id });

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        dispatch({
          type: "LOGIN",
          payload: {
            id: session.user.id,
            email: session.user.email ?? "",
            isLoggedIn: true,
          },
        });

        await loadAllData();
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: "LOGOUT" });
        setDataLoaded(false);
      }

      setAuthChecked(true);
    });

    // Check initial session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        log('App', 'Initial session found', { userId: session.user.id });
        dispatch({
          type: "LOGIN",
          payload: {
            id: session.user.id,
            email: session.user.email ?? "",
            isLoggedIn: true,
          },
        });
        loadAllData();
      }
      setAuthChecked(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);

  // Show loading while checking auth or loading data
  if (!authChecked || (state.user && !dataLoaded)) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-4">
            <span className="text-white text-2xl">📚</span>
          </div>
          <p className="text-slate-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!state.user) {
    return <Login />;
  }

  const renderView = () => {
    switch (state.currentView) {
      case 'dashboard':
        return <DashboardHome />;
      case 'semesters':
        return <SemesterManager />;
      case 'subject':
        return <SubjectView />;
      case 'prompts':
        return <PromptVault />;
      case 'search':
        return <GlobalSearch />;
      case 'backup':
        return <BackupExport />;
      case 'schedule':
        return <ScheduleView />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors overflow-hidden">
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />

      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm">📚</span>
            </div>
            <h1 className="font-bold text-slate-900 dark:text-white">Molina</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <ScheduleWidget />
        <main className="flex-1 overflow-auto w-full max-w-full">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}