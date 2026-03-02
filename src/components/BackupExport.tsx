import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { semestersService } from '../services/semesters.service';
import { subjectsService } from '../services/subjects.service';
import { foldersService } from '../services/folders.service';
import { notesService } from '../services/notes.service';
import { tasksService } from '../services/tasks.service';
import { logError } from '../lib/logger';

export function BackupExport() {
  const { state, dispatch } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const activeSemester = state.semesters.find(s => s.isActive);

  const handleExportCurrentSemester = () => {
    if (!activeSemester) {
      alert('No hay un semestre activo para exportar');
      return;
    }

    const semesterData = {
      semester: activeSemester,
      schedule: activeSemester.schedule,
      subjects: state.subjects.filter(s => s.semesterId === activeSemester.id),
      folders: state.folders.filter(f => {
        const subject = state.subjects.find(s => s.id === f.subjectId);
        return subject?.semesterId === activeSemester.id;
      }),
      notes: state.notes.filter(n => {
        const subject = state.subjects.find(s => s.id === n.subjectId);
        return subject?.semesterId === activeSemester.id;
      }),
      tasks: state.tasks.filter(t => {
        const subject = state.subjects.find(s => s.id === t.subjectId);
        return subject?.semesterId === activeSemester.id;
      }),

      exportedAt: new Date().toISOString(),
    };

    downloadJson(semesterData, `molina-dashboard-${activeSemester.name}.json`);
  };

  const handleExportAll = () => {
    const allData = {
      semesters: state.semesters,
      subjects: state.subjects,
      folders: state.folders,
      notes: state.notes,
      tasks: state.tasks,
      prompts: state.prompts,
      exportedAt: new Date().toISOString(),
    };

    downloadJson(allData, `molina-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleExportPrompts = () => {
    const promptsData = {
      prompts: state.prompts,
      exportedAt: new Date().toISOString(),
    };

    downloadJson(promptsData, `molina-dashboard-prompts-${new Date().toISOString().split('T')[0]}.json`);
  };

  const downloadJson = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      let text;
      let rawData;
      try {
        text = await file.text();
        rawData = JSON.parse(text);
      } catch (err) {
        throw new Error("El archivo no es un JSON válido.");
      }

      // Simple validation
      if (!rawData.semester || !rawData.semester.name) {
        throw new Error("Formato de archivo inválido. No se encontró el semestre en el backup. Asegúrate de importar un archivo generado por esta aplicación.");
      }

      // 1. Create Semester
      const newSemester = await semestersService.create({
        name: rawData.semester.name + ' (Importado)',
        isActive: false,
        schedule: rawData.schedule || [],
      });

      // Mapping old IDs to new IDs
      const subjectMap: Record<string, string> = {};
      const folderMap: Record<string, string> = {};

      // 2. Import Subjects
      const subjects = rawData.subjects || [];
      for (const sub of subjects) {
        const newSub = await subjectsService.create({
          semesterId: newSemester.id,
          name: sub.name,
          color: sub.color,
        });
        subjectMap[sub.id] = newSub.id;
      }

      // 3. Import Folders (Level 1 first, then nested if any)
      const folders = rawData.folders || [];
      const createFolder = async (folder: any, parentId: string | null = null) => {
        const newSubId = subjectMap[folder.subjectId];
        if (!newSubId) return null;

        const newFolder = await foldersService.create({
          subjectId: newSubId,
          parentId,
          name: folder.name,
        });
        folderMap[folder.id] = newFolder.id;
        return newFolder;
      };

      for (const folder of folders) {
        if (!folder.parentId) await createFolder(folder);
      }
      for (const folder of folders) {
        if (folder.parentId && folderMap[folder.parentId]) {
          await createFolder(folder, folderMap[folder.parentId]);
        }
      }

      // 4. Import Notes
      const notes = rawData.notes || [];
      for (const note of notes) {
        const newSubId = subjectMap[note.subjectId];
        if (newSubId) {
          await notesService.create({
            subjectId: newSubId,
            folderId: folderMap[note.folderId] || '',
            title: note.title,
            content: note.content,
          });
        }
      }

      // 5. Import Tasks
      const tasks = rawData.tasks || [];
      for (const task of tasks) {
        const newSubId = subjectMap[task.subjectId];
        if (newSubId) {
          await tasksService.create({
            subjectId: newSubId,
            folderId: folderMap[task.folderId] || null,
            title: task.title,
            completed: task.completed,
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          });
        }
      }

      alert('Semestre importado correctamente.');

      const [allSemesters, allSubjects, allFolders, allNotes, allTasks] = await Promise.all([
        semestersService.getAll(),
        subjectsService.getAll(),
        foldersService.getAll(),
        notesService.getAll(),
        tasksService.getAll(),
      ]);

      dispatch({ type: 'SET_SEMESTERS', payload: allSemesters });
      dispatch({ type: 'SET_SUBJECTS', payload: allSubjects });
      dispatch({ type: 'SET_FOLDERS', payload: allFolders });
      dispatch({ type: 'SET_NOTES', payload: allNotes });
      dispatch({ type: 'SET_TASKS', payload: allTasks });

    } catch (err: any) {
      logError('BackupExport', 'Import failed', err);
      alert('Error al importar el archivo: ' + (err.message || 'Desconocido'));
    } finally {
      setIsImporting(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const stats = {
    semesters: state.semesters.length,
    subjects: state.subjects.length,
    notes: state.notes.length,
    tasks: state.tasks.length,
    prompts: state.prompts.length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          📦 Backup & Export
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Exporta tus datos para respaldo o migración
        </p>
      </div>

      {/* Stats Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          📊 Resumen de datos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatItem icon="📚" label="Semestres" value={stats.semesters} />
          <StatItem icon="📘" label="Materias" value={stats.subjects} />
          <StatItem icon="📒" label="Notas" value={stats.notes} />
          <StatItem icon="✅" label="Tareas" value={stats.tasks} />
          <StatItem icon="🤖" label="Prompts" value={stats.prompts} />
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Export Current Semester */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📅</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Semestre Actual</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {activeSemester
              ? `Exportar "${activeSemester.name}" con todas sus materias, notas y tareas.`
              : 'No hay un semestre activo seleccionado.'}
          </p>
          <button
            onClick={handleExportCurrentSemester}
            disabled={!activeSemester}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Exportar semestre
          </button>
        </div>

        {/* Export All Data */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💾</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Backup Completo</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Exportar todos los semestres, materias, notas, tareas y prompts.
          </p>
          <button
            onClick={handleExportAll}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
          >
            Exportar todo
          </button>
        </div>

        {/* Export Prompts */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🤖</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Prompt Vault</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Exportar solo tu colección de prompts guardados.
          </p>
          <button
            onClick={handleExportPrompts}
            disabled={state.prompts.length === 0}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Exportar prompts
          </button>
        </div>

        {/* Import Semester */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📥</span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Importar Semestre</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Restaura un semestre exportado desde un archivo JSON.
          </p>
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-xl font-medium hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importando...' : 'Seleccionar archivo'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Sobre el backup
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
              Los archivos se exportan en formato JSON. Puedes usar estos datos para restaurar
              tu dashboard o migrar a otra cuenta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
