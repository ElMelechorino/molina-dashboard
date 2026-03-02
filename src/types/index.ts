// Types for Molina Dashboard

export interface User {
  id: string;
  email: string;
  isLoggedIn: boolean;
}

export interface ScheduleClass {
  id: string;
  day: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  subject: string;
  modality: 'Virtual' | 'Presencial';
  room?: string;
  teamsLink?: string;
}

export interface Semester {
  id: string;
  user_id: string;
  name: string;
  isActive: boolean;
  schedule: ScheduleClass[];
  createdAt: Date;
}

export interface Subject {
  id: string;
  user_id: string;
  semesterId: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface Folder {
  id: string;
  user_id: string;
  parentId: string | null;
  subjectId: string;
  name: string;
  createdAt: Date;
}

export interface Note {
  id: string;
  user_id: string;
  folderId: string;
  subjectId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  user_id: string;
  folderId: string | null;
  subjectId: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  createdAt: Date;
}

export interface Prompt {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
}

export type ViewMode = 'dashboard' | 'semesters' | 'subject' | 'prompts' | 'backup' | 'search' | 'schedule';

export interface AppState {
  user: User | null;
  semesters: Semester[];
  subjects: Subject[];
  folders: Folder[];
  notes: Note[];
  tasks: Task[];
  prompts: Prompt[];
  currentView: ViewMode;
  activeSemesterId: string | null;
  activeSubjectId: string | null;
  activeFolderId: string | null;
  searchQuery: string;
  isDarkMode: boolean;
}
