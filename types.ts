export type Resource = 'brick' | 'wood' | 'sheep' | 'wheat' | 'ore';

export interface Participant {
  id: string;
  name: string;
  alias: string;
  favoriteResource: Resource;
  personaTitle?: string; // AI Generated
  personaDescription?: string; // AI Generated
  tarotCardUrl?: string; // AI Generated tarot card image
  rank?: number;
  score?: number;
}

export interface Group {
  id: string;
  name: string; // AI Generated or standard
  participants: string[]; // IDs
  round: number; // 1 = preliminary, 2 = finals
  winnerId?: string; // ID of group winner
}

export interface TournamentSettings {
  deadline: string; // ISO Date string
  isRegistrationClosed: boolean;
  adminKey: string; // Ideally hashed, but plain text for this demo
  tournamentStarted: boolean;
  currentRound: number; // 1 = preliminary round, 2 = finals
  championId?: string; // ID of tournament champion
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