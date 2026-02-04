export type Resource = 'brick' | 'wood' | 'sheep' | 'wheat' | 'ore';

export interface Participant {
  id: string;
  name: string;
  email: string;
  favoriteResource: Resource;
  personaTitle?: string; // AI Generated
  personaDescription?: string; // AI Generated
  rank?: number;
  score?: number;
}

export interface Group {
  id: string;
  name: string; // AI Generated or standard
  participants: string[]; // IDs
}

export interface TournamentSettings {
  deadline: string; // ISO Date string
  isRegistrationClosed: boolean;
  adminKey: string; // Ideally hashed, but plain text for this demo
  tournamentStarted: boolean;
}

export const RESOURCES: Resource[] = ['brick', 'wood', 'sheep', 'wheat', 'ore'];

export const RESOURCE_COLORS: Record<Resource, string> = {
  brick: 'bg-catan-brick',
  wood: 'bg-catan-wood',
  sheep: 'bg-catan-sheep',
  wheat: 'bg-catan-wheat',
  ore: 'bg-catan-ore',
};

export const RESOURCE_EMOJIS: Record<Resource, string> = {
  brick: '🧱',
  wood: '🌲',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛰️',
};