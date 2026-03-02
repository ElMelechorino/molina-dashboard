import { supabase, getUserId } from '../supabaseClient';
import { Folder } from '../types';
import { log, logError } from '../lib/logger';

const CTX = 'FoldersService';

export const foldersService = {
    async getBySubject(subjectId: string): Promise<Folder[]> {
        const userId = await getUserId();
        if (!userId) return [];
        log(CTX, 'getBySubject', { subjectId });

        const { data, error } = await supabase
            .from('folders')
            .select('*')
            .eq('user_id', userId)
            .eq('subject_id', subjectId)
            .order('created_at', { ascending: true });

        if (error) {
            logError(CTX, 'getBySubject failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async getAll(): Promise<Folder[]> {
        const userId = await getUserId();
        if (!userId) return [];
        log(CTX, 'getAll');

        const { data, error } = await supabase
            .from('folders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            logError(CTX, 'getAll failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async create(input: { subjectId: string; parentId: string | null; name: string }): Promise<Folder> {
        const userId = await getUserId();
        if (!userId) throw new Error('No authenticated user');
        log(CTX, 'create', input);

        const { data, error } = await supabase
            .from('folders')
            .insert({
                user_id: userId,
                subject_id: input.subjectId,
                parent_id: input.parentId,
                name: input.name,
            })
            .select()
            .single();

        if (error) {
            logError(CTX, 'create failed', error);
            throw error;
        }

        return mapRow(data);
    },

    async update(folder: Folder): Promise<Folder> {
        log(CTX, 'update', folder);

        const { data, error } = await supabase
            .from('folders')
            .update({ name: folder.name })
            .eq('id', folder.id)
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
            .from('folders')
            .delete()
            .eq('id', id);

        if (error) {
            logError(CTX, 'remove failed', error);
            throw error;
        }
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Folder {
    return {
        id: row.id,
        user_id: row.user_id,
        parentId: row.parent_id,
        subjectId: row.subject_id,
        name: row.name,
        createdAt: new Date(row.created_at),
    };
}
