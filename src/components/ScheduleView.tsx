import { useApp } from '../context/AppContext';
import { getDayName } from '../data/schedule';
import { ScheduleClass } from '../types';

export function ScheduleView() {
  const { state, dispatch, getActiveSchedule } = useApp();

  const schedule = getActiveSchedule();
  const activeSemester = state.semesters.find(s => s.isActive);

  // Group schedule by day
  const scheduleByDay = schedule.reduce((acc, cls) => {
    if (!acc[cls.day]) acc[cls.day] = [];
    acc[cls.day].push(cls);
    return acc;
  }, {} as Record<number, ScheduleClass[]>);

  // Sort each day's classes by start time
  Object.keys(scheduleByDay).forEach(day => {
    scheduleByDay[Number(day)].sort((a, b) => {
      const [aH, aM] = a.startTime.split(':').map(Number);
      const [bH, bM] = b.startTime.split(':').map(Number);
      return (aH * 60 + aM) - (bH * 60 + bM);
    });
  });

  const days = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sat, Sun

  const handleOpenSubject = (subjectName: string) => {
    const subject = state.subjects.find(s =>
      s.name.toLowerCase().includes(subjectName.toLowerCase().split(' ')[0]) ||
      subjectName.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
    );
    if (subject) {
      dispatch({ type: 'SET_ACTIVE_SUBJECT', payload: subject.id });
      dispatch({ type: 'SET_VIEW', payload: 'subject' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            📅 Horario de Clases
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {activeSemester ? `Semestre ${activeSemester.name}` : 'No hay semestre activo'}
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'semesters' })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
        >
          ✏️ Editar horario
        </button>
      </div>

      {/* Schedule Grid */}
      {schedule.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-6xl">📅</span>
          <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            No hay clases programadas
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Agrega clases desde la sección de Semestres para ver tu horario aquí.
          </p>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'semesters' })}
            className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            Ir a Semestres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {days.map(day => {
            const dayClasses = scheduleByDay[day];
            if (!dayClasses || dayClasses.length === 0) return null;

            const today = new Date().getDay();
            const isToday = day === today;

            return (
              <div
                key={day}
                className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                  }`}
              >
                <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 ${isToday ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {getDayName(day)}
                    </h3>
                    {isToday && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                        Hoy
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {dayClasses.map(cls => {
                    const subject = state.subjects.find(s =>
                      s.name.toLowerCase().includes(cls.subject.toLowerCase().split(' ')[0]) ||
                      cls.subject.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
                    );

                    // Determine if this is the current class
                    const now = new Date();
                    const currentDay = now.getDay();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();

                    const [startHour, startMinute] = cls.startTime.split(':').map(Number);
                    const [endHour, endMinute] = cls.endTime.split(':').map(Number);

                    const isCurrentClass =
                      day === currentDay &&
                      (currentHour > startHour || (currentHour === startHour && currentMinute >= startMinute)) &&
                      (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute));

                    return (
                      <div
                        key={cls.id}
                        onClick={() => handleOpenSubject(cls.subject)}
                        className={`p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 transition-all ${isCurrentClass
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                          : 'bg-white dark:bg-slate-900/50 hover:border-blue-300 dark:hover:border-blue-700'
                          } cursor-pointer group`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {subject && (
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: subject.color }}
                              />
                            )}
                            <span className="font-medium text-slate-900 dark:text-white text-sm">
                              {cls.subject}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400 font-mono">
                            {cls.startTime} - {cls.endTime}
                          </span>
                          {cls.modality === 'Virtual' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-purple-600 text-xs font-medium">💻 Virtual</span>
                              {cls.teamsLink && (
                                <a
                                  href={cls.teamsLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-1 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 transition-colors"
                                >
                                  Teams
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-green-600 text-xs font-medium">
                              📍 {cls.room}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          📊 Resumen semanal
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {schedule.length}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Clases totales</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {schedule.filter(c => c.modality === 'Virtual').length}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Virtuales</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {schedule.filter(c => c.modality === 'Presencial').length}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Presenciales</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {Object.keys(scheduleByDay).length}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Días con clases</p>
          </div>
        </div>
      </div>
    </div>
  );
}
