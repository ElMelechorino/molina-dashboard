import { useState, useEffect } from 'react';
import { getCurrentClass, getNextClass, getDayName, formatTimeRemaining } from '../data/schedule';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Coffee, Smile, Calendar, MapPin, NotebookText, CheckSquare, Video } from 'lucide-react';

export function ScheduleWidget() {
  const { state, dispatch, getActiveSchedule } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get schedule from active semester
  const schedule = getActiveSchedule();
  const activeSemester = state.semesters.find(s => s.isActive);

  // Compute current/next class during render (no setState needed)
  const currentClass = getCurrentClass(schedule);
  const nextClass = getNextClass(schedule);

  // Only update the clock every second — no other state changes in the effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatus = () => {
    if (currentClass) {
      return { label: 'En clase', color: 'bg-green-500', icon: <CheckCircle2 className="w-4 h-4" /> };
    }
    const hour = currentTime.getHours();
    if (hour >= 7 && hour < 18) {
      return { label: 'Descanso', color: 'bg-yellow-500', icon: <Coffee className="w-4 h-4" /> };
    }
    return { label: 'Libre', color: 'bg-blue-500', icon: <Smile className="w-4 h-4" /> };
  };

  const status = getStatus();
  const dayName = getDayName(currentTime.getDay());
  const timeString = currentTime.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const handleOpenNotes = () => {
    if (currentClass) {
      const subject = state.subjects.find(s =>
        s.name.toLowerCase().includes(currentClass.subject.toLowerCase().split(' ')[0])
      );
      if (subject) {
        dispatch({ type: 'SET_ACTIVE_SUBJECT', payload: subject.id });
        dispatch({ type: 'SET_VIEW', payload: 'subject' });
      }
    }
  };

  const handleViewTasks = () => {
    dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
  };

  const handleViewSchedule = () => {
    dispatch({ type: 'SET_VIEW', payload: 'schedule' });
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Time & Day */}
          <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-4">
            <div className="text-left md:text-center shrink-0">
              <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {timeString}
              </div>
              <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                {dayName}
              </div>
            </div>

            {/* Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${currentClass
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
              : status.color === 'bg-yellow-500'
                ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
              }`}>
              <span>{status.icon}</span>
              <span className="text-sm font-medium">{status.label}</span>
            </div>

            {/* Semester Indicator */}
            {activeSemester && (
              <button
                onClick={handleViewSchedule}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Ver horario"
              >
                <Calendar className="w-4 h-4" /> {activeSemester.name}
              </button>
            )}
          </div>

          {/* Current/Next Class Info */}
          <div className="flex-1 w-full md:w-auto flex flex-col sm:flex-row items-center justify-center md:justify-center gap-2 sm:gap-6">
            {currentClass ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="text-center sm:text-left">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Clase actual
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {currentClass.subject}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {currentClass.startTime} - {currentClass.endTime}
                    {currentClass.modality === 'Presencial' && (
                      <span className="ml-2 flex items-center gap-1 inline-flex"><MapPin className="w-4 h-4" /> Salón {currentClass.room}</span>
                    )}
                  </div>
                </div>

                {/* Action buttons for current class */}
                <div className="flex items-center gap-2">
                  {currentClass.modality === 'Virtual' && currentClass.teamsLink && (
                    <a
                      href={currentClass.teamsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.5 3.5L10 14l-4.5-4.5-2 2 6.5 6.5 12.5-12.5z" />
                      </svg>
                      Unirse a Teams
                    </a>
                  )}
                  <button
                    onClick={handleOpenNotes}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Abrir notas de esta materia"
                  >
                    <NotebookText className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleViewTasks}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Ver tareas pendientes"
                  >
                    <CheckSquare className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-slate-600 dark:text-slate-300 font-medium">
                  Estás en descanso / tiempo libre
                </div>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <button
                    onClick={handleViewTasks}
                    className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <CheckSquare className="w-4 h-4" /> Revisar tareas pendientes
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <button
                    onClick={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
                    className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <NotebookText className="w-4 h-4" /> Ver notas recientes
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Next Class */}
          {nextClass && (
            <div className="hidden md:block text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Próxima clase
              </div>
              <div className="font-medium text-slate-900 dark:text-white">
                {nextClass.class.subject}
              </div>
              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  en {formatTimeRemaining(nextClass.minutesUntil)}
                </span>
                {nextClass.class.modality === 'Virtual' ? (
                  <span className="text-purple-500 dark:text-purple-400 flex items-center gap-1"><Video className="w-4 h-4" /> Virtual</span>
                ) : (
                  <span className="text-green-500 dark:text-green-400 flex items-center gap-1"><MapPin className="w-4 h-4" /> {nextClass.class.room}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
