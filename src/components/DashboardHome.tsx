import { useApp } from '../context/AppContext';
import { getCurrentClass, getNextClass, formatTimeRemaining, getDayName } from '../data/schedule';
import { tasksService } from '../services/tasks.service';
import { logError } from '../lib/logger';

export function DashboardHome() {
  const { state, dispatch, getActiveSchedule } = useApp();

  const pendingTasks = state.tasks.filter(t => !t.completed);
  const recentNotes = [...state.notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const activeSemester = state.semesters.find(s => s.isActive);
  const semesterSubjects = state.subjects.filter(
    s => s.semesterId === activeSemester?.id
  );

  const schedule = getActiveSchedule();
  const currentClass = getCurrentClass(schedule);
  const nextClass = getNextClass(schedule);

  // Get today's remaining classes
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayClasses = schedule
    .filter(cls => cls.day === currentDay)
    .map(cls => {
      const [startH, startM] = cls.startTime.split(':').map(Number);
      const [endH, endM] = cls.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return { ...cls, startMinutes, endMinutes };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const upcomingTodayClasses = todayClasses.filter(cls => cls.endMinutes > currentMinutes);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2">
            ¡Bienvenido{state.user?.email ? `, ${state.user.email.split('@')[0].charAt(0).toUpperCase() + state.user.email.split('@')[0].slice(1)}` : ''}! 👋
          </h1>
          <p className="text-blue-100">
            {activeSemester
              ? `Semestre activo: ${activeSemester.name} • ${getDayName(currentDay)}`
              : 'Tu dashboard universitario está listo para empezar.'
            }
          </p>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'schedule' })}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors mt-4"
          >
            Ver Horario
          </button>
          {currentClass && currentClass.modality === 'Virtual' && currentClass.teamsLink && (
            <a
              href={currentClass.teamsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-xl text-sm font-medium hover:bg-purple-50 transition-colors mt-4"
            >
              💻 Unirse a Teams
            </a>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon="📚"
          label="Materias"
          value={semesterSubjects.length}
          color="bg-blue-100 text-blue-600"
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'semesters' })}
        />
        <StatCard
          icon="📒"
          label="Notas"
          value={state.notes.length}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          icon="✅"
          label="Tareas pendientes"
          value={pendingTasks.length}
          color="bg-orange-100 text-orange-600"
        />
        <StatCard
          icon="📅"
          label="Clases hoy"
          value={todayClasses.length}
          color="bg-purple-100 text-purple-600"
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'schedule' })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Classes */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              📅 Clases de hoy
            </h2>
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'schedule' })}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver horario completo
            </button>
          </div>

          {todayClasses.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="¡No hay clases hoy!"
              description="Aprovecha para estudiar o descansar."
            />
          ) : upcomingTodayClasses.length === 0 ? (
            <EmptyState
              icon="✨"
              title="¡Terminaste por hoy!"
              description="Todas tus clases de hoy ya pasaron."
            />
          ) : (
            <div className="space-y-2">
              {upcomingTodayClasses.map((cls) => {
                const isCurrent = currentClass?.id === cls.id;
                const subject = state.subjects.find(s =>
                  s.name.toLowerCase().includes(cls.subject.toLowerCase().split(' ')[0])
                );

                return (
                  <div
                    key={cls.id}
                    className={`p-3 rounded-xl border transition-all ${isCurrent
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {subject && (
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                        )}
                        <div>
                          <p className={`font-medium ${isCurrent
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-slate-900 dark:text-white'
                            }`}>
                            {cls.subject}
                            {isCurrent && (
                              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                                Ahora
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {cls.startTime} - {cls.endTime}
                            {cls.modality === 'Presencial' && (
                              <span className="ml-2">📍 {cls.room}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {cls.modality === 'Virtual' && cls.teamsLink && (
                        <a
                          href={cls.teamsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          Teams
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Tasks Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              ⏰ Tareas Próximas
            </h2>
          </div>

          {(() => {
            const now = new Date();
            const in7Days = new Date(now);
            in7Days.setDate(in7Days.getDate() + 7);

            const upcomingTasks = pendingTasks
              .filter(t => t.dueDate)
              .filter(t => {
                const due = new Date(t.dueDate!);
                return due <= in7Days;
              })
              .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

            if (upcomingTasks.length === 0) {
              return (
                <EmptyState
                  icon="🎉"
                  title="No tienes tareas próximas"
                  description="No hay tareas con fecha límite en los próximos 7 días."
                />
              );
            }

            return (
              <div className="space-y-2">
                {upcomingTasks.slice(0, 6).map((task) => {
                  const subject = state.subjects.find(s => s.id === task.subjectId);
                  const due = new Date(task.dueDate!);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dueDay = new Date(due);
                  dueDay.setHours(0, 0, 0, 0);
                  const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  let urgencyClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
                  let badgeClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
                  let badgeText = `${diffDays}d`;

                  if (diffDays <= 0) {
                    urgencyClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                    badgeClass = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
                    badgeText = diffDays === 0 ? 'Hoy' : 'Vencida';
                  } else if (diffDays <= 3) {
                    urgencyClass = 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
                    badgeClass = 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
                    badgeText = diffDays === 1 ? 'Mañana' : `${diffDays}d`;
                  }

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${urgencyClass}`}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={async () => {
                          try {
                            await tasksService.update({ ...task, completed: !task.completed });
                            const allTasks = await tasksService.getAll();
                            dispatch({ type: 'SET_TASKS', payload: allTasks });
                          } catch (err) {
                            logError('DashboardHome', 'Toggle task failed', err);
                          }
                        }}
                        className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-blue-500 dark:text-blue-400 focus:ring-blue-500 dark:bg-slate-800 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 dark:text-white truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {subject && (
                            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: subject.color }}
                              />
                              {subject.name}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {due.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </div>
                  );
                })}
                {upcomingTasks.length > 6 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center pt-2">
                    +{upcomingTasks.length - 6} tareas más
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Recent Notes Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              📒 Notas recientes
            </h2>
          </div>

          {recentNotes.length === 0 ? (
            <EmptyState
              icon="📒"
              title="Todavía no tienes notas"
              description="Crea tu primera nota dentro de una materia."
            />
          ) : (
            <div className="space-y-2">
              {recentNotes.map((note) => {
                const subject = state.subjects.find(s => s.id === note.subjectId);
                return (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
                    onClick={() => {
                      dispatch({ type: 'SET_ACTIVE_SUBJECT', payload: note.subjectId });
                      dispatch({ type: 'SET_ACTIVE_FOLDER', payload: note.folderId });
                      dispatch({ type: 'SET_VIEW', payload: 'subject' });
                    }}
                  >
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {note.title || 'Sin título'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {subject && (
                        <>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {subject.name}
                          </span>
                        </>
                      )}
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(note.updatedAt).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            ⚡ Acciones rápidas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon="📅"
              label="Ver horario"
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'schedule' })}
            />
            <QuickAction
              icon="🤖"
              label="Prompt Vault"
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'prompts' })}
            />
            <QuickAction
              icon="🔍"
              label="Buscar"
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'search' })}
            />
            <QuickAction
              icon="📦"
              label="Backup"
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'backup' })}
            />
          </div>

          {/* Next Class Info */}
          {nextClass && !currentClass && (
            <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Próxima clase en {formatTimeRemaining(nextClass.minutesUntil)}
              </p>
              <p className="text-blue-900 dark:text-blue-100 font-semibold mt-1">
                {nextClass.class.subject}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                {getDayName(nextClass.class.day)} {nextClass.class.startTime}
                {nextClass.class.modality === 'Presencial'
                  ? ` • Salón ${nextClass.class.room}`
                  : ' • Virtual'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  const darkColorMap: Record<string, string> = {
    'bg-blue-100 text-blue-600': 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    'bg-green-100 text-green-600': 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    'bg-orange-100 text-orange-600': 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    'bg-purple-100 text-purple-600': 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  };

  const actualColorClass = darkColorMap[color] || color;

  return (
    <div
      className={`p-4 rounded-2xl ${actualColorClass} ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm opacity-80">{label}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
}: {
  icon: string;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="text-center py-8">
      <span className="text-4xl">{icon}</span>
      <h3 className="mt-3 font-medium text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
}
