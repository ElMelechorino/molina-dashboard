import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { notesService } from '../services/notes.service';
import { logError } from '../lib/logger';

interface NotesPanelProps {
  subjectId: string;
}

export function NotesPanel({ subjectId }: NotesPanelProps) {
  const { state, dispatch } = useApp();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const isSavingRef = useRef(false);

  const notes = state.notes.filter(n => {
    if (state.activeFolderId) {
      return n.folderId === state.activeFolderId;
    }
    return n.subjectId === subjectId;
  });

  // Derive selectedNote from state by ID (avoids stale object references)
  const selectedNote = selectedNoteId
    ? notes.find(n => n.id === selectedNoteId) ?? null
    : null;

  // Sync local editor fields when user selects a different note
  useEffect(() => {
    if (selectedNote) {
      setNoteTitle(selectedNote.title);
      setNoteContent(selectedNote.content);
    }
  }, [selectedNoteId]); // Only when the ID changes, not the object reference

  // Auto-save — debounced, with guard against concurrent saves
  useEffect(() => {
    if (!selectedNoteId || isSavingRef.current) return;

    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return;

    // Skip save if nothing has changed
    if (noteTitle === note.title && noteContent === note.content) return;

    const timer = setTimeout(async () => {
      isSavingRef.current = true;
      try {
        await notesService.update({
          ...note,
          title: noteTitle,
          content: noteContent,
        });

        // Reload notes from DB to stay in sync
        const allNotes = await notesService.getAll();
        dispatch({ type: 'SET_NOTES', payload: allNotes });
      } catch (err) {
        logError('NotesPanel', 'Auto-save failed', err);
      } finally {
        isSavingRef.current = false;
      }
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteContent, noteTitle]);

  const handleCreateNote = async () => {
    try {
      const note = await notesService.create({
        subjectId,
        folderId: state.activeFolderId || null,
        title: 'Nueva nota',
        content: '',
      });

      const allNotes = await notesService.getAll();
      dispatch({ type: 'SET_NOTES', payload: allNotes });
      setSelectedNoteId(note.id);
      setNoteTitle('Nueva nota');
      setNoteContent('');
    } catch (err: any) {
      logError('NotesPanel', 'Create failed', err);
      alert('Error al crear nota: ' + (err.message || 'Desconocido'));
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('¿Eliminar esta nota?')) {
      try {
        await notesService.remove(noteId);
        const allNotes = await notesService.getAll();
        dispatch({ type: 'SET_NOTES', payload: allNotes });
        if (selectedNoteId === noteId) {
          setSelectedNoteId(null);
        }
      } catch (err: any) {
        logError('NotesPanel', 'Delete failed', err);
        alert('Error al eliminar nota: ' + (err.message || 'Desconocido'));
      }
    }
  };

  const handleCopyNote = () => {
    if (selectedNote) {
      navigator.clipboard.writeText(noteContent);
    }
  };

  const handleDownloadNote = () => {
    if (selectedNote) {
      const blob = new Blob([noteContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${noteTitle || 'nota'}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Notes List */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={handleCreateNote}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva nota
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl">📒</span>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Crea tu primera nota
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${selectedNoteId === note.id
                  ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800/50'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-200 dark:border-slate-700'
                  } border`}
              >
                <p className="font-medium text-slate-900 dark:text-white truncate text-sm">
                  {note.title || 'Sin título'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {note.content || 'Sin contenido'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  {new Date(note.updatedAt).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
        {selectedNote ? (
          <>
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shrink-0">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Título de la nota"
                className="flex-1 text-lg font-semibold text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
              />
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  onClick={handleCopyNote}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Copiar"
                >
                  📋
                </button>
                <button
                  onClick={handleDownloadNote}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Descargar TXT"
                >
                  ⬇️
                </button>
                <button
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Escribe tu nota aquí..."
              className="flex-1 p-4 resize-none focus:outline-none text-slate-700 dark:text-slate-300 bg-transparent placeholder-slate-400 dark:placeholder-slate-500"
            />
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 shrink-0">
              Guardado automático • Última edición:{' '}
              {new Date(selectedNote.updatedAt).toLocaleString('es-MX')}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 p-4">
            <div className="text-center">
              <span className="text-5xl">📝</span>
              <p className="mt-4">Selecciona o crea una nota</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
