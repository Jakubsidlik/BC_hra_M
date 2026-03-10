import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cardsDatabase } from '@/data/cardsDB';
import type { GameCard, Player } from '@/lib/effects';
import { BoardArea } from './Cards';

// --- ROZHRANÍ PRO PROPS ---
interface EffectDialogProps {
  open: boolean;
  effectStep: 'CHOOSE_EFFECT' | 'CHOOSE_TARGET';
  pendingEffect: { card: GameCard; targetId: string | null } | null;
  players: Player[];
  currentPlayerId: number;
  handleEffectClick: () => void;
  handleEffectChoice: (choice: 'ACTIVATE' | 'NONE', targetPlayerId?: number) => void;
  setEffectStep: (step: 'CHOOSE_EFFECT' | 'CHOOSE_TARGET') => void;
  onClose: () => void;
}

// --- 1. VÍTĚZNÁ OBRAZOVKA (Konec přednášky) ---
export function VictoryScreen({ winner, onReset }: { winner: Player | null, onReset: () => void }) {
  if (!winner) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/98 z-100 flex flex-col items-center justify-center p-8 backdrop-blur-xl animate-in fade-in duration-700">
      <div className="bg-slate-800 border-4 border-emerald-500 p-12 rounded-[3rem] shadow-[0_0_80px_rgba(16,185,129,0.3)] flex flex-col items-center text-center max-w-2xl transform animate-in zoom-in duration-500">
        <h1 className="text-9xl font-black text-emerald-400 mb-2 animate-bounce tracking-tighter font-chalk">Q.E.D.</h1>
        <p className="text-slate-400 font-mono uppercase tracking-[0.4em] mb-8 italic">Quod Erat Demonstrandum</p>

        <h2 className="text-4xl text-white font-bold mb-4">
           <span className="text-emerald-400 underline decoration-wavy decoration-emerald-500/50">{winner.name}</span> zkonstruoval rovnost!
        </h2>

        <p className="text-slate-400 text-lg mb-12 font-mono">
          L = R
        </p>

        <Button
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-2xl px-16 py-10 rounded-2xl shadow-2xl transition-all hover:scale-105 border-b-4 border-emerald-800"
          onClick={onReset}
        >
          DALŠÍ POKUS
        </Button>
      </div>
    </div>
  );
}

// --- 2. PŘEDÁVACÍ OBRAZOVKA (Soukromí nade vše) ---
export function HandoffScreen({ isHandoff, players, nextIndex, onReveal }: { isHandoff: boolean, players: Player[], nextIndex: number, onReveal: () => void }) {
  if (!isHandoff) return null;
  return (
    <div className="fixed inset-0 bg-slate-950 z-200 flex flex-col items-center justify-center text-white text-center p-4">
      <style>{`
        @keyframes shrinkBar {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
      <div className="h-2 w-64 bg-emerald-500/10 rounded-full mb-12 overflow-hidden border border-white/5">
        <div className="h-full bg-emerald-500 origin-left" style={{ animation: 'shrinkBar 3s linear forwards' }} />
      </div>
      <h3 className="text-6xl font-black mb-12 text-white tracking-tighter italic font-chalk">
        {players[nextIndex]?.name}
      </h3>
      <Button 
        size="lg" 
        className="bg-emerald-600 hover:bg-emerald-500 px-16 py-10 text-2xl font-black rounded-3xl shadow-[0_0_25px_rgba(16,185,129,0.25)] border-b-4 border-emerald-800" 
        onClick={onReveal}
      >
        HRÁT
      </Button>
    </div>
  );
}

// --- 3. ZAMĚŘOVACÍ REŽIM (Interakce s plochou soupeře) ---
export function TargetingOverlay({ targetingMode, pendingEffect, players, handleBoardCardClick, onCancel }: any) {
  if (!targetingMode || !pendingEffect) return null;
  
  const targetPlayer = players.find((p: Player) => p.id === targetingMode.targetPlayerId);

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-150 flex flex-col items-center justify-center p-8 backdrop-blur-md animate-in fade-in duration-300">
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-4 border-red-500 text-red-500 px-4 py-1 animate-pulse">TARGET ACQUIRED</Badge>
        <h2 className="text-6xl text-white font-black mb-4 tracking-tighter uppercase font-chalk">Zaměřování</h2>
        <p className="text-2xl text-slate-400 font-mono italic">
          Zvol prvek na ploše matematika: <span className="text-red-500 font-bold">{targetPlayer?.name}</span>
        </p>
      </div>
      
      <div className="w-full max-w-6xl bg-black/40 p-12 rounded-[4rem] border-4 border-red-500/30 shadow-[0_0_80px_rgba(239,68,68,0.08)] relative">
         <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 px-6 py-1 rounded-full text-xs font-bold tracking-widest text-white uppercase">Cílová oblast</div>
         <BoardArea 
            id="target-board" 
            cards={targetPlayer?.board || []} 
            isTargeting={true} 
            onCardClick={handleBoardCardClick} 
          />
      </div>
      
      <Button size="lg" variant="ghost" className="mt-12 text-slate-500 hover:text-white text-xl hover:bg-white/5" onClick={onCancel}>
        PŘERUŠIT OPERACI
      </Button>
    </div>
  );
}

// --- 4. DIALOG EFEKTU (Klíčové rozhodnutí tahu) ---
export function EffectDialog({ 
  open, effectStep, pendingEffect, players, currentPlayerId, handleEffectClick, handleEffectChoice, setEffectStep, onClose 
}: EffectDialogProps) {
  
  if (!pendingEffect) return null;
  const cardData = cardsDatabase[pendingEffect.card.symbol];
  const effect = cardData?.effects?.optionA;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="w-[92vw] max-w-[450px] p-0 border-0 shadow-2xl rounded-xl overflow-hidden"
        style={{ background: '#141e17', border: '4px solid rgba(39,104,56,0.3)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-2"
          style={{ background: 'rgba(20,30,23,0.5)' }}>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <DialogTitle className="sr-only">
            {effectStep === 'CHOOSE_EFFECT' ? 'Využití karty' : 'Cíl útoku'}
          </DialogTitle>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 flex flex-col items-center justify-center gap-4">

          {effectStep === 'CHOOSE_EFFECT' && (
            <>
              {/* Nadpis */}
              <h3 className="text-emerald-400 text-2xl sm:text-3xl font-bold text-center" style={{ fontFamily: "'Merienda', cursive" }}>
                Využití karty
              </h3>

              {/* Volba 1: Efekt */}
              {effect && (
                <div className="w-full">
                  <button
                    onClick={handleEffectClick}
                    className="w-full text-left rounded-xl overflow-hidden hover:scale-[1.02] transition-transform"
                    style={{
                      border: '2px solid rgba(255,255,255,0.8)',
                      boxShadow: 'inset 0 0 0 2px rgba(39,104,56,0.5)',
                      background: 'hsla(151,21%,46%,0.2)',
                    }}
                  >
                    <div className="rounded-lg p-4 flex flex-col items-center gap-2 text-center"
                      style={{ background: 'rgba(20,30,23,0.4)' }}>
                      <span className="inline-block px-2 py-0.5 text-emerald-400 text-[10px] font-bold tracking-widest rounded-full"
                        style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        EFEKT
                      </span>
                      <h4 className="text-white text-lg sm:text-xl font-bold" style={{ fontFamily: "'Merienda', cursive" }}>
                        {effect.name}
                      </h4>
                      <p className="text-slate-300 text-sm leading-relaxed break-words">
                        {effect.description}
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Volba 2: Symbol */}
              <div className="w-full">
                <button
                  onClick={() => handleEffectChoice('NONE')}
                  className="w-full rounded-xl p-4 flex items-center justify-center hover:bg-white/5 transition-colors"
                  style={{
                    border: '2px solid rgba(255,255,255,0.8)',
                    boxShadow: 'inset 0 0 0 2px rgba(39,104,56,0.5)',
                    background: 'rgba(20,30,23,0.6)',
                  }}
                >
                  <span className="text-white font-bold text-base sm:text-lg" style={{ fontFamily: "'Merienda', cursive" }}>
                    Položit na plochu L
                  </span>
                </button>
              </div>

              {/* Zrušit */}
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors text-sm font-medium underline underline-offset-4 mb-2"
              >
                Zrušit a vrátit kartu do ruky
              </button>
            </>
          )}

          {effectStep === 'CHOOSE_TARGET' && (
            <>
              <h3 className="text-red-400 text-2xl sm:text-3xl font-bold text-center" style={{ fontFamily: "'Merienda', cursive" }}>
                Cíl útoku
              </h3>
              <p className="text-slate-400 text-sm text-center font-mono italic">Na koho dopadne váha vaší inteligence?</p>

              <div className="w-full flex flex-col gap-3">
                {players.filter((p: Player) => p.id !== currentPlayerId).map((opponent: Player) => (
                  <button
                    key={opponent.id}
                    onClick={() => handleEffectChoice('ACTIVATE', opponent.id)}
                    className="w-full rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    style={{
                      border: '2px solid rgba(255,255,255,0.8)',
                      boxShadow: 'inset 0 0 0 2px rgba(39,104,56,0.5)',
                      background: 'rgba(20,30,23,0.6)',
                    }}
                  >
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">Oponent</span>
                      <span className="text-white text-xl font-bold truncate" style={{ fontFamily: "'Merienda', cursive" }}>
                        {opponent.name}
                      </span>
                    </div>
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 ${opponent.theme.split(' ')[0]} border border-white/20`} />
                  </button>
                ))}
              </div>

              <button
                className="text-slate-500 hover:text-slate-300 transition-colors text-xs font-mono tracking-widest underline underline-offset-4 mb-2"
                onClick={() => setEffectStep('CHOOSE_EFFECT')}
              >
                ← NÁVRAT K VÝBĚRU EFEKTU
              </button>
            </>
          )}
        </div>

        {/* Dekorativní vignet */}
        <div className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ border: '12px solid rgba(0,0,0,0.1)' }} />
      </DialogContent>
    </Dialog>
  );
}

// --- 5. MINIHRY S BALÍČKEM (Vize a Rekurze) ---
export function MinigameDialog({ minigameMode, onPick }: { minigameMode: any, onPick: (id: string) => void }) {
  if (!minigameMode) return null;

  const config: Record<string, { title: string; desc: string; color: string }> = {
    'EFF_015': { title: "Vize budoucnosti", desc: "Získej jednu kartu. Zbytek určí příští tahy v balíčku.", color: "text-blue-400" },
    'EFF_017': { title: "Rekurze odhazovacího pole", desc: "Vytáhni zapomenutou vědomost zpět do své ruky.", color: "text-purple-400" }
  };

  const current = config[minigameMode.effectId] || { title: "Výběr karty", desc: "", color: "text-emerald-400" };

  return (
    <Dialog open={!!minigameMode} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 text-white border-slate-700 rounded-[2.5rem]">
        <DialogHeader>
          <DialogTitle className={`text-4xl font-chalk text-center ${current.color} drop-shadow-lg`}>{current.title}</DialogTitle>
          <DialogDescription className="text-center text-slate-400 text-lg mt-2 font-mono italic">
            {current.desc}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center gap-6 py-12 min-h-16rem bg-black/40 rounded-3xl mt-6 border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-t from-emerald-500/5 to-transparent pointer-events-none" />
          {minigameMode.cards.length === 0 ? (
            <div className="text-slate-600 italic flex items-center font-mono">Prázdnota...</div>
          ) : (
            minigameMode.cards.map((card: GameCard) => (
              <div 
                key={card.id} 
                onClick={() => onPick(card.id)}
                className="w-28 h-40 bg-white border-4 border-slate-300 rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 hover:border-emerald-500 hover:rotate-2 transition-all group"
              >
                <span className="text-5xl font-black text-slate-800 font-chalk group-hover:scale-110 transition-transform">{card.symbol}</span>
              </div>
            ))
          )}
        </div>
        
        <div className="flex justify-center mt-6">
           <Button variant="outline" className="border-slate-700 text-slate-500 hover:text-white" onClick={() => onPick('CANCEL')}>ZAVŘÍT OKNO</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- 6. REŽIM ZÁVOREK (Syntaxe nade vše) ---
export function BracketOverlay({ bracketMode, players, currentPlayerId, handleBracketClick, onCancel }: any) {
  if (!bracketMode) return null;
  
  const currentPlayer = players.find((p: Player) => p.id === currentPlayerId);

  return (
    <div className="fixed inset-0 bg-slate-950/98 z-150 flex flex-col items-center justify-center p-8 backdrop-blur-xl animate-in fade-in">
      <div className="text-center mb-16">
        <h2 className="text-6xl text-white font-black mb-6 tracking-tighter uppercase font-chalk drop-shadow-lg">Režim závorek</h2>
        <div className="inline-block bg-emerald-500/10 py-4 px-10 rounded-full border-2 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.08)]">
          <p className="text-2xl text-emerald-400 animate-pulse font-mono tracking-tight font-bold">
            {bracketMode.step === 'LEFT' 
              ? "① Vyber kartu, PŘED kterou položíš '('" 
              : "② Vyber kartu, ZA kterou položíš ')'"}
          </p>
        </div>
      </div>
      
      <div className="w-full max-w-6xl bg-white/5 p-16 rounded-[4rem] border-4 border-emerald-500/20 shadow-[0_0_80px_rgba(16,185,129,0.04)]">
         <BoardArea 
            id="bracket-board" 
            cards={currentPlayer?.board || []} 
            isTargeting={true} 
            onCardClick={handleBracketClick} 
          />
      </div>
      
      <Button size="lg" variant="ghost" className="mt-12 text-slate-600 hover:text-white text-xl tracking-[0.2em] font-mono" onClick={onCancel}>
        PŘERUŠIT MANIPULACI
      </Button>
    </div>
  );
}

// --- 6. DIALOG PRO NÁHLED BALÍČKU (EFF_009) ---
export function DeckPreviewDialog({ 
  open, 
  deck, 
  onConfirm, 
  onCancel 
}: { 
  open: boolean; 
  deck: GameCard[]; 
  onConfirm: (reorderedDeck: GameCard[]) => void; 
  onCancel: () => void; 
}) {
  const [reordered, setReordered] = React.useState<GameCard[]>([...deck.slice(0, 3)]);
  const rest = [...deck.slice(3)];

  const moveCard = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...reordered];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setReordered(newOrder);
  };

  const handleConfirm = () => {
    onConfirm([...reordered, ...rest]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-2 border-emerald-600 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-emerald-400 text-xl font-bold">Náhled Balíčku</DialogTitle>
          <DialogDescription className="text-slate-300 text-sm">
            Uspořádej si prvních 3 karty podle svého přání
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {reordered.map((card, idx) => (
            <div key={`${card.id}-${idx}`} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-emerald-500/30">
              <span className="font-bold text-emerald-300 text-lg">{card.symbol}</span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => moveCard(idx, 'up')}
                  disabled={idx === 0}
                  className="text-xs"
                >
                  ↑
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => moveCard(idx, 'down')}
                  disabled={idx === reordered.length - 1}
                  className="text-xs"
                >
                  ↓
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400 text-center">+ {rest.length} dalších karet v balíčku</p>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleConfirm}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold"
          >
            Potvrdit
          </Button>
          <Button 
            onClick={onCancel}
            variant="destructive"
            className="flex-1"
          >
            Zrušit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- 7. DIALOG PRO VÝBĚR MODULA (EFF_012) ---
export function ModuloDialog({ 
  open, 
  hand, 
  onSelect, 
  onCancel 
}: { 
  open: boolean; 
  hand: GameCard[]; 
  onSelect: (number: number) => void; 
  onCancel: () => void; 
}) {
  const numberCards = hand.filter(card => cardsDatabase[card.symbol]?.type === 'number');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-2 border-blue-600 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-blue-400 text-xl font-bold">Modulo Operace</DialogTitle>
          <DialogDescription className="text-slate-300 text-sm">
            Vyber číslo z tvé ruky pro výpočet R mod (číslo)
          </DialogDescription>
        </DialogHeader>

        {numberCards.length === 0 ? (
          <p className="text-red-400 text-center py-4">Nemáš v ruce žádné číslice! Efekt se zrušuje.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {numberCards.map((card): any => {
              const cardNum = parseInt(card.symbol, 10);
              return (
                <Button
                  key={card.id}
                  onClick={() => onSelect(cardNum)}
                  className="bg-blue-600 hover:bg-blue-500 h-16 text-2xl font-bold"
                >
                  {card.symbol}
                </Button>
              );
            })}
          </div>
        )}

        {numberCards.length > 0 && (
          <Button 
            onClick={onCancel}
            variant="destructive"
            className="w-full mt-4"
          >
            Zrušit
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}