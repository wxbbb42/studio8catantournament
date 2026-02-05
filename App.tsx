import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Users, Trophy, ChevronRight, Lock, Unlock, Crown, Map as MapIcon, Plus, X, Trash2, Globe, ImagePlus, RefreshCw } from 'lucide-react';
import Hexagon from './components/Hexagon';
import Timer from './components/Timer';
import { Participant, Resource, TournamentSettings, RESOURCES, RESOURCE_COLORS, RESOURCE_EMOJIS, Group } from './types';
import { generatePlayerPersona, generateGroupNames } from './services/azureOpenAIService';
import { generateTarotCard } from './services/imageGenerationService';
import {
    fetchParticipants,
    addParticipant,
    deleteParticipant as deleteParticipantFromDb,
    fetchSettings,
    updateSettings as updateSettingsInDb,
    fetchGroups,
    saveGroups,
    deleteAllData,
    updateParticipantTarotCard
} from './services/supabaseService';
import { translations, Language, getResourceName } from './i18n';

// --- Constants ---
const DEFAULT_SETTINGS: TournamentSettings = {
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 48 hours from now
    isRegistrationClosed: false,
    adminKey: '12345', // Simple hardcoded key for demo
    tournamentStarted: false,
};

const MAX_PLAYERS_PER_TABLE = 4;

// --- App Component ---
export default function App() {
    // State - now fetched from Supabase
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [settings, setSettings] = useState<TournamentSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    // View State
    const [view, setView] = useState<'landing' | 'signup' | 'admin' | 'bracket'>('landing');
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminInput, setAdminInput] = useState('');

    // Form State
    const [formName, setFormName] = useState('');
    const [formAlias, setFormAlias] = useState('');
    const [formResource, setFormResource] = useState<Resource>('sheep');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tarot Card Modal State
    const [selectedCard, setSelectedCard] = useState<Participant | null>(null);
    const [isCardFlipped, setIsCardFlipped] = useState(false);

    // Card Generation State
    const [isGeneratingCards, setIsGeneratingCards] = useState(false);
    const [cardsGeneratedCount, setCardsGeneratedCount] = useState(0);

    // Language State
    const [lang, setLang] = useState<Language>(() => {
        const saved = localStorage.getItem('catan_lang');
        return (saved === 'zh' || saved === 'en') ? saved : 'en';
    });
    const t = translations[lang];

    // Save language preference
    useEffect(() => {
        localStorage.setItem('catan_lang', lang);
    }, [lang]);

    // Load data from Supabase on mount
    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const [loadedParticipants, loadedSettings, loadedGroups] = await Promise.all([
                    fetchParticipants(),
                    fetchSettings(),
                    fetchGroups(),
                ]);

                setParticipants(loadedParticipants);
                if (loadedSettings) {
                    setSettings({ ...loadedSettings, adminKey: DEFAULT_SETTINGS.adminKey });
                }
                setGroups(loadedGroups);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    // Check deadline
    useEffect(() => {
        const checkDeadline = setInterval(() => {
            if (!settings.isRegistrationClosed && new Date() > new Date(settings.deadline)) {
                setSettings(s => ({ ...s, isRegistrationClosed: true }));
                updateSettingsInDb({ isRegistrationClosed: true });
            }
        }, 10000);
        return () => clearInterval(checkDeadline);
    }, [settings.deadline, settings.isRegistrationClosed]);

    // --- Handlers ---

    const handleAdminLogin = () => {
        if (adminInput === settings.adminKey) {
            setIsAdmin(true);
            setView('admin');
            setAdminInput('');
        } else {
            alert(t.invalidOrganizerKey);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName || !formAlias) return;

        setIsSubmitting(true);

        // AI Magic - Generate persona
        const persona = await generatePlayerPersona(formName, formResource);

        // Generate Tarot Card image (async, don't block registration)
        const tarotResult = await generateTarotCard(formName, formResource, persona.title);

        const newParticipant: Participant = {
            id: crypto.randomUUID(),
            name: formName,
            alias: formAlias,
            favoriteResource: formResource,
            personaTitle: persona.title,
            personaDescription: persona.description,
            tarotCardUrl: tarotResult.imageUrl || undefined,
        };

        // Save to Supabase
        const saved = await addParticipant(newParticipant);
        if (saved) {
            setParticipants(prev => [...prev, saved]);
        } else {
            alert(t.registrationFailed);
        }

        setIsSubmitting(false);
        setView('landing'); // Go back to landing to see name in list
        setFormName('');
        setFormAlias('');
    };

    const handleDeleteParticipant = async (id: string) => {
        if (window.confirm(t.confirmDelete)) {
            const success = await deleteParticipantFromDb(id);
            if (success) {
                setParticipants(prev => prev.filter(p => p.id !== id));
            }
        }
    };

    // State to track which card is being regenerated
    const [regeneratingCardId, setRegeneratingCardId] = React.useState<string | null>(null);

    // Regenerate a single participant's tarot card
    const handleRegenerateCard = async (participant: Participant) => {
        setRegeneratingCardId(participant.id);
        try {
            const tarotResult = await generateTarotCard(
                participant.name,
                participant.favoriteResource,
                participant.personaTitle || 'The Settler'
            );

            if (tarotResult.imageUrl) {
                await updateParticipantTarotCard(participant.id, tarotResult.imageUrl);
                setParticipants(prev => prev.map(p =>
                    p.id === participant.id
                        ? { ...p, tarotCardUrl: tarotResult.imageUrl! }
                        : p
                ));
            } else if (tarotResult.error) {
                alert(`Failed to generate card: ${tarotResult.error}`);
            }
        } catch (error) {
            console.error(`Error regenerating card for ${participant.name}:`, error);
            alert(`Error regenerating card: ${error}`);
        } finally {
            setRegeneratingCardId(null);
        }
    };

    // Generate missing tarot cards one by one (queue style)
    const handleGenerateMissingCards = async () => {
        const missingCards = participants.filter(p => !p.tarotCardUrl);

        if (missingCards.length === 0) {
            alert(t.noMissingCards);
            return;
        }

        setIsGeneratingCards(true);
        setCardsGeneratedCount(0);

        for (let i = 0; i < missingCards.length; i++) {
            const participant = missingCards[i];
            try {
                const tarotResult = await generateTarotCard(
                    participant.name,
                    participant.favoriteResource,
                    participant.personaTitle || 'The Settler'
                );

                if (tarotResult.imageUrl) {
                    // Update in database
                    await updateParticipantTarotCard(participant.id, tarotResult.imageUrl);

                    // Update local state
                    setParticipants(prev => prev.map(p =>
                        p.id === participant.id
                            ? { ...p, tarotCardUrl: tarotResult.imageUrl! }
                            : p
                    ));
                }

                setCardsGeneratedCount(i + 1);
            } catch (error) {
                console.error(`Error generating card for ${participant.name}:`, error);
            }
        }

        setIsGeneratingCards(false);
    };

    // Card modal handlers
    const openCardModal = (participant: Participant) => {
        setSelectedCard(participant);
        setIsCardFlipped(false);
        // Trigger flip animation after a short delay
        setTimeout(() => setIsCardFlipped(true), 100);
    };

    const closeCardModal = () => {
        setIsCardFlipped(false);
        setTimeout(() => setSelectedCard(null), 300);
    };

    const generateBrackets = async () => {
        // Simple shuffle
        const shuffled = [...participants].sort(() => 0.5 - Math.random());
        const newGroups: Group[] = [];
        const chunks: Participant[][] = [];

        for (let i = 0; i < shuffled.length; i += MAX_PLAYERS_PER_TABLE) {
            chunks.push(shuffled.slice(i, i + MAX_PLAYERS_PER_TABLE));
        }

        // Generate fun names for groups
        const groupNames = await generateGroupNames(chunks);

        chunks.forEach((chunk, index) => {
            newGroups.push({
                id: crypto.randomUUID(),
                name: groupNames[index] || `Table ${index + 1}`,
                participants: chunk.map(p => p.id)
            });
        });

        // Save to Supabase
        await saveGroups(newGroups);
        await updateSettingsInDb({ tournamentStarted: true, isRegistrationClosed: true });

        setGroups(newGroups);
        setSettings(prev => ({ ...prev, tournamentStarted: true, isRegistrationClosed: true }));
        alert(t.bracketsGenerated);
    };

    const handleReset = async () => {
        if (confirm(t.confirmReset)) {
            await deleteAllData();
            setParticipants([]);
            setGroups([]);
            setSettings(DEFAULT_SETTINGS);
        }
    }

    // Update settings in Supabase when changed via admin panel
    const handleSettingsChange = async (newSettings: Partial<TournamentSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
        await updateSettingsInDb(newSettings);
    };

    // --- Render Views ---

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-catan-brick rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium">{t.loading}</p>
                </div>
            </div>
        );
    }

    const renderLanding = () => (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-5xl mx-auto px-4 gap-12">
            <div className="text-center space-y-6 animate-float">
                <div className="flex justify-center mb-4">
                    <Hexagon size="xl" color="bg-orange-400">
                        <Trophy className="w-16 h-16 text-white" />
                    </Hexagon>
                </div>
                <h1 className="text-6xl md:text-7xl font-black text-slate-800 tracking-tight">
                    {t.title1}<br /><span className="text-catan-brick">{t.title2}</span>
                </h1>
                <p className="text-xl text-slate-500 max-w-lg mx-auto">
                    {t.subtitle}
                </p>
            </div>

            {!settings.isRegistrationClosed ? (
                <div className="flex flex-col items-center gap-8 w-full">
                    <Timer deadline={settings.deadline} />
                    <button
                        onClick={() => setView('signup')}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full text-lg font-bold hover:bg-catan-brick transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
                    >
                        <span className="relative z-10">{t.registerNow}</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>
                </div>
            ) : (
                <div className="bg-slate-800 text-white px-8 py-6 rounded-2xl text-center shadow-xl">
                    <h2 className="text-2xl font-bold mb-2">{t.registrationClosed}</h2>
                    {settings.tournamentStarted ? (
                        <button
                            onClick={() => setView('bracket')}
                            className="mt-4 px-6 py-2 bg-catan-wheat text-slate-900 rounded-full font-bold hover:bg-yellow-300 transition-colors"
                        >
                            {t.viewTournamentMap}
                        </button>
                    ) : (
                        <p className="text-slate-400">{t.waitingForBrackets}</p>
                    )}
                </div>
            )}

            {/* Participant Grid Preview */}
            {participants.length > 0 && (
                <div className="w-full mt-12">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-slate-700 flex items-center gap-2">
                            <Users className="w-6 h-6" />
                            {t.registeredSettlers} ({participants.length})
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {participants.map(p => (
                            <div key={p.id} className="flex flex-col items-center group">
                                {/* Tarot Card or Hexagon fallback */}
                                {p.tarotCardUrl ? (
                                    <div
                                        className="relative w-36 h-[252px] md:w-40 md:h-[280px] rounded-xl overflow-hidden shadow-lg border-4 border-slate-200 group-hover:border-catan-brick transition-all group-hover:shadow-xl group-hover:-translate-y-1 cursor-pointer"
                                        onClick={() => openCardModal(p)}
                                    >
                                        <img
                                            src={p.tarotCardUrl}
                                            alt={`${p.name}'s Tarot Card`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                            <div className="text-white font-bold text-sm truncate">{p.name}</div>
                                            <div className="text-white/70 text-[10px] uppercase tracking-wide truncate">{p.personaTitle || t.settler}</div>
                                        </div>
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                            <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full transition-opacity">{t.clickToView}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Hexagon size="md" color={RESOURCE_COLORS[p.favoriteResource]}>
                                            <span className="text-2xl drop-shadow-md">{RESOURCE_EMOJIS[p.favoriteResource]}</span>
                                        </Hexagon>
                                        <span className="mt-2 font-bold text-slate-700 text-sm">{p.name}</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">{p.personaTitle || t.settler}</span>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderSignup = () => (
        <div className="max-w-md mx-auto w-full bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 mt-10">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-slate-800">{t.joinTheIsland}</h2>
                <button onClick={() => setView('landing')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                </button>
            </div>

            <form onSubmit={handleSignup} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">{t.yourName}</label>
                    <input
                        required
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-catan-brick focus:ring-2 focus:ring-catan-brick/20 outline-none transition-all"
                        placeholder="Alisa"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">{t.alias}</label>
                    <input
                        required
                        type="text"
                        value={formAlias}
                        onChange={(e) => setFormAlias(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-catan-brick focus:ring-2 focus:ring-catan-brick/20 outline-none transition-all"
                        placeholder="CatanChampion"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-3">{t.favoriteResource}</label>
                    <div className="grid grid-cols-5 gap-2">
                        {RESOURCES.map(r => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setFormResource(r)}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border-2 ${formResource === r ? 'border-catan-brick bg-orange-50 scale-110' : 'border-transparent hover:bg-slate-50'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${RESOURCE_COLORS[r]} text-white shadow-sm`}>
                                    {RESOURCE_EMOJIS[r]}
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-500">{getResourceName(r, lang)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-catan-brick text-white rounded-xl font-bold text-lg hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t.generatingPersona}
                        </>
                    ) : t.confirmRegistration}
                </button>
            </form>
        </div>
    );

    const renderAdmin = () => (
        <div className="max-w-4xl mx-auto w-full p-6">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <Settings className="w-8 h-8" /> {t.organizerDashboard}
                </h2>
                <button onClick={() => setView('landing')} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                    {t.exitDashboard}
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Control Panel */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                    <h3 className="text-lg font-bold text-slate-700 border-b pb-2">{t.tournamentControls}</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.registrationDeadline}</label>
                            <input
                                type="datetime-local"
                                value={settings.deadline.slice(0, 16)}
                                onChange={(e) => handleSettingsChange({ deadline: new Date(e.target.value).toISOString() })}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <span className="font-medium text-slate-700">{t.status}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${settings.isRegistrationClosed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {settings.isRegistrationClosed ? t.statusClosed : t.statusOpen}
                            </span>
                        </div>

                        <button
                            onClick={() => handleSettingsChange({ isRegistrationClosed: !settings.isRegistrationClosed })}
                            className="w-full py-2 border-2 border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {settings.isRegistrationClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            {settings.isRegistrationClosed ? t.reopenRegistration : t.closeRegistrationEarly}
                        </button>

                        <hr className="border-slate-100" />

                        <button
                            onClick={generateBrackets}
                            disabled={participants.length < 2}
                            className="w-full py-3 bg-catan-wood text-white rounded-lg font-bold hover:bg-green-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <MapIcon className="w-5 h-5" />
                            {t.generateBrackets}
                        </button>

                        {/* Generate Missing Tarot Cards Button */}
                        <button
                            onClick={handleGenerateMissingCards}
                            disabled={isGeneratingCards || participants.filter(p => !p.tarotCardUrl).length === 0}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <ImagePlus className="w-5 h-5" />
                            {isGeneratingCards
                                ? `${t.generatingCards} (${cardsGeneratedCount}/${participants.filter(p => !p.tarotCardUrl).length + cardsGeneratedCount})`
                                : `${t.generateMissingCards} (${participants.filter(p => !p.tarotCardUrl).length})`
                            }
                        </button>

                        <button
                            onClick={handleReset}
                            className="w-full py-2 text-red-500 text-xs font-bold hover:bg-red-50 rounded-lg transition-colors"
                        >
                            {t.resetAllData}
                        </button>
                    </div>
                </div>

                {/* Live Stats */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">{t.liveStats}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-center">
                            <div className="text-3xl font-black text-slate-800">{participants.length}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">{t.participants}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl text-center">
                            <div className="text-3xl font-black text-slate-800">{Math.ceil(participants.length / MAX_PLAYERS_PER_TABLE)}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">{t.tablesNeeded}</div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{t.resourceDistribution}</h4>
                        <div className="space-y-2">
                            {RESOURCES.map(r => {
                                const count = participants.filter(p => p.favoriteResource === r).length;
                                const pct = participants.length ? (count / participants.length) * 100 : 0;
                                return (
                                    <div key={r} className="flex items-center gap-2 text-xs">
                                        <span className="w-12 font-bold capitalize text-slate-600">{getResourceName(r, lang)}</span>
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${RESOURCE_COLORS[r]}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="w-6 text-right text-slate-400">{count}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Participant Management */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">{t.manageParticipants} ({participants.length})</h3>

                {participants.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">{t.noParticipants}</p>
                ) : (
                    <div className="grid gap-3">
                        {participants.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full ${RESOURCE_COLORS[p.favoriteResource]} flex items-center justify-center text-lg shadow-sm text-white shrink-0`}>
                                        {RESOURCE_EMOJIS[p.favoriteResource]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{p.name}</div>
                                        <div className="text-xs text-slate-500">@{p.alias} • <span className="italic">{p.personaTitle}</span></div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleRegenerateCard(p)}
                                        disabled={regeneratingCardId === p.id || isGeneratingCards}
                                        className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={t.regenerateCard || 'Regenerate Card'}
                                    >
                                        <RefreshCw className={`w-5 h-5 ${regeneratingCardId === p.id ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteParticipant(p.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title={t.removeParticipant}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderBracket = () => (
        <div className="w-full max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 mb-2">{t.tournamentMap}</h2>
                    <p className="text-slate-500">{t.findYourTable}</p>
                </div>
                <button onClick={() => setView('landing')} className="px-4 py-2 border rounded-full hover:bg-slate-50 text-sm font-bold">{t.backHome}</button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {groups.map((group, idx) => (
                    <div key={group.id} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
                        <div className="bg-slate-900 p-4 text-center">
                            <h3 className="text-white font-bold text-lg">{group.name}</h3>
                            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">{t.table} {idx + 1}</div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col gap-4">
                            {group.participants.map(pid => {
                                const p = participants.find(part => part.id === pid);
                                if (!p) return null;
                                return (
                                    <div key={pid} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className={`w-10 h-10 rounded-full ${RESOURCE_COLORS[p.favoriteResource]} flex items-center justify-center text-lg shadow-sm text-white shrink-0`}>
                                            {RESOURCE_EMOJIS[p.favoriteResource]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{p.name}</div>
                                            <div className="text-xs text-slate-500 italic">{p.personaTitle}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="bg-slate-50 p-3 text-center text-xs text-slate-400 font-bold uppercase tracking-wider border-t">
                            {t.qualifiesWinner}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // --- Main Render ---

    return (
        <div className="min-h-screen font-sans text-slate-900 relative selection:bg-catan-brick selection:text-white">
            {/* Navbar/Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center pointer-events-none">
                <div className="pointer-events-auto cursor-pointer" onClick={() => setView('landing')}>
                    <Hexagon size="sm" color="bg-slate-900">
                        <span className="text-white font-bold text-lg">C</span>
                    </Hexagon>
                </div>

                <div className="pointer-events-auto flex items-center gap-3">
                    {/* Language Switcher */}
                    <button
                        onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
                        className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border hover:bg-slate-50 flex items-center gap-1"
                    >
                        <Globe className="w-3 h-3" />
                        {t.switchLang}
                    </button>

                    {isAdmin ? (
                        <button onClick={() => setView('admin')} className="bg-white px-4 py-2 rounded-full shadow-md text-xs font-bold border hover:bg-slate-50">{t.adminPanel}</button>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                type="password"
                                placeholder={t.key}
                                className="bg-white/80 backdrop-blur w-20 px-3 py-1 rounded-full text-xs border focus:w-32 transition-all outline-none"
                                value={adminInput}
                                onChange={(e) => setAdminInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                            />
                            {adminInput && <button onClick={handleAdminLogin} className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs">Go</button>}
                        </div>
                    )}
                </div>
            </nav>

            <main className="pt-24 pb-12 min-h-screen flex flex-col">
                {view === 'landing' && renderLanding()}
                {view === 'signup' && renderSignup()}
                {view === 'admin' && isAdmin && renderAdmin()}
                {view === 'bracket' && renderBracket()}
            </main>

            {/* Tarot Card Modal with Flip Animation */}
            {selectedCard && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={closeCardModal}
                >
                    <div
                        className="relative perspective-1000"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Card Container with Flip Animation */}
                        <div
                            className={`relative w-64 h-[448px] md:w-80 md:h-[560px] transition-transform duration-700 transform-style-3d ${isCardFlipped ? 'rotate-y-0' : 'rotate-y-180'}`}
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: isCardFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
                            }}
                        >
                            {/* Front of Card (The Tarot Image) */}
                            <div
                                className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-2xl border-8 border-amber-100"
                                style={{ backfaceVisibility: 'hidden' }}
                            >
                                <img
                                    src={selectedCard.tarotCardUrl}
                                    alt={`${selectedCard.name}'s Tarot Card`}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Back of Card (Decorative Pattern) */}
                            <div
                                className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-2xl border-8 border-amber-100 bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                }}
                            >
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-3/4 h-3/4 border-4 border-amber-400/50 rounded-lg flex items-center justify-center">
                                        <div className="text-6xl">🎴</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card Info Below */}
                        <div className={`mt-6 text-center transition-opacity duration-500 ${isCardFlipped ? 'opacity-100' : 'opacity-0'}`}>
                            <h3 className="text-2xl font-black text-white">{selectedCard.name}</h3>
                            <p className="text-amber-300 font-semibold mt-1">{selectedCard.personaTitle}</p>
                            {selectedCard.personaDescription && (
                                <p className="text-white/70 text-sm mt-2 max-w-xs mx-auto italic">"{selectedCard.personaDescription}"</p>
                            )}
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={closeCardModal}
                            className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}