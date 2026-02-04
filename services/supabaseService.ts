import { createClient } from '@supabase/supabase-js';
import { Participant, Group, TournamentSettings, Resource } from '../types';

const supabaseUrl = 'https://knsevnjyfrqmehxgtswp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtuc2V2bmp5ZnJxbWVoeGd0c3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNjY1MDksImV4cCI6MjA4NTc0MjUwOX0.4GThNuLmHZzANP7fxJj1jqpYpfjYI8KkPdGPubryxFk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Participants ---

export async function fetchParticipants(): Promise<Participant[]> {
    const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching participants:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        favoriteResource: row.resource as Resource,
        personaTitle: row.persona_title,
        personaDescription: row.persona_description,
    }));
}

export async function addParticipant(participant: Participant): Promise<Participant | null> {
    const { data, error } = await supabase
        .from('participants')
        .insert({
            id: participant.id,
            name: participant.name,
            email: participant.email,
            resource: participant.favoriteResource,
            persona_title: participant.personaTitle,
            persona_description: participant.personaDescription,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding participant:', error);
        return null;
    }

    return {
        id: data.id,
        name: data.name,
        email: data.email,
        favoriteResource: data.resource as Resource,
        personaTitle: data.persona_title,
        personaDescription: data.persona_description,
    };
}

export async function deleteParticipant(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting participant:', error);
        return false;
    }
    return true;
}

// --- Settings ---

export async function fetchSettings(): Promise<TournamentSettings | null> {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) {
        console.error('Error fetching settings:', error);
        return null;
    }

    return {
        deadline: data.deadline,
        isRegistrationClosed: data.is_registration_closed,
        adminKey: '12345', // Keep admin key client-side only
        tournamentStarted: data.tournament_started,
    };
}

export async function updateSettings(settings: Partial<TournamentSettings>): Promise<boolean> {
    const updateData: Record<string, unknown> = {};

    if (settings.deadline !== undefined) updateData.deadline = settings.deadline;
    if (settings.isRegistrationClosed !== undefined) updateData.is_registration_closed = settings.isRegistrationClosed;
    if (settings.tournamentStarted !== undefined) updateData.tournament_started = settings.tournamentStarted;

    const { error } = await supabase
        .from('settings')
        .update(updateData)
        .eq('id', 1);

    if (error) {
        console.error('Error updating settings:', error);
        return false;
    }
    return true;
}

// --- Groups ---

export async function fetchGroups(): Promise<Group[]> {
    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching groups:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        participants: row.player_ids || [],
    }));
}

export async function saveGroups(groups: Group[]): Promise<boolean> {
    // First, delete all existing groups
    const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
        console.error('Error deleting groups:', deleteError);
        return false;
    }

    if (groups.length === 0) return true;

    // Insert new groups
    const { error: insertError } = await supabase
        .from('groups')
        .insert(groups.map(g => ({
            id: g.id,
            name: g.name,
            player_ids: g.participants,
        })));

    if (insertError) {
        console.error('Error inserting groups:', insertError);
        return false;
    }

    return true;
}

export async function deleteAllData(): Promise<boolean> {
    try {
        // Delete all participants
        await supabase.from('participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete all groups
        await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Reset settings
        await supabase.from('settings').update({
            deadline: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
            is_registration_closed: false,
            tournament_started: false,
        }).eq('id', 1);

        return true;
    } catch (error) {
        console.error('Error deleting all data:', error);
        return false;
    }
}
