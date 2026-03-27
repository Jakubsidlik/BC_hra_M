import { useDroppable } from '@dnd-kit/core';

interface DiscardZoneProps {
  discardCount: number;
  deckCount: number;
  isDiscarding: boolean;
}

export function DiscardZone({ discardCount, deckCount, isDiscarding }: DiscardZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'drop-discard' });
  
  return (
    <div 
      ref={setNodeRef}
      className={`w-20 h-28 lg:w-32 lg:h-44 shrink-0 rounded-2rem border-2 flex flex-col items-center justify-center text-white font-bold p-2 shadow-lg transition-all duration-300 relative
        ${isOver && isDiscarding ? 'border-red-500 bg-red-950/80 scale-105 shadow-[0_0_25px_rgba(239,68,68,0.4)]' : 'border-white/10 bg-slate-900/80'}
        ${isDiscarding && !isOver ? 'animate-pulse ring-4 ring-red-500/50' : ''}
      `}
    >
      <span className="text-slate-500 text-[8px] lg:text-[9px] uppercase tracking-tighter mb-1 opacity-50 italic pointer-events-none">
        Balíček: {deckCount}
      </span>
      <div className="flex flex-col items-center cursor-default pointer-events-none">
        <span className="text-[9px] lg:text-[10px] text-slate-400 uppercase font-mono italic">Odhazovací pole</span>
        <span className={`text-3xl lg:text-5xl font-chalk mt-1 ${isDiscarding ? 'text-red-500' : 'text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}>
          {discardCount}
        </span>
      </div>
      {isDiscarding && (
        <div className="absolute -top-3 right-0 bg-red-600 text-[9px] px-2 py-1 rounded-full animate-bounce shadow-md pointer-events-none">
          SEM
        </div>
      )}
    </div>
  );
}