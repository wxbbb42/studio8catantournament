import { GoogleGenAI, Type } from "@google/genai";
import { Participant, Resource } from '../types';

// Use gemini-3-flash-preview for quick, creative text generation
const MODEL_NAME = 'gemini-3-flash-preview';

const getAi = () => {
    // Only initialize if API KEY is present to avoid errors on load if missing
    if (!process.env.API_KEY) return null;
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generatePlayerPersona = async (name: string, resource: Resource): Promise<{ title: string; description: string }> => {
  const ai = getAi();
  if (!ai) {
    return {
      title: 'The Settler',
      description: `A brave explorer seeking fortune in ${resource}.`
    };
  }

  try {
    const prompt = `
      Generate a funny, epic, or mysterious Catan-themed "Title" and a short 1-sentence "Strategy/Persona Description" for a player named "${name}" who loves the resource "${resource}".
      Examples: "Baron of Bricks", "The Sheep Whisperer", "Lord of the Longest Road".
      Make it sound like a cool RPG character description but for a board game.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    return {
        title: json.title || `The ${resource} Lover`,
        description: json.description || `Ready to trade ${resource} for victory.`
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback
    return {
      title: 'The Unnamed Settler',
      description: 'Their legend is yet to be written.'
    };
  }
};

export const generateGroupNames = async (groupsOfParticipants: Participant[][]): Promise<string[]> => {
    const ai = getAi();
    if (!ai) {
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
            
            Return a JSON array of strings.
        `;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        const names = JSON.parse(response.text || '[]');
        if (Array.isArray(names) && names.length === groupsOfParticipants.length) {
            return names;
        }
        throw new Error("Invalid array length");
    } catch (e) {
        console.error(e);
        return groupsOfParticipants.map((_, i) => `Table ${i + 1}`);
    }
}
