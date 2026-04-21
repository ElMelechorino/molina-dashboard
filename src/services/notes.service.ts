import { supabase, getUserId } from '../supabaseClient';
import { Note } from '../types';
import { log, logError } from '../lib/logger';

const CTX = 'NotesService';

export const notesService = {
    async getAll(): Promise<Note[]> {
        const userId = await getUserId();
        if (!userId) return [];
        log(CTX, 'getAll');

        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            logError(CTX, 'getAll failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async getBySubject(subjectId: string): Promise<Note[]> {
        const userId = await getUserId();
        if (!userId) return [];
        log(CTX, 'getBySubject', { subjectId });

        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .eq('subject_id', subjectId)
            .order('updated_at', { ascending: false });

        if (error) {
            logError(CTX, 'getBySubject failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async create(input: { subjectId: string; folderId: string | null; title: string; content: string }): Promise<Note> {
        const userId = await getUserId();
        if (!userId) throw new Error('No authenticated user');
        log(CTX, 'create', input);

        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('notes')
            .insert({
                user_id: userId,
                subject_id: input.subjectId,
                folder_id: input.folderId || null,
                title: input.title,
                content: input.content,
                created_at: now,
                updated_at: now,
            })
            .select()
            .single();

        if (error) {
            logError(CTX, 'create failed', error);
            throw error;
        }

        return mapRow(data);
    },

    async update(note: Note): Promise<Note> {
        log(CTX, 'update', { id: note.id, title: note.title });

        const { data, error } = await supabase
            .from('notes')
            .update({
                title: note.title,
                content: note.content,
                subject_id: note.subjectId,
                folder_id: note.folderId || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', note.id)
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
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) {
            logError(CTX, 'remove failed', error);
            throw error;
        }
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Note {
    return {
        id: row.id,
        user_id: row.user_id,
        folderId: row.folder_id ?? '',
        subjectId: row.subject_id ?? '',
        title: row.title,
        content: row.content ?? '',
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
