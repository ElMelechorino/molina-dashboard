import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { semestersService } from '../services/semesters.service';
import { subjectsService } from '../services/subjects.service';
import { Semester, Subject, ScheduleClass } from '../types';
import { logError, log } from '../lib/logger';
import { Library, Calendar, Trash2, Edit2, MapPin, Video, Plus } from 'lucide-react';

const SUBJECT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
];

export function SemesterManager() {
  const { state, dispatch } = useApp();
  const [newSemesterName, setNewSemesterName] = useState('');
  const [showNewSemester, setShowNewSemester] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [showNewSubject, setShowNewSubject] = useState<string | null>(null);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [isUpdatingSubject, setIsUpdatingSubject] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectColor, setEditSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [isActivating, setIsActivating] = useState(false);

  const reloadData = async () => {
    try {
      const [semesters, subjects] = await Promise.all([
        semestersService.getAll(),
        subjectsService.getAll(),
      ]);
      dispatch({ type: 'SET_SEMESTERS', payload: semesters });
      dispatch({ type: 'SET_SUBJECTS', payload: subjects });
    } catch (err) {
      logError('SemesterManager', 'Reload failed', err);
      alert('Error al cargar datos. Revisa la consola para detalles.');
    }
  };

  const handleCreateSemester = async () => {
    if (!newSemesterName.trim()) return;

    try {
      await semestersService.create({
        name: newSemesterName.trim(),
        isActive: state.semesters.length === 0,
        schedule: [],
      });

      await reloadData();
      setNewSemesterName('');
      setShowNewSemester(false);
    } catch (err: any) {
      logError('SemesterManager', 'Create semester failed', err);
      alert('Error al crear semestre: ' + (err.message || 'Verifica que las tablas de Supabase estén creadas.'));
    }
  };

  const handleSetActive = async (semester: Semester) => {
    if (isActivating) return;
    setIsActivating(true);
    try {
      log('SemesterManager', 'Activating semester', { id: semester.id });
      // Deactivate all
      const activeSemesters = state.semesters.filter(s => s.isActive && s.id !== semester.id);
      for (const s of activeSemesters) {
        await semestersService.update({ ...s, isActive: false });
      }
      // Activate selected
      await semestersService.update({ ...semester, isActive: true });
      dispatch({ type: 'SET_ACTIVE_SEMESTER', payload: semester.id });
      await reloadData();
    } catch (err: any) {
      logError('SemesterManager', 'Set active failed', err);
      alert('Error al activar semestre: ' + (err.message || 'Desconocido'));
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeleteSemester = async (id: string) => {
    if (confirm('¿Eliminar este semestre y todo su contenido?')) {
      try {
        await semestersService.remove(id);
        await reloadData();
      } catch (err: any) {
        logError('SemesterManager', 'Delete semester failed', err);
        alert('Error al eliminar semestre: ' + (err.message || 'Desconocido'));
      }
    }
  };

  const handleCreateSubject = async (semesterId: string) => {
    if (!newSubjectName.trim() || isCreatingSubject) return;

    setIsCreatingSubject(true);
    try {
      await subjectsService.create({
        semesterId,
        name: newSubjectName.trim(),
        color: newSubjectColor,
      });

      await reloadData();

      setNewSubjectName('');
      setNewSubjectColor(SUBJECT_COLORS[0]);
      setShowNewSubject(null);
    } catch (err: any) {
      logError('SemesterManager', 'Create subject failed', err);
      alert('Error al crear materia: ' + (err.message || 'Desconocido'));
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm('¿Eliminar esta materia y todo su contenido?')) {
      try {
        await subjectsService.remove(id);
        await reloadData();
      } catch (err: any) {
        logError('SemesterManager', 'Delete subject failed', err);
        alert('Error al eliminar materia: ' + (err.message || 'Desconocido'));
      }
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editSubjectName.trim() || isUpdatingSubject) return;

    setIsUpdatingSubject(true);
    try {
      await subjectsService.update({
        ...editingSubject,
        name: editSubjectName.trim(),
        color: editSubjectColor,
      });

      await reloadData();
      setEditingSubject(null);
    } catch (err: any) {
      logError('SemesterManager', 'Update subject failed', err);
      alert('Error al actualizar materia: ' + (err.message || 'Desconocido'));
    } finally {
      setIsUpdatingSubject(false);
    }
  };

  const handleOpenSubject = (subject: Subject) => {
    dispatch({ type: 'SET_ACTIVE_SUBJECT', payload: subject.id });
    dispatch({ type: 'SET_ACTIVE_FOLDER', payload: null });
    dispatch({ type: 'SET_VIEW', payload: 'subject' });
  };

  const handleSaveSchedule = async (semester: Semester, schedule: ScheduleClass[]) => {
    try {
      await semestersService.update({ ...semester, schedule });
      await reloadData();
      setEditingSchedule(null);
      log('SemesterManager', 'Schedule saved');
    } catch (err: any) {
      logError('SemesterManager', 'Save schedule failed', err);
      alert('Error al guardar horario: ' + (err.message || 'Desconocido'));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Library className="w-7 h-7 text-blue-500" /> Semestres y Materias</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestiona tus semestres, materias y horarios
          </p>
        </div>
        <button
          onClick={() => setShowNewSemester(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo semestre
        </button>
      </div>

      {/* New Semester Form */}
      {showNewSemester && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Nuevo semestre</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newSemesterName}
              onChange={(e) => setNewSemesterName(e.target.value)}
              placeholder="Ej: 2026-2"
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSemester()}
              autoFocus
            />
            <button
              onClick={handleCreateSemester}
              className="px-6 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Crear
            </button>
            <button
              onClick={() => setShowNewSemester(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Semesters List */}
      {state.semesters.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Library className="w-16 h-16 text-slate-400 mx-auto" />
          <h2 className="mt-4 text-xl font-medium text-slate-900 dark:text-white">
            No tienes semestres creados
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Crea tu primer semestre para empezar a organizar tus materias.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {state.semesters.map((semester) => {
            const subjects = state.subjects.filter(s => s.semesterId === semester.id);

            return (
              <div key={semester.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Semester Header */}
                <div className={`px-6 py-4 border-b dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${semester.isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50' : 'bg-slate-50 dark:bg-slate-900/50'
                  }`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {semester.name}
                    </h2>
                    {semester.isActive && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                        Activo
                      </span>
                    )}
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {subjects.length} materia{subjects.length !== 1 ? 's' : ''} • {semester.schedule.length} clase{semester.schedule.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {!semester.isActive && (
                      <button
                        onClick={() => handleSetActive(semester)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-center text-sm text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                      >
                        Activar
                      </button>
                    )}
                    <button
                      onClick={() => setEditingSchedule(semester.id)}
                      className="flex-1 sm:flex-none px-3 py-1.5 text-center text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="w-4 h-4" /> Horario
                    </button>
                    <button
                      onClick={() => handleDeleteSemester(semester.id)}
                      className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subjects */}
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="group flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => handleOpenSubject(subject)}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className="font-medium text-slate-900 dark:text-white truncate">{subject.name}</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSubject(subject);
                              setEditSubjectName(subject.name);
                              setEditSubjectColor(subject.color);
                            }}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubject(subject.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Subject Button */}
                    {showNewSubject === semester.id ? (
                      <div className="col-span-1 sm:col-span-2 lg:col-span-3 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 space-y-3">
                        <input
                          type="text"
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          placeholder="Nombre de la materia"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          disabled={isCreatingSubject}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject(semester.id)}
                        />
                        <div>
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">Color de la materia</label>
                          <div className="flex flex-wrap gap-2">
                            {SUBJECT_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => setNewSubjectColor(color)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${newSubjectColor === color
                                  ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900 scale-110'
                                  : 'hover:scale-105'
                                  }`}
                                style={{ backgroundColor: color }}
                                disabled={isCreatingSubject}
                                title="Seleccionar color"
                              >
                                {newSubjectColor === color && (
                                  <svg className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: newSubjectColor }} />
                            <span className="text-xs text-slate-500 dark:text-slate-400">Color seleccionado</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCreateSubject(semester.id)}
                            disabled={isCreatingSubject || !newSubjectName.trim()}
                            className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCreatingSubject ? 'Creando...' : 'Crear'}
                          </button>
                          <button
                            onClick={() => { setShowNewSubject(null); setNewSubjectName(''); setNewSubjectColor(SUBJECT_COLORS[0]); }}
                            disabled={isCreatingSubject}
                            className="px-3 py-1.5 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewSubject(semester.id)}
                        className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors h-full min-h-[56px]"
                      >
                        <Plus className="w-5 h-5" />
                        Nueva materia
                      </button>
                    )}
                  </div>
                </div>

                {/* Schedule Editor Modal */}
                {editingSchedule === semester.id && (
                  <ScheduleEditorModal
                    semester={semester}
                    subjects={subjects}
                    onSave={(schedule) => handleSaveSchedule(semester, schedule)}
                    onClose={() => setEditingSchedule(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Editar materia</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateSubject()}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditSubjectColor(color)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${editSubjectColor === color
                        ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-800 scale-110'
                        : 'hover:scale-105'
                        }`}
                      style={{ backgroundColor: color }}
                      title="Seleccionar color"
                    >
                      {editSubjectColor === color && (
                        <svg className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: editSubjectColor }} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Color seleccionado</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 flex-wrap">
              <button
                onClick={() => setEditingSubject(null)}
                disabled={isUpdatingSubject}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto text-center disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateSubject}
                disabled={isUpdatingSubject || !editSubjectName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors w-full sm:w-auto text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingSubject ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Schedule Editor Modal ---- */

function ScheduleEditorModal({
  semester,
  subjects,
  onSave,
  onClose,
}: {
  semester: Semester;
  subjects: Subject[];
  onSave: (schedule: ScheduleClass[]) => Promise<void>;
  onClose: () => void;
}) {
  const [schedule, setSchedule] = useState<ScheduleClass[]>([...semester.schedule]);
  const [editingClass, setEditingClass] = useState<ScheduleClass | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const days = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
  ];

  const generateId = () => {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const newClass = (): ScheduleClass => ({
    id: generateId(),
    day: 1,
    startTime: '08:00',
    endTime: '09:30',
    subject: subjects.length > 0 ? subjects[0].name : '',
    modality: 'Presencial',
    room: '',
    teamsLink: '',
  });

  const handleAddClass = () => {
    const cls = newClass();
    setSchedule([...schedule, cls]);
    setEditingClass(cls);
  };

  const handleUpdateClass = (updated: ScheduleClass) => {
    setSchedule(prev => prev.map(c => c.id === updated.id ? updated : c));
    setEditingClass(null);
  };

  const handleDeleteClass = (id: string) => {
    setSchedule(prev => prev.filter(c => c.id !== id));
    if (editingClass?.id === id) setEditingClass(null);
  };

  // Group by day and sort
  const scheduleByDay = schedule.reduce((acc, cls) => {
    if (!acc[cls.day]) acc[cls.day] = [];
    acc[cls.day].push(cls);
    return acc;
  }, {} as Record<number, ScheduleClass[]>);

  Object.values(scheduleByDay).forEach(dayClasses =>
    dayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime))
  );

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] min-h-[50vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate w-full flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> Horario — {semester.name}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAddClass}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              + Clase
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Editing Form */}
          {editingClass && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-white">Editar clase</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Materia</label>
                  <select
                    value={editingClass.subject}
                    onChange={(e) => setEditingClass({ ...editingClass, subject: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                    <option value="">Personalizado...</option>
                  </select>
                  {editingClass.subject === '' && (
                    <input
                      type="text"
                      placeholder="Nombre de la materia"
                      className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none"
                      onChange={(e) => setEditingClass({ ...editingClass, subject: e.target.value })}
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Día</label>
                  <select
                    value={editingClass.day}
                    onChange={(e) => setEditingClass({ ...editingClass, day: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none"
                  >
                    {days.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Inicio</label>
                  <input
                    type="time"
                    value={editingClass.startTime}
                    onChange={(e) => setEditingClass({ ...editingClass, startTime: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fin</label>
                  <input
                    type="time"
                    value={editingClass.endTime}
                    onChange={(e) => setEditingClass({ ...editingClass, endTime: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Modalidad</label>
                  <select
                    value={editingClass.modality}
                    onChange={(e) => setEditingClass({ ...editingClass, modality: e.target.value as 'Virtual' | 'Presencial' })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Virtual">Virtual</option>
                  </select>
                </div>
                {editingClass.modality === 'Presencial' ? (
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Salón</label>
                    <input
                      type="text"
                      value={editingClass.room || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, room: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none"
                      placeholder="Ej: A-201"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Link de Teams</label>
                    <input
                      type="url"
                      value={editingClass.teamsLink || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, teamsLink: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none"
                      placeholder="https://teams.microsoft.com/..."
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2 flex-wrap">
                <button
                  onClick={() => handleUpdateClass(editingClass)}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors text-center"
                >
                  Guardar clase
                </button>
                <button
                  onClick={() => setEditingClass(null)}
                  className="w-full sm:w-auto px-4 py-2 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-center"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Schedule View */}
          {schedule.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="mt-4 text-lg font-medium text-slate-900 dark:text-white">Sin clases programadas</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Haz clic en "+ Clase" para agregar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {days.map(({ value, label }) => {
                const dayClasses = scheduleByDay[value];
                if (!dayClasses || dayClasses.length === 0) return null;

                return (
                  <div key={value}>
                    <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                      {label}
                    </h4>
                    <div className="space-y-2">
                      {dayClasses.map(cls => {
                        const subject = subjects.find(s => s.name === cls.subject);
                        return (
                          <div
                            key={cls.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 gap-2 sm:gap-0"
                          >
                            <div className="flex items-center gap-3">
                              {subject && (
                                <span
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: subject.color }}
                                />
                              )}
                              <span className="font-medium text-slate-900 dark:text-white truncate">{cls.subject}</span>
                              <div className="hidden sm:block text-slate-300 dark:text-slate-600 px-2">•</div>
                              <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {cls.startTime} - {cls.endTime}
                              </span>
                              <div className="hidden sm:block text-slate-300 dark:text-slate-600 px-2">•</div>
                              <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-1">
                                {cls.modality === 'Presencial' ? <><MapPin className="w-3 h-3 text-green-500" /> {cls.room}</> : <><Video className="w-3 h-3 text-purple-500" /> Virtual</>}
                              </span>
                            </div>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingClass(cls)}
                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClass(cls.id)}
                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
        </div>

        {/* Footer */}
        <div className="px-4 py-4 md:px-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 flex-wrap sm:flex-nowrap">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              setIsSaving(true);
              try {
                // Auto-commit any class being edited
                let finalSchedule = schedule;
                if (editingClass) {
                  finalSchedule = schedule.map(c => c.id === editingClass.id ? editingClass : c);
                  setEditingClass(null);
                }
                await onSave(finalSchedule);
              } catch {
                // Error already handled by parent
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Guardando...' : 'Guardar horario'}
          </button>
        </div>
      </div>
    </div>
  );
}
