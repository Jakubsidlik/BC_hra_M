import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { GameCard } from '@/lib/effects';

interface BracketsDisplayProps {
  syntax: GameCard[];
  onBracketDragStart: (bracket: GameCard, pairIndex: number) => void;
  currentPlayer: any;
}

// Mapování symbolu závorky na vizuální label
const BRACKET_LABEL: Record<string, { left: string; right: string; label: string; color: string }> = {
  '(': { left: '(', right: ')', label: 'Kulaté závorky',  color: 'text-emerald-300 border-emerald-500' },
  '[': { left: '[', right: ']', label: 'Hranaté závorky', color: 'text-blue-300   border-blue-500'    },
  '{': { left: '{', right: '}', label: 'Složené závorky', color: 'text-violet-300 border-violet-500'  },
};

// ==========================================
// JEDNOTLIVÝ PÁR ZÁVOREK S DRAG-DROP
// ==========================================
function BracketPair({
  pair,
  pairIndex,
  onDragStart,
}: {
  pair: { left: GameCard; right: GameCard };
  pairIndex: number;
  onDragStart: (bracket: GameCard, pairIndex: number) => void;
}) {
  const info = BRACKET_LABEL[pair.left.symbol] ?? BRACKET_LABEL['('];

  const {
    attributes: attrL, listeners: listL, setNodeRef: refL,
    transform: transL, isDragging: isDragL,
  } = useDraggable({ id: pair.left.id, data: pair.left });

  const {
    attributes: attrR, listeners: listR, setNodeRef: refR,
    transform: transR, isDragging: isDragR,
  } = useDraggable({ id: pair.right.id, data: pair.right });

  const baseCls = `relative w-10 h-14 md:w-12 md:h-16 rounded-lg border-2 bg-slate-800
    shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing
    transition-all duration-200 hover:-translate-y-2 select-none ${info.color}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">{info.label}</span>
      <div className="flex gap-3 items-center">
        {/* LEVÁ ZÁVORKA */}
        <div
          ref={refL} {...listL} {...attrL}
          onMouseDown={() => onDragStart(pair.left, pairIndex)}
          style={{ transform: transL ? CSS.Translate.toString(transL) : undefined, zIndex: isDragL ? 100 : 10 }}
          className={`${baseCls} ${isDragL ? 'scale-110 shadow-[0_0_25px_rgba(16,185,129,0.5)] ring-2 ring-white/20' : ''}`}
        >
          <span className="text-3xl md:text-4xl font-bold">{info.left}</span>
        </div>

        {/* PRAVÁ ZÁVORKA */}
        <div
          ref={refR} {...listR} {...attrR}
          onMouseDown={() => onDragStart(pair.right, pairIndex)}
          style={{ transform: transR ? CSS.Translate.toString(transR) : undefined, zIndex: isDragR ? 100 : 10 }}
          className={`${baseCls} ${isDragR ? 'scale-110 shadow-[0_0_25px_rgba(16,185,129,0.5)] ring-2 ring-white/20' : ''}`}
        >
          <span className="text-3xl md:text-4xl font-bold">{info.right}</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PANEL SE ZÁVORKAMI
// ==========================================
export function BracketsDisplay({
  syntax,
  onBracketDragStart,
}: BracketsDisplayProps) {
  // Závorky (ne rovnítko) — vždy po 2 tvoří pár [levá, pravá]
  const bracketCards = syntax.filter(c => c.symbol !== '=');

  // První dostupný pár
  const firstPair = bracketCards.length >= 2
    ? { left: bracketCards[0], right: bracketCards[1] }
    : null;

  // Pairindex = vždy 0, protože první dostupný pár je vždy na syntax[0..1]
  const pairIndex = 0;

  return (
    <div className="flex flex-col items-center gap-4 p-4 md:p-6">
      {/* NADPIS */}
      <div className="text-emerald-400 font-bold uppercase text-xs tracking-widest font-mono">
        Závorky
      </div>

      {/* AKTUÁLNÍ PÁR nebo zpráva o vyčerpání */}
      {firstPair ? (
        <BracketPair
          pair={firstPair}
          pairIndex={pairIndex}
          onDragStart={onBracketDragStart}
        />
      ) : (
        <div className="text-center px-4 py-3 rounded-xl border border-slate-600 bg-slate-800/60 max-w-[160px]">
          <span className="text-slate-400 text-xs font-mono leading-relaxed">
            Další závorky<br />nejsou dostupné
          </span>
        </div>
      )}

      {/* INDIKÁTOR ZBÝVAJÍCÍCH PÁRŮ */}
      <div className="text-center text-xs text-slate-500 font-mono mt-1 border-t border-slate-700 pt-3 w-full">
        <div className="text-emerald-400 font-bold">{Math.floor(bracketCards.length / 2)}/3</div>
        <div className="text-[10px]">párů zbývá</div>
      </div>
    </div>
  );
}

export default BracketsDisplay;
