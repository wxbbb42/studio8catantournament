import { AzureOpenAI } from 'openai';
import { Participant, Resource } from '../types';

// Azure OpenAI Configuration - uses environment variables for security
const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '';
const AZURE_API_KEY = import.meta.env.VITE_AZURE_OPENAI_KEY || '';
const DEPLOYMENT_NAME = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
const API_VERSION = '2024-08-01-preview';

const getClient = () => {
    if (!AZURE_API_KEY) return null;
    return new AzureOpenAI({
        endpoint: AZURE_ENDPOINT,
        apiKey: AZURE_API_KEY,
        apiVersion: API_VERSION,
        dangerouslyAllowBrowser: true, // Required for client-side usage
    });
};

export const generatePlayerPersona = async (name: string, resource: Resource): Promise<{ title: string; description: string }> => {
    const client = getClient();
    if (!client) {
        return {
            title: 'The Settler',
            description: `A brave explorer seeking fortune in ${resource}.`
        };
    }

    try {
        const prompt = `
Generate a funny, epic, or mysterious Catan-themed "Title" and a short 1-sentence "Strategy/Persona Description" for a player who loves the resource "${resource}".
IMPORTANT: Do NOT include the player's name "${name}" in the title or description - the name is already displayed separately.
Examples of good titles: "Baron of Bricks", "The Sheep Whisperer", "Lord of the Longest Road", "Archduke of Ore".
Make it sound like a cool RPG character title but for a board game.

Respond ONLY with valid JSON in this exact format:
{"title": "Your Title Here", "description": "Your description here."}
`;

        const response = await client.chat.completions.create({
            model: DEPLOYMENT_NAME,
            messages: [
                { role: 'system', content: 'You are a creative assistant that generates fun Catan player personas. Always respond with valid JSON only, no markdown.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_completion_tokens: 150,
        });

        const content = response.choices[0]?.message?.content || '{}';
        // Clean any markdown formatting that might be present
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        const json = JSON.parse(cleanedContent);

        return {
            title: json.title || `The ${resource} Lover`,
            description: json.description || `Ready to trade ${resource} for victory.`
        };
    } catch (error) {
        console.error("Azure OpenAI API Error:", error);
        return {
            title: 'The Unnamed Settler',
            description: 'Their legend is yet to be written.'
        };
    }
};

export const generateGroupNames = async (groupsOfParticipants: Participant[][]): Promise<string[]> => {
    const client = getClient();
    if (!client) {
        return groupsOfParticipants.map((_, i) => `Table ${i + 1}`);
    }

    try {
        const descriptions = groupsOfParticipants.map(group =>
            group.map(p => `${p.name} (${p.favoriteResource})`).join(', ')
        );

        const prompt = `
I have ${groupsOfParticipants.length} groups of Catan players.
Generate a creative, funny, thematic team/table name for each group based on their combined vibes/resources.

Group Compositions:
${descriptions.map((d, i) => `Group ${i + 1}: ${d}`).join('\n')}

Respond ONLY with a valid JSON array of ${groupsOfParticipants.length} strings. Example: ["Name 1", "Name 2"]
`;

        const response = await client.chat.completions.create({
            model: DEPLOYMENT_NAME,
            messages: [
                { role: 'system', content: 'You are a creative assistant that generates fun Catan team names. Always respond with a valid JSON array only, no markdown.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_completion_tokens: 200,
        });

        const content = response.choices[0]?.message?.content || '[]';
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        const names = JSON.parse(cleanedContent);

        if (Array.isArray(names) && names.length === groupsOfParticipants.length) {
            return names;
        }
        throw new Error("Invalid array length");
    } catch (e) {
        console.error("Azure OpenAI API Error:", e);
        return groupsOfParticipants.map((_, i) => `Table ${i + 1}`);
    }
};
