import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Users, Trophy, ChevronRight, Lock, Unlock, Crown, Map as MapIcon, Plus, X, Trash2 } from 'lucide-react';
import Hexagon from './components/Hexagon';
import Timer from './components/Timer';
import { Participant, Resource, TournamentSettings, RESOURCES, RESOURCE_COLORS, RESOURCE_EMOJIS, Group } from './types';
import { generatePlayerPersona, generateGroupNames } from './services/geminiService';

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
  // State - Lazy initialization from LocalStorage to persist data across reloads
  const [participants, setParticipants] = useState<Participant[]>(() => {
    try {
      const saved = localStorage.getItem('catan_participants');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load participants", e);
      return [];
    }
  });

  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const saved = localStorage.getItem('catan_groups');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
       console.error("Failed to load groups", e);
       return [];
    }
  });

  const [settings, setSettings] = useState<TournamentSettings>(() => {
    try {
      const saved = localStorage.getItem('catan_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Preserve saved state but always use the latest adminKey from code
        // so the developer can update the key without clearing data
        return { ...parsed, adminKey: DEFAULT_SETTINGS.adminKey };
      }
      return DEFAULT_SETTINGS;
    } catch (e) {
      console.error("Failed to load settings", e);
      return DEFAULT_SETTINGS;
    }
  });
  
  // View State
  const [view, setView] = useState<'landing' | 'signup' | 'admin' | 'bracket'>('landing');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formResource, setFormResource] = useState<Resource>('sheep');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('catan_participants', JSON.stringify(participants));
    localStorage.setItem('catan_settings', JSON.stringify(settings));
    localStorage.setItem('catan_groups', JSON.stringify(groups));
  }, [participants, settings, groups]);

  // Check deadline
  useEffect(() => {
    const checkDeadline = setInterval(() => {
      if (!settings.isRegistrationClosed && new Date() > new Date(settings.deadline)) {
        setSettings(s => ({ ...s, isRegistrationClosed: true }));
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
      alert("Invalid Organizer Key");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;
    
    setIsSubmitting(true);
    
    // AI Magic
    const persona = await generatePlayerPersona(formName, formResource);
    
    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      name: formName,
      email: formEmail,
      favoriteResource: formResource,
      personaTitle: persona.title,
      personaDescription: persona.description,
    };

    setParticipants(prev => [...prev, newParticipant]);
    setIsSubmitting(false);
    setView('landing'); // Go back to landing to see name in list
    setFormName('');
    setFormEmail('');
  };

  const handleDeleteParticipant = (id: string) => {
      if (window.confirm("Are you sure you want to delete this participant? This cannot be undone.")) {
          setParticipants(prev => prev.filter(p => p.id !== id));
      }
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

    setGroups(newGroups);
    setSettings(prev => ({ ...prev, tournamentStarted: true, isRegistrationClosed: true }));
    alert("Tournament Brackets Generated!");
  };

  const handleReset = () => {
      if (confirm("Are you sure? This deletes all data.")) {
          setParticipants([]);
          setGroups([]);
          setSettings(DEFAULT_SETTINGS);
          localStorage.clear();
      }
  }

  // --- Render Views ---

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-5xl mx-auto px-4 gap-12">
      <div className="text-center space-y-6 animate-float">
        <div className="flex justify-center mb-4">
             <Hexagon size="xl" color="bg-orange-400">
                <Trophy className="w-16 h-16 text-white" />
             </Hexagon>
        </div>
        <h1 className="text-6xl md:text-7xl font-black text-slate-800 tracking-tight">
          SETTLERS<br/><span className="text-catan-brick">TOURNAMENT</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-lg mx-auto">
          Trade wood for sheep, build the longest road, and claim the crown. The annual designer board game battle begins soon.
        </p>
      </div>

      {!settings.isRegistrationClosed ? (
        <div className="flex flex-col items-center gap-8 w-full">
           <Timer deadline={settings.deadline} />
           <button 
             onClick={() => setView('signup')}
             className="group relative inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full text-lg font-bold hover:bg-catan-brick transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
           >
             <span className="relative z-10">Register Now</span>
             <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
             <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
           </button>
        </div>
      ) : (
        <div className="bg-slate-800 text-white px-8 py-6 rounded-2xl text-center shadow-xl">
            <h2 className="text-2xl font-bold mb-2">Registration Closed</h2>
            {settings.tournamentStarted ? (
                 <button 
                 onClick={() => setView('bracket')}
                 className="mt-4 px-6 py-2 bg-catan-wheat text-slate-900 rounded-full font-bold hover:bg-yellow-300 transition-colors"
               >
                 View Tournament Map
               </button>
            ) : (
                <p className="text-slate-400">Waiting for organizer to publish brackets...</p>
            )}
        </div>
      )}

      {/* Participant Grid Preview */}
      {participants.length > 0 && (
        <div className="w-full mt-12">
            <div className="flex items-center justify-between mb-6">
                 <h3 className="text-2xl font-bold text-slate-700 flex items-center gap-2">
                    <Users className="w-6 h-6" /> 
                    Registered Settlers ({participants.length})
                 </h3>
            </div>
           
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {participants.map(p => (
                    <div key={p.id} className="flex flex-col items-center group">
                        <Hexagon size="md" color={RESOURCE_COLORS[p.favoriteResource]}>
                            <span className="text-2xl drop-shadow-md">{RESOURCE_EMOJIS[p.favoriteResource]}</span>
                        </Hexagon>
                        <span className="mt-2 font-bold text-slate-700 text-sm">{p.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">{p.personaTitle || 'Settler'}</span>
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
        <h2 className="text-3xl font-bold text-slate-800">Join the Island</h2>
        <button onClick={() => setView('landing')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSignup} className="space-y-6">
        <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">Your Name</label>
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
            <label className="block text-sm font-semibold text-slate-600 mb-2">Email</label>
            <input 
                required
                type="email" 
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-catan-brick focus:ring-2 focus:ring-catan-brick/20 outline-none transition-all"
                placeholder="alisa@catan.com"
            />
        </div>

        <div>
            <label className="block text-sm font-semibold text-slate-600 mb-3">Favorite Resource</label>
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
                        <span className="text-[10px] uppercase font-bold text-slate-500">{r}</span>
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
                  Generating Persona...
                </>
            ) : "Confirm Registration"}
        </button>
      </form>
    </div>
  );

  const renderAdmin = () => (
    <div className="max-w-4xl mx-auto w-full p-6">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Settings className="w-8 h-8" /> Organizer Dashboard
            </h2>
            <button onClick={() => setView('landing')} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                Exit Dashboard
            </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Control Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2">Tournament Controls</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registration Deadline</label>
                        <input 
                            type="datetime-local" 
                            value={settings.deadline.slice(0, 16)}
                            onChange={(e) => setSettings(s => ({...s, deadline: new Date(e.target.value).toISOString()}))}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-700">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${settings.isRegistrationClosed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {settings.isRegistrationClosed ? 'CLOSED' : 'OPEN'}
                        </span>
                    </div>

                     <button 
                        onClick={() => setSettings(s => ({...s, isRegistrationClosed: !s.isRegistrationClosed}))}
                        className="w-full py-2 border-2 border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                     >
                        {settings.isRegistrationClosed ? <Unlock className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}
                        {settings.isRegistrationClosed ? 'Re-open Registration' : 'Close Registration Early'}
                     </button>
                    
                     <hr className="border-slate-100" />

                     <button 
                        onClick={generateBrackets}
                        disabled={participants.length < 2}
                        className="w-full py-3 bg-catan-wood text-white rounded-lg font-bold hover:bg-green-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        <MapIcon className="w-5 h-5" />
                        Generate Brackets & Start
                     </button>
                     
                     <button 
                        onClick={handleReset}
                        className="w-full py-2 text-red-500 text-xs font-bold hover:bg-red-50 rounded-lg transition-colors"
                     >
                        Reset All Data (Danger)
                     </button>
                </div>
            </div>

            {/* Live Stats */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">Live Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <div className="text-3xl font-black text-slate-800">{participants.length}</div>
                        <div className="text-xs text-slate-500 font-bold uppercase">Participants</div>
                    </div>
                     <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <div className="text-3xl font-black text-slate-800">{Math.ceil(participants.length / MAX_PLAYERS_PER_TABLE)}</div>
                        <div className="text-xs text-slate-500 font-bold uppercase">Tables Needed</div>
                    </div>
                </div>

                <div className="mt-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Resource Distribution</h4>
                    <div className="space-y-2">
                        {RESOURCES.map(r => {
                            const count = participants.filter(p => p.favoriteResource === r).length;
                            const pct = participants.length ? (count / participants.length) * 100 : 0;
                            return (
                                <div key={r} className="flex items-center gap-2 text-xs">
                                    <span className="w-12 font-bold capitalize text-slate-600">{r}</span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${RESOURCE_COLORS[r]}`} style={{ width: `${pct}%`}} />
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
             <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">Manage Participants ({participants.length})</h3>
             
             {participants.length === 0 ? (
                 <p className="text-slate-400 text-center py-8">No participants registered yet.</p>
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
                                     <div className="text-xs text-slate-500">{p.email} • <span className="italic">{p.personaTitle}</span></div>
                                 </div>
                             </div>
                             
                             <button 
                                onClick={() => handleDeleteParticipant(p.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove Participant"
                             >
                                 <Trash2 className="w-5 h-5" />
                             </button>
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
                <h2 className="text-4xl font-black text-slate-800 mb-2">Tournament Map</h2>
                <p className="text-slate-500">Find your table, Settler. May the dice be in your favor.</p>
             </div>
             <button onClick={() => setView('landing')} className="px-4 py-2 border rounded-full hover:bg-slate-50 text-sm font-bold">Back Home</button>
           </div>

           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {groups.map((group, idx) => (
                    <div key={group.id} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
                        <div className="bg-slate-900 p-4 text-center">
                             <h3 className="text-white font-bold text-lg">{group.name}</h3>
                             <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Table {idx + 1}</div>
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
                            Qualifies 1 Winner
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

         <div className="pointer-events-auto">
             {isAdmin ? (
                 <button onClick={() => setView('admin')} className="bg-white px-4 py-2 rounded-full shadow-md text-xs font-bold border hover:bg-slate-50">Admin Panel</button>
             ) : (
                <div className="flex gap-2">
                    <input 
                        type="password" 
                        placeholder="Key" 
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

    </div>
  );
}