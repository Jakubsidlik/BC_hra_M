import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// --- DEFINICE 8 BAREVNÝCH TÉMAT STOLU (Syté a jasné barvy) ---
export const AVAILABLE_THEMES = [
  { id: 'bg-violet-600/60', color: 'bg-violet-500', label: 'Fialová' }, // Místo indigo
  { id: 'bg-emerald-600/60', color: 'bg-emerald-500', label: 'Smaragdová' },
  { id: 'bg-blue-600/60', color: 'bg-blue-500', label: 'Azurová' },
  { id: 'bg-rose-600/60', color: 'bg-rose-500', label: 'Krvavá červená' },
  { id: 'bg-pink-600/60', color: 'bg-pink-500', label: 'Růžová' },       // Místo fuchsiové
  { id: 'bg-amber-500/60', color: 'bg-amber-500', label: 'Zlatá' },
  { id: 'bg-cyan-600/60', color: 'bg-cyan-500', label: 'Tyrkysová' },
  { id: 'bg-orange-600/60', color: 'bg-orange-500', label: 'Oranžová' },
];

interface SetupScreenProps {
  onStart: (players: { name: string, theme: string }[]) => void;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [setupPlayers, setSetupPlayers] = useState([
    { name: 'Matematik 1', theme: 'bg-violet-600/60' }, // Výchozí fialová
    { name: 'Matematik 2', theme: 'bg-emerald-600/60' }
  ]);

  const handleCountChange = (count: number) => {
    setPlayerCount(count);
    setSetupPlayers(prev => {
      const newPlayers = [...prev];
      while (newPlayers.length < count) {
        const usedThemes = newPlayers.map(p => p.theme);
        const freeTheme = AVAILABLE_THEMES.find(t => !usedThemes.includes(t.id))?.id || 'bg-violet-600/60';
        newPlayers.push({ name: `Matematik ${newPlayers.length + 1}`, theme: freeTheme });
      }
      return newPlayers.slice(0, count);
    });
  };

  const handleUpdatePlayer = (index: number, field: 'name' | 'theme', value: string) => {
    setSetupPlayers(prev => {
      const newPlayers = [...prev];
      newPlayers[index] = { ...newPlayers[index], [field]: value };
      return newPlayers;
    });
  };

  const handleStart = () => {
    if (setupPlayers.some(p => !p.name.trim())) {
      toast.error("Všichni hráči musí mít jméno!");
      return;
    }
    onStart(setupPlayers);
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 border-16px border-amber-950/90 relative overflow-hidden bg-cover bg-center shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]"
      style={{ backgroundImage: `url('${import.meta.env.BASE_URL}tabule.svg')` }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl bg-black/40 backdrop-blur-md p-8 md:p-12 rounded-[3rem] border-4 border-white/10 shadow-xl overflow-y-auto max-h-[90vh] scrollbar-hide">
        
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-black italic text-white tracking-tighter drop-shadow-lg">
            PŘÍPRAVA TABULE
          </h1>
          <p className="text-emerald-400 font-mono tracking-[0.3em] uppercase text-sm mt-2">
            Registrace vědeckého týmu
          </p>
        </div>
        
        <div className="mb-12 text-center">
          <h2 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-[0.2em]">Počet matematiků (2–8)</h2>
          <div className="flex justify-center gap-3 flex-wrap">
            {[2, 3, 4, 5, 6, 7, 8].map(num => (
              <button 
                key={num}
                onClick={() => handleCountChange(num)}
                className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl text-xl md:text-2xl font-black transition-all duration-300 border-2 
                  ${playerCount === num 
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-105' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {setupPlayers.map((player, index) => (
            <div 
              key={index} 
              className={`p-6 rounded-2rem border-2 transition-colors duration-500 flex flex-col gap-4 bg-black/40 border-white/10`}
            >
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kandidát č. {index + 1}</label>
                <div className={`w-3 h-3 rounded-full animate-pulse ${player.theme.split('/')[0]}`} />
              </div>

              <input 
                type="text" 
                value={player.name}
                onChange={(e) => handleUpdatePlayer(index, 'name', e.target.value)}
                className="w-full bg-black/20 border-b-2 border-white/20 rounded-none px-0 py-2 text-white font-chalk text-2xl focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-white/10"
                placeholder="Zadejte jméno..."
              />

              <div className="mt-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Barva osobního prostoru L</label>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_THEMES.map(theme => {
                    const isSelected = player.theme === theme.id;
                    const isTakenByOther = setupPlayers.some((p, i) => i !== index && p.theme === theme.id);
                    
                    return (
                      <button
                        key={theme.id}
                        disabled={isTakenByOther}
                        onClick={() => handleUpdatePlayer(index, 'theme', theme.id)}
                        className={`w-8 h-8 rounded-full ${theme.color} transition-all duration-300 
                          ${isSelected ? 'ring-2 ring-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'opacity-40'} 
                          ${isTakenByOther ? 'hidden' : 'hover:scale-110 cursor-pointer hover:opacity-100'}`}
                        title={theme.label}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pb-4">
          <Button 
            size="lg" 
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-3xl px-16 py-10 rounded-2rem shadow-[0_0_40px_rgba(16,185,129,0.25)] transition-all hover:scale-105 active:scale-95 border-4 border-emerald-400/50" 
            onClick={handleStart}
          >
            ZAHÁJIT EXPERIMENT
          </Button>
        </div>

      </div>
    </div>
  );
}