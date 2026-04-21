import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { promptsService } from '../services/prompts.service';
import { Prompt } from '../types';
import { logError } from '../lib/logger';
import { Bot, Copy, Trash2, X } from 'lucide-react';

const CATEGORIES = ['General', 'Escritura', 'Código', 'Investigación', 'Resumen', 'Análisis', 'Otro'];

export function PromptVault() {
  const { state, dispatch } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');

  const filteredPrompts = state.prompts.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === '' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const reloadPrompts = async () => {
    try {
      const allPrompts = await promptsService.getAll();
      dispatch({ type: 'SET_PROMPTS', payload: allPrompts });
    } catch (err) {
      logError('PromptVault', 'Reload failed', err);
    }
  };

  const handleCreatePrompt = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert('Por favor, ingresa un título y un contenido para el prompt.');
      return;
    }

    try {
      await promptsService.create({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
      });

      await reloadPrompts();
      setNewTitle('');
      setNewContent('');
      setNewCategory('General');
      setShowNew(false);
    } catch (err: any) {
      logError('PromptVault', 'Create failed', err);
      alert('Error al guardar prompt: ' + (err.message || 'Desconocido'));
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (confirm('¿Eliminar este prompt?')) {
      try {
        await promptsService.remove(id);
        await reloadPrompts();
        if (selectedPrompt?.id === id) setSelectedPrompt(null);
      } catch (err: any) {
        logError('PromptVault', 'Delete failed', err);
        alert('Error al eliminar prompt: ' + (err.message || 'Desconocido'));
      }
    }
  };

  const handleCopyPrompt = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Escritura': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
      case 'Código': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
      case 'Investigación': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
      case 'Resumen': return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300';
      case 'Análisis': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-indigo-500" /> Prompt Vault
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Tu colección de prompts para IA</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo prompt
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar prompts..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* New Prompt Form */}
      {showNew && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">Nuevo prompt</h2>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título del prompt"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Escribe el contenido del prompt..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCreatePrompt}
              className="px-6 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Guardar
            </button>
            <button
              onClick={() => { setShowNew(false); setNewTitle(''); setNewContent(''); }}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="text-center py-16">
          <Bot className="w-16 h-16 text-slate-400 mx-auto" />
          <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            {searchQuery || filterCategory ? 'No se encontraron prompts' : 'Tu vault está vacío'}
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {searchQuery || filterCategory ? 'Intenta con otros términos' : 'Crea tu primer prompt para empezar'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => setSelectedPrompt(prompt)}
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(prompt.category)}`}>
                  {prompt.category}
                </span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyPrompt(prompt.content);
                    }}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                    title="Copiar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePrompt(prompt.id);
                    }}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{prompt.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">{prompt.content}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                {new Date(prompt.createdAt).toLocaleDateString('es-MX')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Prompt Detail Modal */}
      {selectedPrompt && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(selectedPrompt.category)}`}>
                  {selectedPrompt.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">{selectedPrompt.title}</h2>
              </div>
              <button
                onClick={() => setSelectedPrompt(null)}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <pre className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-sm font-mono">
                  {selectedPrompt.content}
                </pre>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Creado: {new Date(selectedPrompt.createdAt).toLocaleDateString('es-MX')}
              </span>
              <button
                onClick={() => handleCopyPrompt(selectedPrompt.content)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                <Copy className="w-4 h-4" /> Copiar prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
