import { supabase, getUserId } from '../supabaseClient';
import { Subject } from '../types';
import { log, logError } from '../lib/logger';

const CTX = 'SubjectsService';

export const subjectsService = {
    async getBySemester(semesterId: string): Promise<Subject[]> {
        const userId = await getUserId();
        if (!userId) return [];
        log(CTX, 'getBySemester', { semesterId });

        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('user_id', userId)
            .eq('semester_id', semesterId)
            .order('created_at', { ascending: true });

        if (error) {
            logError(CTX, 'getBySemester failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async getAll(): Promise<Subject[]> {
        const userId = await getUserId();
        if (!userId) return [];
        log(CTX, 'getAll');

        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            logError(CTX, 'getAll failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async create(input: { semesterId: string; name: string; color: string }): Promise<Subject> {
        const userId = await getUserId();
        if (!userId) throw new Error('No authenticated user');
        log(CTX, 'create', input);

        const { data, error } = await supabase
            .from('subjects')
            .insert({
                user_id: userId,
                semester_id: input.semesterId,
                name: input.name,
                color: input.color,
            })
            .select()
            .single();

        if (error) {
            logError(CTX, 'create failed', error);
            throw error;
        }

        return mapRow(data);
    },

    async update(subject: Subject): Promise<Subject> {
        log(CTX, 'update', subject);

        const { data, error } = await supabase
            .from('subjects')
            .update({
                name: subject.name,
                color: subject.color,
            })
            .eq('id', subject.id)
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
            .from('subjects')
            .delete()
            .eq('id', id);

        if (error) {
            logError(CTX, 'remove failed', error);
            throw error;
        }
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Subject {
    return {
        id: row.id,
        user_id: row.user_id,
        semesterId: row.semester_id,
        name: row.name,
        color: row.color,
        createdAt: new Date(row.created_at),
    };
}
