import { Resource } from '../types';

// Azure AI Image Generation Configuration (FLUX.1-Kontext-pro via OpenAI-compatible endpoint)
const AZURE_ENDPOINT = import.meta.env.VITE_AZURE_IMAGE_ENDPOINT || 'https://new-teams-playground-resource.openai.azure.com/openai/v1';
const AZURE_API_KEY = import.meta.env.VITE_AZURE_IMAGE_KEY || '';
const MODEL_NAME = 'FLUX.1-Kontext-pro';

// Resource-specific imagery for the tarot cards (content-filter safe language)
const RESOURCE_IMAGERY: Record<Resource, string> = {
    brick: 'standing before a magnificent terracotta cityscape with ornate brick towers, arched aqueducts, and clay-tiled rooftops. Ancient pottery and decorative tiles frame the scene. The palette features rich terracotta reds, warm oranges, burnt sienna, and golden ochre accents.',
    wood: 'emerging from an ancient enchanted forest with gnarled oak trees, twisted vines, and mystical mushrooms. They hold an intricately carved wooden staff adorned with leaves. Shafts of golden light pierce through the canopy. The palette features deep forest greens, rich browns, moss greens, and dappled golden highlights.',
    sheep: 'standing on rolling pastoral hills dotted with fluffy sheep and wildflowers, wearing flowing shepherd robes with embroidered patterns. A crescent moon rises in the background. The palette features soft ivory whites, sage greens, lavender, and gentle sky blues.',
    wheat: 'standing in a sea of golden wheat at the golden hour, with sheaves of grain forming an archway. A radiant sun with wavy rays crowns the scene. The palette features rich golden yellows, amber, warm ochre, and touches of burnt orange.',
    ore: 'deep within a magnificent crystal cavern surrounded by towering amethyst formations, glittering quartz clusters, and veins of precious metals. They hold an ornate lantern that illuminates the gems. The palette features deep purples, silvers, ice blues, and crystalline whites with golden lamp-light.',
};

const TAROT_STYLE_PROMPT = `A highly detailed vintage tarot card illustration in the iconic style of Pamela Colman Smith's 1909 Rider-Waite deck. 

CARD FRAME & BORDER:
- The entire illustration is centered within a generous, even white margin (approximately 5% of card width on all sides)
- Inside the white margin is a thin, clean black rectangular border line
- The white margin must be perfectly symmetrical on all four sides - top, bottom, left, and right
- The black border is crisp and consistent in thickness all around

ARTISTIC STYLE:
- Thick, expressive hand-drawn black ink outlines that are organic and slightly irregular
- Flat, blocky coloring using warm, medium-saturation watercolor washes
- Colors should have good depth and richness, similar to original 1909 Rider-Waite prints - not washed out, but not overly bright either
- Shading achieved through dense parallel hatching lines and cross-hatching
- Intricate stippling (tiny dots) for texture on skin, fabric, and natural elements
- Decorative Art Nouveau flourishes and symbolic details throughout

COMPOSITION:
- A single full-length figure as the central focus, posed dramatically
- Rich, detailed background environment that tells a story
- Roman numeral in a decorative circular cartouche at the top center, inside the border
- Card title in elegant hand-lettered capitalized serif font at the bottom, inside the border

PAPER & FINISH:
- Pale cream-yellow aged parchment background for the illustration area
- Clean white margin surrounding the black border
- Slightly worn, matte paper texture with subtle aging
- The overall mood is mystical, enchanting, and timeless`;

export interface TarotCardResult {
    imageUrl: string | null;
    error?: string;
}

// Sanitize persona titles to avoid content filter triggers
const sanitizeForContentFilter = (text: string): string => {
    const replacements: Record<string, string> = {
        'blade': 'wand',
        'sword': 'scepter',
        'battle': 'journey',
        'blood': 'ruby',
        'dark': 'twilight',
        'death': 'destiny',
        'shadow': 'moonlight',
        'forge': 'workshop',
        'hammer': 'tool',
        'strike': 'craft',
        'warrior': 'guardian',
        'hunter': 'seeker',
        'slayer': 'champion',
        'crusher': 'shaper',
        'destroyer': 'transformer',
    };

    let sanitized = text;
    for (const [trigger, safe] of Object.entries(replacements)) {
        const regex = new RegExp(trigger, 'gi');
        sanitized = sanitized.replace(regex, safe);
    }
    return sanitized;
};

export const generateTarotCard = async (
    name: string,
    resource: Resource,
    personaTitle: string
): Promise<TarotCardResult> => {
    if (!AZURE_API_KEY) {
        console.warn('Azure Image API key not configured');
        return { imageUrl: null, error: 'API key not configured' };
    }

    try {
        const resourceImagery = RESOURCE_IMAGERY[resource];

        // Sanitize the description to avoid content filter, but keep original title on the card
        const safeDescription = sanitizeForContentFilter(personaTitle);

        // Create a unique tarot card prompt (using content-filter safe language)
        // Note: safeDescription is used for the figure description, but original personaTitle is used for the card text
        const prompt = `${TAROT_STYLE_PROMPT}

THE CHARACTER:
This card depicts "${safeDescription}" - a mystical figure from the world of Catan.
The figure is ${resourceImagery}

CHARACTER APPEARANCE:
- Infer the figure's gender from the name "${name}" (use this ONLY for appearance, NOT for any text on the card)
- Wearing elaborate period costume with intricate embroidery, flowing robes, and symbolic accessories
- Expression is serene, wise, and knowing - gazing meaningfully at the viewer or into the distance
- Hands positioned in a meaningful gesture, perhaps holding a symbolic object
- Rich textile patterns and jewelry details rendered with fine linework

CARD TEXT (CRITICAL - READ CAREFULLY):
- DO NOT put the name "${name}" anywhere on the card
- The card text must show the TITLE, not the name
- At the BOTTOM of the card, there MUST be a text banner displaying EXACTLY: "${personaTitle.toUpperCase()}"
- Use elegant, hand-lettered, capitalized serif font in black ink
- Roman numeral (I through XXI) in decorative cartouche at TOP center

Create a masterful, museum-quality tarot illustration. The bottom text MUST read "${personaTitle.toUpperCase()}" - this is the card's title, NOT a person's name.`;

        console.log('Calling Azure AI Image API...');
        console.log('Endpoint:', AZURE_ENDPOINT);
        console.log('Model:', MODEL_NAME);

        // Use OpenAI-compatible images endpoint (as per FLUX.1-Kontext-pro documentation)
        const response = await fetch(`${AZURE_ENDPOINT}/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': AZURE_API_KEY,
                'Authorization': `Bearer ${AZURE_API_KEY}`,
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                n: 1,
                size: '1024x1792',
                response_format: 'b64_json',
            }),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Azure Image API error:', response.status, errorText);
            return { imageUrl: null, error: `API error: ${response.status} - ${errorText}` };
        }

        const data = await response.json();
        console.log('Response data:', data);

        // Handle b64_json response - convert to data URL
        const b64Json = data.data?.[0]?.b64_json;
        if (b64Json) {
            const imageUrl = `data:image/png;base64,${b64Json}`;
            return { imageUrl };
        }

        // Fallback to URL if provided
        const imageUrl = data.data?.[0]?.url || null;
        return { imageUrl };
    } catch (error) {
        console.error('Error generating tarot card:', error);
        return { imageUrl: null, error: String(error) };
    }
};

// Alternative: Generate and upload to Supabase Storage for permanent storage
export const generateAndStoreTarotCard = async (
    participantId: string,
    name: string,
    resource: Resource,
    personaTitle: string,
    supabaseClient: any
): Promise<string | null> => {
    const result = await generateTarotCard(name, resource, personaTitle);

    if (!result.imageUrl) {
        return null;
    }

    try {
        let imageBlob: Blob;

        // Check if it's a base64 data URL
        if (result.imageUrl.startsWith('data:image')) {
            // Convert base64 data URL to blob
            const base64Data = result.imageUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            imageBlob = new Blob([byteArray], { type: 'image/png' });
        } else {
            // Fetch the image from the URL
            const imageResponse = await fetch(result.imageUrl);
            imageBlob = await imageResponse.blob();
        }

        // Upload to Supabase Storage
        const fileName = `tarot-cards/${participantId}.png`;
        const { data, error } = await supabaseClient.storage
            .from('tournament-images')
            .upload(fileName, imageBlob, {
                contentType: 'image/png',
                upsert: true,
            });

        if (error) {
            console.error('Error uploading to Supabase:', error);
            // Return the base64 data URL as fallback
            return result.imageUrl;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from('tournament-images')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Error storing tarot card:', error);
        // Return the base64 data URL as fallback
        return result.imageUrl;
    }
};
