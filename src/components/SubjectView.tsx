import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FolderTree } from './FolderTree';
import { NotesPanel } from './NotesPanel';
import { TasksPanel } from './TasksPanel';
import { Book, NotebookText, CheckSquare } from 'lucide-react';

type Tab = 'notes' | 'tasks';

export function SubjectView() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('notes');

  const subject = state.subjects.find(s => s.id === state.activeSubjectId);
  const semester = state.semesters.find(s => s.id === subject?.semesterId);

  if (!subject) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="text-center">
          <Book className="w-16 h-16 mx-auto text-blue-500" />
          <p className="mt-4">Selecciona una materia para empezar</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'notes', label: 'Notas', icon: <NotebookText className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tareas', icon: <CheckSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'semesters' })}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {semester?.name}
          </button>
          <span>/</span>
          <span className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: subject.color }}
            />
            {subject.name}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
          {subject.name}
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mb-4 pb-0 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 border-t border-l border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Folder Tree Sidebar */}
        <div className="w-full md:w-64 shrink-0 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 border-slate-200 dark:border-slate-700">
          <FolderTree subjectId={subject.id} />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 md:border-l border-slate-200 dark:border-slate-700 relative">
          {activeTab === 'notes' && <NotesPanel subjectId={subject.id} />}
          {activeTab === 'tasks' && <TasksPanel subjectId={subject.id} />}
        </div>
      </div>
    </div>
  );
}
