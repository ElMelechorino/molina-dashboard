import { supabase, getUserId } from '../supabaseClient';
import { Task } from '../types';
import { log, logError } from '../lib/logger';

const CTX = 'TasksService';

export const tasksService = {
    async getAll(): Promise<Task[]> {
        const userId = await getUserId();
        if (!userId) return [];
        log(CTX, 'getAll');

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            logError(CTX, 'getAll failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async getBySubject(subjectId: string): Promise<Task[]> {
        const userId = await getUserId();
        if (!userId) return [];
        log(CTX, 'getBySubject', { subjectId });

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .eq('subject_id', subjectId)
            .order('created_at', { ascending: false });

        if (error) {
            logError(CTX, 'getBySubject failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async create(input: { subjectId: string; folderId: string | null; title: string; completed: boolean; dueDate?: Date }): Promise<Task> {
        const userId = await getUserId();
        if (!userId) throw new Error('No authenticated user');
        log(CTX, 'create', input);

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                user_id: userId,
                subject_id: input.subjectId,
                folder_id: input.folderId,
                title: input.title,
                completed: input.completed,
                due_date: input.dueDate?.toISOString() ?? null,
            })
            .select()
            .single();

        if (error) {
            logError(CTX, 'create failed', error);
            throw error;
        }

        return mapRow(data);
    },

    async update(task: Task): Promise<Task> {
        log(CTX, 'update', { id: task.id, completed: task.completed });

        const { data, error } = await supabase
            .from('tasks')
            .update({
                title: task.title,
                completed: task.completed,
                due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
            })
            .eq('id', task.id)
            .select()
            .single();

        if (error) {
            logError(CTX, 'update failed', error);
            throw error;
        }

        return mapRow(data);
    },

    async remove(id: string): Promise<void> {
        log(CTX, 'remove', { id });

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) {
            logError(CTX, 'remove failed', error);
            throw error;
        }
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Task {
    return {
        id: row.id,
        user_id: row.user_id,
        folderId: row.folder_id,
        subjectId: row.subject_id ?? '',
        title: row.title,
        completed: row.completed ?? false,
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        createdAt: new Date(row.created_at),
    };
}
