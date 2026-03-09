import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { GameCard } from '@/lib/effects';

interface BracketsDisplayProps {
  syntax: GameCard[];
  onBracketDragStart: (bracket: GameCard, pairIndex: number) => void;
  currentPlayer: any;
}

interface BracketPairProps {
  pair: { left: GameCard; right: GameCard };
  index: number;
  isVisible: boolean;
  onDragStart: (bracket: GameCard, pairIndex: number) => void;
}

// ==========================================
// JEDNOTLIVÝ PÁR ZÁVOREK S DRAG-DROP
// ==========================================
function BracketPair({ pair, index, isVisible, onDragStart }: BracketPairProps) {
  const { attributes: attrLeft, listeners: listLeft, setNodeRef: refLeft, transform: transformLeft, isDragging: isDraggingLeft } = useDraggable({
    id: pair.left.id,
    data: pair.left,
  });

  const { attributes: attrRight, listeners: listRight, setNodeRef: refRight, transform: transformRight, isDragging: isDraggingRight } = useDraggable({
    id: pair.right.id,
    data: pair.right,
  });

  const styleLeft = {
    transform: transformLeft ? CSS.Translate.toString(transformLeft) : undefined,
    zIndex: isDraggingLeft ? 100 : 10,
  };

  const styleRight = {
    transform: transformRight ? CSS.Translate.toString(transformRight) : undefined,
    zIndex: isDraggingRight ? 100 : 10,
  };

  // Obrázky pro páry - dva a tři mají vlastní SVG
  const getImageForPair = (pairIndex: number, isLeft: boolean) => {
    if (pairIndex === 0) {
      return null; // První pár používá text '('
    } else if (pairIndex === 1) {
      return isLeft ? '/icons/bracket-pair-2-left.svg' : '/icons/bracket-pair-2-right.svg';
    } else if (pairIndex === 2) {
      return isLeft ? '/icons/bracket-pair-3-left.svg' : '/icons/bracket-pair-3-right.svg';
    }
    return null;
  };

  const imageLeft = getImageForPair(index, true);
  const imageRight = getImageForPair(index, false);

  return (
    <div
      className={`transition-all duration-300 flex gap-4 items-center justify-center ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
      }`}
      style={{
        position: isVisible ? 'relative' : 'absolute',
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      {/* LEVÁ ZÁVORKA */}
      <div
        ref={refLeft}
        {...listLeft}
        {...attrLeft}
        style={styleLeft}
        onMouseDown={() => onDragStart(pair.left, index)}
        className={`relative w-12 h-16 rounded-lg border-2 border-emerald-500 
          bg-slate-800 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing
          ${isDraggingLeft ? 'scale-110 shadow-[0_0_25px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/50' : 'hover:shadow-emerald-500/30 hover:-translate-y-2'}
          transition-all duration-200`}
      >
        {imageLeft ? (
          <img src={imageLeft} alt="(" className="w-full h-full object-contain p-2" />
        ) : (
          <span className="text-4xl font-chalk text-emerald-300 font-bold">(</span>
        )}
      </div>

      {/* PRAVÁ ZÁVORKA */}
      <div
        ref={refRight}
        {...listRight}
        {...attrRight}
        style={styleRight}
        onMouseDown={() => onDragStart(pair.right, index)}
        className={`relative w-12 h-16 rounded-lg border-2 border-emerald-500
          bg-slate-800 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing
          ${isDraggingRight ? 'scale-110 shadow-[0_0_25px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/50' : 'hover:shadow-emerald-500/30 hover:-translate-y-2'}
          transition-all duration-200`}
      >
        {imageRight ? (
          <img src={imageRight} alt=")" className="w-full h-full object-contain p-2" />
        ) : (
          <span className="text-4xl font-chalk text-emerald-300 font-bold">)</span>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PANEL S VŠEMI 3 PÁRY ZÁVOREK
// ==========================================
export function BracketsDisplay({
  syntax,
  onBracketDragStart,
  currentPlayer,
}: BracketsDisplayProps) {
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  // Extrahuj páry z syntax pole
  const pairs = [
    { left: syntax[0], right: syntax[1] }, // Pár 1
    { left: syntax[2], right: syntax[3] }, // Pár 2
    { left: syntax[4], right: syntax[5] }, // Pár 3
  ].filter((p) => p.left && p.right);

  // Počítej kolik párů je již použitých (chybí v syntax)
  const usedPairs = syntax.filter((card) => !currentPlayer?.board.some((bc: GameCard) => bc.id === card.id)).length / 2;
  const availablePairs = Math.max(0, 3 - Math.floor(usedPairs));

  const handleExpand = (index: number) => {
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 md:p-6 lg:p-8">
      {/* NADPIS */}
      <div className="text-emerald-400 font-bold uppercase text-xs tracking-widest font-mono">
        Závorky
      </div>

      {/* KONTEJNER PRO PÁRY */}
      <div className="flex flex-col gap-6 items-center">
        {pairs.map((pair, index) => (
          <div key={index} className="relative">
            {/* Samotný pár - viditelný jen první */}
            <BracketPair
              pair={pair}
              index={index}
              isVisible={index === 0} // Pouze první pár je viditelný
              onDragStart={onBracketDragStart}
            />

            {/* Indikátor zbývajících párů - je-li rozpravený */}
            {index > 0 && expandedIndices.includes(index) && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 text-emerald-400/60 text-xs font-bold">
                Pár {index + 1}
              </div>
            )}

            {/* Tlačítko pro rozbalení - viditelné pro páry 2-3 */}
            {index > 0 && (
              <button
                onClick={() => handleExpand(index)}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-emerald-500 text-xs opacity-50 hover:opacity-100 transition-opacity"
              >
                {'▼'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* INDIKÁTOR DOSTUPNOSTI */}
      <div className="text-center text-xs text-slate-500 font-mono mt-4 border-t border-slate-700 pt-4">
        <div className="text-emerald-400 font-bold">{availablePairs}/3</div>
        <div className="text-[10px]">párů</div>
      </div>
    </div>
  );
}

export default BracketsDisplay;
