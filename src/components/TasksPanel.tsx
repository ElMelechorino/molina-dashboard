import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckSquare, Calendar, Edit2, Trash2 } from 'lucide-react';
import { tasksService } from '../services/tasks.service';
import { logError } from '../lib/logger';

interface TasksPanelProps {
  subjectId: string;
}

export function TasksPanel({ subjectId }: TasksPanelProps) {
  const { state, dispatch } = useApp();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [editingTask, setEditingTask] = useState<string | null>(null);

  const tasks = state.tasks.filter(t => {
    if (state.activeFolderId) {
      return t.folderId === state.activeFolderId;
    }
    return t.subjectId === subjectId;
  });

  // Sort: pending first, then completed
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed === b.completed) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.completed ? 1 : -1;
  });

  const pendingCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;

  const reloadTasks = async () => {
    try {
      const allTasks = await tasksService.getAll();
      dispatch({ type: 'SET_TASKS', payload: allTasks });
    } catch (err) {
      logError('TasksPanel', 'Reload failed', err);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    if (!newDueDate) {
      alert('Por favor, selecciona una fecha límite para la tarea.');
      return;
    }

    try {
      await tasksService.create({
        subjectId,
        folderId: state.activeFolderId || null,
        title: newTaskTitle.trim(),
        completed: false,
        dueDate: new Date(newDueDate + 'T23:59:59'),
      });

      await reloadTasks();
      setNewTaskTitle('');
      setNewDueDate('');
    } catch (err: any) {
      logError('TasksPanel', 'Create failed', err);
      alert('Error al crear tarea: ' + (err.message || 'Desconocido'));
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      try {
        await tasksService.update({ ...task, completed: !task.completed });
        await reloadTasks();
      } catch (err: any) {
        logError('TasksPanel', 'Toggle failed', err);
        alert('Error al cambiar estado: ' + (err.message || 'Desconocido'));
      }
    }
  };

  const handleUpdateTask = async (taskId: string, title: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      try {
        await tasksService.update({ ...task, title });
        await reloadTasks();
      } catch (err: any) {
        logError('TasksPanel', 'Update failed', err);
        alert('Error al actualizar tarea: ' + (err.message || 'Desconocido'));
      }
    }
    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksService.remove(taskId);
      await reloadTasks();
    } catch (err: any) {
      logError('TasksPanel', 'Delete failed', err);
      alert('Error al eliminar tarea: ' + (err.message || 'Desconocido'));
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* New Task Input */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Añadir nueva tarea..."
          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          min={new Date().toISOString().split('T')[0]}
        />
        <button
          onClick={handleCreateTask}
          className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
        >
          Añadir
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-orange-500">{pendingCount}</span> pendientes
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-green-500">{completedCount}</span> completadas
        </span>
      </div>

      {/* Tasks List */}
      {sortedTasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
            No tienes tareas pendientes
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Añade una nueva tarea para empezar
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-start gap-3 p-4 rounded-xl border transition-all ${task.completed
                ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/50 opacity-75'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
            >
              <button
                onClick={() => handleToggleTask(task.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${task.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400'
                  }`}
              >
                {task.completed && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {editingTask === task.id ? (
                <input
                  type="text"
                  defaultValue={task.title}
                  className="flex-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none min-w-0"
                  autoFocus
                  onBlur={(e) => handleUpdateTask(task.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateTask(task.id, e.currentTarget.value);
                    }
                  }}
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${task.completed
                      ? 'line-through text-slate-500 dark:text-slate-400'
                      : 'text-slate-900 dark:text-white'
                      }`}
                  >
                    {task.title}
                  </p>
                  {task.dueDate && (() => {
                    const due = new Date(task.dueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDay = new Date(due);
                    dueDay.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    let badgeClass = 'text-slate-500 dark:text-slate-400';
                    if (!task.completed) {
                      if (diffDays <= 0) badgeClass = 'text-red-600 dark:text-red-400 font-semibold';
                      else if (diffDays <= 3) badgeClass = 'text-orange-600 dark:text-orange-400 font-semibold';
                    }

                    return (
                      <p className={`text-xs mt-0.5 flex flex-wrap items-center gap-1 ${badgeClass}`}>
                        <Calendar className="w-3 h-3 inline" /> {due.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {!task.completed && diffDays <= 0 && ' • Vencida'}
                        {!task.completed && diffDays === 1 && ' • Mañana'}
                        {!task.completed && diffDays > 1 && diffDays <= 3 && ` • ${diffDays} días`}
                      </p>
                    );
                  })()}
                </div>
              )}

              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                <button
                  onClick={() => setEditingTask(task.id)}
                  className="p-1 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1 sm:p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
