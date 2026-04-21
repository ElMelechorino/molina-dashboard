import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, NotebookText, CheckSquare, Bot, FileText, Frown } from 'lucide-react';

type SearchResult = {
  type: 'note' | 'task' | 'prompt';
  id: string;
  title: string;
  preview: string;
  subjectId?: string;
  subjectName?: string;
};

export function GlobalSearch() {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState('');

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search notes
    state.notes.forEach((note) => {
      if (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q)
      ) {
        const subject = state.subjects.find((s) => s.id === note.subjectId);
        searchResults.push({
          type: 'note',
          id: note.id,
          title: note.title || 'Sin título',
          preview: note.content.slice(0, 100) + (note.content.length > 100 ? '...' : ''),
          subjectId: note.subjectId,
          subjectName: subject?.name,
        });
      }
    });

    // Search tasks
    state.tasks.forEach((task) => {
      if (task.title.toLowerCase().includes(q)) {
        const subject = state.subjects.find((s) => s.id === task.subjectId);
        searchResults.push({
          type: 'task',
          id: task.id,
          title: task.title,
          preview: task.completed ? 'Completada' : 'Pendiente',
          subjectId: task.subjectId,
          subjectName: subject?.name,
        });
      }
    });



    // Search prompts
    state.prompts.forEach((prompt) => {
      if (
        prompt.title.toLowerCase().includes(q) ||
        prompt.content.toLowerCase().includes(q) ||
        prompt.category.toLowerCase().includes(q)
      ) {
        searchResults.push({
          type: 'prompt',
          id: prompt.id,
          title: prompt.title,
          preview: prompt.content.slice(0, 100) + (prompt.content.length > 100 ? '...' : ''),
        });
      }
    });

    return searchResults;
  }, [query, state]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <NotebookText className="w-6 h-6 text-blue-500" />;
      case 'task':
        return <CheckSquare className="w-6 h-6 text-orange-500" />;
      case 'prompt':
        return <Bot className="w-6 h-6 text-purple-500" />;
      default:
        return <FileText className="w-6 h-6 text-slate-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'note':
        return 'Nota';
      case 'task':
        return 'Tarea';
      case 'prompt':
        return 'Prompt';
      default:
        return type;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'prompt') {
      dispatch({ type: 'SET_VIEW', payload: 'prompts' });
    } else if (result.subjectId) {
      dispatch({ type: 'SET_ACTIVE_SUBJECT', payload: result.subjectId });
      dispatch({ type: 'SET_VIEW', payload: 'subject' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Search className="w-7 h-7 text-blue-500" /> Buscar
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Busca en notas, tareas y prompts
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Escribe para buscar..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>

      {/* Results */}
      {query.trim() === '' ? (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Escribe algo para buscar
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <Frown className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
            No se encontró nada
          </p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Intenta con otros términos de búsqueda
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {results.length} resultado{results.length !== 1 ? 's' : ''}
          </p>
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-center shrink-0 w-12 h-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                {getTypeIcon(result.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                    {getTypeLabel(result.type)}
                  </span>
                  {result.subjectName && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      en {result.subjectName}
                    </span>
                  )}
                </div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {result.title}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {result.preview}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
