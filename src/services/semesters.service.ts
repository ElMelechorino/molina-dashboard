import { supabase, getUserId } from '../supabaseClient';
import { Semester, ScheduleClass } from '../types';
import { log, logError } from '../lib/logger';

const CTX = 'SemestersService';

export const semestersService = {
    async getAll(): Promise<Semester[]> {
        const userId = await getUserId();
        if (!userId) return [];
        log(CTX, 'getAll', { userId });

        const { data, error } = await supabase
            .from('semesters')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            logError(CTX, 'getAll failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async create(input: { name: string; isActive: boolean; schedule: ScheduleClass[] }): Promise<Semester> {
        const userId = await getUserId();
        if (!userId) throw new Error('No authenticated user');
        log(CTX, 'create', input);

        const { data, error } = await supabase
            .from('semesters')
            .insert({
                user_id: userId,
                name: input.name,
                is_active: input.isActive,
                schedule: input.schedule,
            })
            .select()
            .single();

        if (error) {
            logError(CTX, 'create failed', error);
            throw error;
        }

        return mapRow(data);
    },

    async update(semester: Semester): Promise<Semester> {
        log(CTX, 'update', semester);

        const { data, error } = await supabase
            .from('semesters')
            .update({
                name: semester.name,
                is_active: semester.isActive,
                schedule: semester.schedule,
            })
            .eq('id', semester.id)
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
            .from('semesters')
            .delete()
            .eq('id', id);

        if (error) {
            logError(CTX, 'remove failed', error);
            throw error;
        }
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Semester {
    return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        isActive: row.is_active,
        schedule: (row.schedule ?? []) as ScheduleClass[],
        createdAt: new Date(row.created_at),
    };
}
