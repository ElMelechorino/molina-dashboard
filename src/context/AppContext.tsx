import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import {
  AppState, User, Semester, Subject, Folder, Note, Task, Prompt, ViewMode, ScheduleClass
} from '../types';

// Initial state — empty, all data comes from Supabase
const initialState: AppState = {
  user: null,
  semesters: [],
  subjects: [],
  folders: [],
  notes: [],
  tasks: [],
  prompts: [],
  currentView: 'dashboard',
  activeSemesterId: null,
  activeSubjectId: null,
  activeFolderId: null,
  searchQuery: '',
  isDarkMode: localStorage.getItem('theme') === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),
};

type Action =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_VIEW'; payload: ViewMode }
  | { type: 'SET_ACTIVE_SEMESTER'; payload: string | null }
  | { type: 'SET_ACTIVE_SUBJECT'; payload: string | null }
  | { type: 'SET_ACTIVE_FOLDER'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  // Bulk data setters — called after service loads
  | { type: 'SET_SEMESTERS'; payload: Semester[] }
  | { type: 'SET_SUBJECTS'; payload: Subject[] }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'SET_NOTES'; payload: Note[] }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_PROMPTS'; payload: Prompt[] }
  | { type: 'TOGGLE_DARK_MODE' };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload };
    case 'TOGGLE_DARK_MODE': {
      const newIsDark = !state.isDarkMode;
      if (newIsDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return { ...state, isDarkMode: newIsDark };
    }
    case 'LOGOUT':
      return { ...initialState, user: null };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_ACTIVE_SEMESTER':
      return { ...state, activeSemesterId: action.payload };
    case 'SET_ACTIVE_SUBJECT':
      return { ...state, activeSubjectId: action.payload };
    case 'SET_ACTIVE_FOLDER':
      return { ...state, activeFolderId: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    // Data setters
    case 'SET_SEMESTERS':
      return { ...state, semesters: action.payload };
    case 'SET_SUBJECTS':
      return { ...state, subjects: action.payload };
    case 'SET_FOLDERS':
      return { ...state, folders: action.payload };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'SET_PROMPTS':
      return { ...state, prompts: action.payload };
    default:
      return state;
  }
}

const EMPTY_SCHEDULE: ScheduleClass[] = [];

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  getActiveSchedule: () => ScheduleClass[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Memoize the schedule to avoid creating a new array reference on every render.
  // This prevents infinite re-render loops in ScheduleWidget.
  const activeSchedule = useMemo(() => {
    const activeSemester = state.semesters.find(s => s.isActive);
    return activeSemester?.schedule ?? EMPTY_SCHEDULE;
  }, [state.semesters]);

  const getActiveSchedule = useMemo(() => {
    return () => activeSchedule;
  }, [activeSchedule]);

  // Apply dark mode immediately on mount based on initial state
  React.useEffect(() => {
    if (initialState.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, getActiveSchedule }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
