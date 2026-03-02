import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { foldersService } from '../services/folders.service';
import { Folder } from '../types';
import { logError } from '../lib/logger';

interface FolderTreeProps {
  subjectId: string;
}

export function FolderTree({ subjectId }: FolderTreeProps) {
  const { state, dispatch } = useApp();
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const folders = state.folders.filter(f => f.subjectId === subjectId);
  const rootFolders = folders.filter(f => f.parentId === null);

  const reloadFolders = async () => {
    try {
      const allFolders = await foldersService.getAll();
      dispatch({ type: 'SET_FOLDERS', payload: allFolders });
    } catch (err) {
      logError('FolderTree', 'Reload failed', err);
    }
  };

  const handleCreateFolder = async (parentId: string | null) => {
    if (!newFolderName.trim()) return;

    try {
      await foldersService.create({
        subjectId,
        parentId,
        name: newFolderName.trim(),
      });

      await reloadFolders();
      setNewFolderName('');
      setShowNewFolder(null);

      if (parentId) {
        setExpandedFolders(prev => new Set([...prev, parentId]));
      }
    } catch (err) {
      logError('FolderTree', 'Create failed', err);
    }
  };

  const handleRenameFolder = async (folder: Folder, newName: string) => {
    try {
      await foldersService.update({ ...folder, name: newName });
      await reloadFolders();
    } catch (err) {
      logError('FolderTree', 'Rename failed', err);
    }
    setEditingFolder(null);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (confirm('¿Eliminar esta carpeta y todo su contenido?')) {
      try {
        await foldersService.remove(folderId);
        await reloadFolders();
      } catch (err) {
        logError('FolderTree', 'Delete failed', err);
      }
    }
  };

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolder = (folder: Folder, depth: number = 0) => {
    const children = folders.filter(f => f.parentId === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = state.activeFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${isActive
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => dispatch({ type: 'SET_ACTIVE_FOLDER', payload: folder.id })}
        >
          {children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5"
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {children.length === 0 && <span className="w-4" />}
          <span className="text-sm">📁</span>
          {editingFolder === folder.id ? (
            <input
              type="text"
              defaultValue={folder.name}
              className="flex-1 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => handleRenameFolder(folder, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameFolder(folder, e.currentTarget.value);
                }
              }}
            />
          ) : (
            <span className="flex-1 text-sm truncate">{folder.name}</span>
          )}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNewFolder(folder.id);
              }}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"
              title="Nueva subcarpeta"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingFolder(folder.id);
              }}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              title="Renombrar"
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder.id);
              }}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
              title="Eliminar"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* New subfolder input */}
        {showNewFolder === folder.id && (
          <div
            className="flex items-center gap-2 px-2 py-1"
            style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
          >
            <span className="text-sm">📁</span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre de la carpeta"
              className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full min-w-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder(folder.id);
                if (e.key === 'Escape') {
                  setShowNewFolder(null);
                  setNewFolderName('');
                }
              }}
            />
            <button
              onClick={() => handleCreateFolder(folder.id)}
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              ✓
            </button>
          </div>
        )}

        {/* Children */}
        {isExpanded && children.map(child => renderFolder(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900/50 overflow-y-auto">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Carpetas
          </span>
          <button
            onClick={() => setShowNewFolder('root')}
            className="p-1 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 rounded transition-colors"
            title="Nueva carpeta"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* All Content Button */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors mb-2 ${!state.activeFolderId
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_FOLDER', payload: null })}
        >
          <span className="text-lg">📚</span>
          <span className="text-sm">Todo el contenido</span>
        </div>

        {/* New root folder input */}
        {showNewFolder === 'root' && (
          <div className="flex items-center gap-2 px-2 py-1 mb-2">
            <span className="text-sm">📁</span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre de la carpeta"
              className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder(null);
                if (e.key === 'Escape') {
                  setShowNewFolder(null);
                  setNewFolderName('');
                }
              }}
            />
            <button
              onClick={() => handleCreateFolder(null)}
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              ✓
            </button>
          </div>
        )}

        {/* Folder tree */}
        <div className="space-y-0.5">
          {rootFolders.map(folder => renderFolder(folder))}
        </div>

        {folders.length === 0 && !showNewFolder && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
            No hay carpetas
          </p>
        )}
      </div>
    </div>
  );
}
