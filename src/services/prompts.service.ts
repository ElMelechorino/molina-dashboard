import { supabase, getUserId } from '../supabaseClient';
import { Prompt } from '../types';
import { log, logError } from '../lib/logger';

const CTX = 'PromptsService';

export const promptsService = {
    async getAll(): Promise<Prompt[]> {
        const userId = await getUserId();
        log(CTX, 'getAll');

        const { data, error } = await supabase
            .from('prompts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            logError(CTX, 'getAll failed', error);
            throw error;
        }

        return (data ?? []).map(mapRow);
    },

    async create(input: { title: string; content: string; category: string }): Promise<Prompt> {
        const userId = await getUserId();
        log(CTX, 'create', input);

        const { data, error } = await supabase
            .from('prompts')
            .insert({
                user_id: userId,
                title: input.title,
                content: input.content,
                category: input.category,
            })
            .select()
            .single();

        if (error) {
            logError(CTX, 'create failed', error);
            throw error;
        }

        return mapRow(data);
    },

    async update(prompt: Prompt): Promise<Prompt> {
        log(CTX, 'update', { id: prompt.id });

        const { data, error } = await supabase
            .from('prompts')
            .update({
                title: prompt.title,
                content: prompt.content,
                category: prompt.category,
            })
            .eq('id', prompt.id)
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
            .from('prompts')
            .delete()
            .eq('id', id);

        if (error) {
            logError(CTX, 'remove failed', error);
            throw error;
        }
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Prompt {
    return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        content: row.content ?? '',
        category: row.category ?? 'General',
        createdAt: new Date(row.created_at),
    };
}
