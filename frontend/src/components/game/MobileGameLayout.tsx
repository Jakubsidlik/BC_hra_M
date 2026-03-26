import React, { useState } from 'react';
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cardsDatabase } from '@/data/cardsDB';
import { getBorderColor, getSpecialSlots } from '@/lib/gameHelpers';
import { BoardDropZone, type SlotDropData } from '@/components/game/Cards';
import type { GameCard, Player } from '@/lib/effects';

const BASE = import.meta.env.BASE_URL;

// ==========================================
// THEME → CSS COLORS MAPPING
// Converts Tailwind theme IDs (like 'bg-violet-600/60')
// into a concrete palette for the mobile layout.
// ==========================================
interface ThemePalette {
  /** Main hue as a CSS hex */
  primary: string;
  /** Darker variant for page background start */
  bgDark: string;
  /** Mid variant for chalkboard / board area */
  bgMid: string;
  /** Lighter dot pattern color */
  bgDot: string;
  /** Accent color for button, draw pile, etc */
  accent: string;
  /** Semi-transparent rgba for nav bar background */
  navBg: string;
  /** Semi-transparent rgba for nav border */
  navBorder: string;
  /** Semi-transparent rgba for footer gradient */
  footerBg: string;
  /** Semi-transparent rgba for hover/glow effects */
  glow: string;
}

const THEME_PALETTES: Record<string, ThemePalette> = {
  'bg-violet-600/60': {
    primary: '#7c3aed',
    bgDark: '#1e0a38',
    bgMid: '#2e1a5a',
    bgDot: '#3d2570',
    accent: '#7c3aed',
    navBg: 'rgba(30,10,56,0.75)',
    navBorder: 'rgba(124,58,237,0.25)',
    footerBg: '#1e0a38',
    glow: 'rgba(124,58,237,0.5)',
  },
  'bg-emerald-600/60': {
    primary: '#059669',
    bgDark: '#052e16',
    bgMid: '#1a4731',
    bgDot: '#2d5a44',
    accent: '#059669',
    navBg: 'rgba(5,46,22,0.75)',
    navBorder: 'rgba(5,150,105,0.25)',
    footerBg: '#052e16',
    glow: 'rgba(5,150,105,0.5)',
  },
  'bg-blue-600/60': {
    primary: '#2563eb',
    bgDark: '#0f172a',
    bgMid: '#1e3a6a',
    bgDot: '#2a4d8a',
    accent: '#2563eb',
    navBg: 'rgba(15,23,42,0.75)',
    navBorder: 'rgba(37,99,235,0.25)',
    footerBg: '#0f172a',
    glow: 'rgba(37,99,235,0.5)',
  },
  'bg-rose-600/60': {
    primary: '#e11d48',
    bgDark: '#2d0a14',
    bgMid: '#4c1a28',
    bgDot: '#6b2438',
    accent: '#e11d48',
    navBg: 'rgba(45,10,20,0.75)',
    navBorder: 'rgba(225,29,72,0.25)',
    footerBg: '#2d0a14',
    glow: 'rgba(225,29,72,0.5)',
  },
  'bg-pink-600/60': {
    primary: '#db2777',
    bgDark: '#2a0a1e',
    bgMid: '#4a1738',
    bgDot: '#6b2350',
    accent: '#db2777',
    navBg: 'rgba(42,10,30,0.75)',
    navBorder: 'rgba(219,39,119,0.25)',
    footerBg: '#2a0a1e',
    glow: 'rgba(219,39,119,0.5)',
  },
  'bg-amber-500/60': {
    primary: '#d97706',
    bgDark: '#27160a',
    bgMid: '#4a2e14',
    bgDot: '#6b4020',
    accent: '#d97706',
    navBg: 'rgba(39,22,10,0.75)',
    navBorder: 'rgba(217,119,6,0.25)',
    footerBg: '#27160a',
    glow: 'rgba(217,119,6,0.5)',
  },
  'bg-cyan-600/60': {
    primary: '#0891b2',
    bgDark: '#0a1f2e',
    bgMid: '#1a3a50',
    bgDot: '#254f6a',
    accent: '#0891b2',
    navBg: 'rgba(10,31,46,0.75)',
    navBorder: 'rgba(8,145,178,0.25)',
    footerBg: '#0a1f2e',
    glow: 'rgba(8,145,178,0.5)',
  },
  'bg-orange-600/60': {
    primary: '#ea580c',
    bgDark: '#2a1008',
    bgMid: '#4a2214',
    bgDot: '#6b3420',
    accent: '#ea580c',
    navBg: 'rgba(42,16,8,0.75)',
    navBorder: 'rgba(234,88,12,0.25)',
    footerBg: '#2a1008',
    glow: 'rgba(234,88,12,0.5)',
  },
};

// Fallback to emerald if theme not found
function getPalette(themeId: string): ThemePalette {
  return THEME_PALETTES[themeId] ?? THEME_PALETTES['bg-emerald-600/60'];
}

function findIntegralVariable(cards: GameCard[]): 'x' | 'y' | null {
  const stack = [...cards];
  while (stack.length > 0) {
    const card = stack.pop();
    if (!card) continue;
    if (card.integralVariable) return card.integralVariable;
    if (card.exponent) stack.push(card.exponent);
    if (card.slotCards) {
      Object.values(card.slotCards).forEach(slotCard => {
        if (slotCard) stack.push(slotCard);
      });
    }
  }
  return null;
}

// Mobile board sizing
const BOARD_CARD_W = '2.625rem';
const BOARD_CARD_H = '4.03rem';
const VS_CARD_W = '3.94rem';
const VS_CARD_H = '6.05rem';
const DRAG_CARD_W = '3.5rem';
const DRAG_CARD_H = '5.37rem';
const FULL_CARD_W = '5.5rem';
const FULL_CARD_H = '8.44rem';
const VS_CARD_SYMBOLS = new Set(['int', 'd/dx', '∑', '∏', 'lim']);

// ==========================================
// MINI HAND CARD (fan footer)
// ==========================================
interface MiniHandCardProps {
  card: GameCard;
  index: number;
  total: number;
  isDiscarding: boolean;
  onDiscard?: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  palette: ThemePalette;
}

function MiniHandCard({ card, index, total, isDiscarding, onDiscard, onSelect, isSelected = false, palette }: MiniHandCardProps) {
  const cardData = cardsDatabase[card.symbol];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: card,
  });

  const midpoint = (total - 1) / 2;
  const distanceFromCenter = index - midpoint;
  const rotation = isDragging ? 0 : distanceFromCenter * 12;
  const translateY = isDragging ? 0 : Math.abs(distanceFromCenter) * 6;
  const translateX = isDragging ? 0 : distanceFromCenter * 28;

  const style: React.CSSProperties = {
    transform: transform
      ? CSS.Translate.toString(transform)
      : `rotate(${rotation}deg) translateY(${translateY}px) translateX(${translateX}px) scale(${isSelected ? 1.85 : 1})`,
    zIndex: isDragging ? 99999 : 10 + index,
    position: 'absolute',
    width: FULL_CARD_W,
    height: FULL_CARD_H,
    bottom: 0,
    left: '50%',
    marginLeft: '-2.75rem',
    backgroundColor: palette.bgMid,
    borderColor: isDragging ? palette.primary : `${palette.primary}66`,
    boxShadow: isDragging ? `0 0 25px ${palette.glow}` : undefined,
  };

  const borderColor = getBorderColor(card.symbol);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(event) => {
        event.stopPropagation();
        if (isDiscarding && onDiscard) {
          onDiscard(card.id);
          return;
        }
        onSelect?.(card.id);
      }}
      style={style}
      className={`rounded-xl border-2 shadow-xl select-none overflow-hidden
        transition-all duration-200 origin-bottom
        ${isDragging ? 'scale-110 ring-2 ring-white/30' : ''}
        ${isDiscarding
          ? 'cursor-pointer border-red-500! animate-pulse'
          : 'cursor-grab active:cursor-grabbing hover:-translate-y-6'}
        ${borderColor}
      `}
    >
      <div className="w-full h-full flex items-center justify-center">
        {cardData?.image ? (
          <img
            src={`${BASE}${cardData.image.replace(/^\//, '')}`}
            alt={card.symbol}
           
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl font-chalk text-white">{card.symbol}</span>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MOBILE DISCARD ZONE DROPPABLE
// ==========================================
interface MobileDiscardSlotProps {
  discardCount: number;
  isDiscarding: boolean;
  palette: ThemePalette;
}
function MobileDiscardSlot({ discardCount, isDiscarding, palette }: MobileDiscardSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'drop-discard' });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: FULL_CARD_W,
        height: FULL_CARD_H,
        backgroundColor: isOver ? 'rgba(127,29,29,0.8)' : `${palette.bgMid}aa`,
        borderColor: isOver ? '#ef4444' : 'rgba(255,255,255,0.3)',
      }}
      className={`rounded-md border-2 shadow-inner relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300
        ${isOver ? 'scale-105' : ''}
        ${isDiscarding && !isOver ? 'animate-pulse ring-4 ring-red-500/50' : ''}
      `}
    >
      <div className="absolute inset-0 rotate-12 translate-y-2" style={{ background: `${palette.primary}0d` }} />
      <span className="material-symbols-outlined text-2xl text-white/40 relative z-10">delete</span>
      <span className="text-[10px] uppercase tracking-tighter text-white/50 font-bold mt-1 relative z-10">
        {discardCount > 0 ? `Odhoz (${discardCount})` : 'Odhoz'}
      </span>
      {isDiscarding && (
        <div className="absolute -top-3 right-0 bg-red-600 text-white text-[9px] px-2 py-1 rounded-full animate-bounce shadow-md pointer-events-none">
          SEM
        </div>
      )}
    </div>
  );
}

// ==========================================
// MOBILE DRAGGABLE BOARD CARD
// ==========================================
function MobileSlotValueCard({ slotCard }: { slotCard: GameCard }) {
  const slotCardData = cardsDatabase[slotCard.symbol];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slotCard.id,
    data: slotCard,
    disabled: !!slotCard.locked,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ transform: transform ? CSS.Translate.toString(transform) : undefined, zIndex: isDragging ? 99999 : undefined }}
      className={`w-full h-full rounded-md border-2 flex items-center justify-center bg-slate-800 shadow-xl cursor-grab active:cursor-grabbing ${getBorderColor(slotCard.symbol)} ${isDragging ? 'ring-2 ring-white/70 scale-105' : ''}`}
    >
      <div className="w-full h-full flex items-center justify-center p-1 pointer-events-none">
        {slotCardData?.image ? (
          <img src={`${BASE}${slotCardData.image.replace(/^\//, '')}`} alt={slotCard.symbol} decoding="async" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] font-chalk text-white">{slotCard.symbol}</span>
        )}
      </div>
    </div>
  );
}

function DraggableBoardCard({
  card,
  palette,
  onDerivativeVariableChange,
  onSeriesVariableChange,
  onLimitVariableChange,
}: {
  card: GameCard;
  palette: ThemePalette;
  hasModifiedBoardThisTurn: boolean;
  onDerivativeVariableChange?: (cardId: string, variable: 'x' | 'y') => void;
  onSeriesVariableChange?: (cardId: string, variable: 'x' | 'y') => void;
  onLimitVariableChange?: (cardId: string, variable: 'x' | 'y') => void;
}) {
  const cardData = cardsDatabase[card.symbol];
  const specialSlots = getSpecialSlots(card.symbol);
  const slotKeys = specialSlots.map(slot => slot.key);
  const hasFourSlots = slotKeys.length === 4;
  const hasLeftRightSlots = slotKeys.length === 2 && slotKeys.includes('a' as any) && slotKeys.includes('b' as any);
  const hasTwoSlots = slotKeys.length === 2 && !hasLeftRightSlots;
  const hasOneSlot = slotKeys.length === 1;
  const [isExpanded, setIsExpanded] = useState(false);
  const isVsCard = card.locked && VS_CARD_SYMBOLS.has(card.symbol);
  const isDerivativeCard = card.symbol === 'd/dx';
  const derivativeVar = card.derivativeVariable === 'y' ? 'y' : 'x';
  const derivativeLabel = derivativeVar === 'y' ? 'dy' : 'dx';
  const isSeriesCard = card.symbol === '∑' || card.symbol === '∏';
  const seriesVar = card.seriesVariable === 'y' ? 'y' : 'x';
  const isLimitCard = card.symbol === 'lim';
  const limitVar = card.limitVariable === 'y' ? 'y' : 'x';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: card,
    disabled: card.locked,
  });

  const topSlotKey = hasTwoSlots ? slotKeys[0] : null;
  const bottomSlotKey = hasTwoSlots ? slotKeys[1] : null;
  const leftSlotKey = hasLeftRightSlots ? (slotKeys.find(k => k === 'a') ?? slotKeys[0]) : null;
  const rightSlotKey = hasLeftRightSlots ? (slotKeys.find(k => k === 'b') ?? slotKeys[1]) : null;

  const { setNodeRef: setTopSlotRef, isOver: isOverTop } = useDroppable({
    id: topSlotKey ? `slot-${card.id}-${topSlotKey}` : `slot-${card.id}-top`,
    data: topSlotKey ? ({ parentId: card.id, slotKey: topSlotKey } as SlotDropData) : undefined,
    disabled: !topSlotKey,
  });
  const { setNodeRef: setBottomSlotRef, isOver: isOverBottom } = useDroppable({
    id: bottomSlotKey ? `slot-${card.id}-${bottomSlotKey}` : `slot-${card.id}-bottom`,
    data: bottomSlotKey ? ({ parentId: card.id, slotKey: bottomSlotKey } as SlotDropData) : undefined,
    disabled: !bottomSlotKey,
  });
  const { setNodeRef: setLeftSlotRef, isOver: isOverLeft } = useDroppable({
    id: leftSlotKey ? `slot-${card.id}-${leftSlotKey}` : `slot-${card.id}-left`,
    data: leftSlotKey ? ({ parentId: card.id, slotKey: leftSlotKey } as SlotDropData) : undefined,
    disabled: !leftSlotKey,
  });
  const { setNodeRef: setRightSlotRef, isOver: isOverRight } = useDroppable({
    id: rightSlotKey ? `slot-${card.id}-${rightSlotKey}` : `slot-${card.id}-right`,
    data: rightSlotKey ? ({ parentId: card.id, slotKey: rightSlotKey } as SlotDropData) : undefined,
    disabled: !rightSlotKey,
  });
  const ulKey = hasFourSlots ? slotKeys[0] : null;
  const urKey = hasFourSlots ? slotKeys[1] : null;
  const llKey = hasFourSlots ? slotKeys[2] : null;
  const lrKey = hasFourSlots ? slotKeys[3] : null;
  const { setNodeRef: setUlRef, isOver: isOverUl } = useDroppable({
    id: ulKey ? `slot-${card.id}-${ulKey}` : `slot-${card.id}-ul`,
    data: ulKey ? ({ parentId: card.id, slotKey: ulKey } as SlotDropData) : undefined,
    disabled: !ulKey,
  });
  const { setNodeRef: setUrRef, isOver: isOverUr } = useDroppable({
    id: urKey ? `slot-${card.id}-${urKey}` : `slot-${card.id}-ur`,
    data: urKey ? ({ parentId: card.id, slotKey: urKey } as SlotDropData) : undefined,
    disabled: !urKey,
  });
  const { setNodeRef: setLlRef, isOver: isOverLl } = useDroppable({
    id: llKey ? `slot-${card.id}-${llKey}` : `slot-${card.id}-ll`,
    data: llKey ? ({ parentId: card.id, slotKey: llKey } as SlotDropData) : undefined,
    disabled: !llKey,
  });
  const { setNodeRef: setLrRef, isOver: isOverLr } = useDroppable({
    id: lrKey ? `slot-${card.id}-${lrKey}` : `slot-${card.id}-lr`,
    data: lrKey ? ({ parentId: card.id, slotKey: lrKey } as SlotDropData) : undefined,
    disabled: !lrKey,
  });
  const { setNodeRef: setWholeSlotRef, isOver: isOverWhole } = useDroppable({
    id: hasOneSlot ? `slot-${card.id}-${slotKeys[0]}` : `slot-${card.id}-whole`,
    data: hasOneSlot ? ({ parentId: card.id, slotKey: slotKeys[0] } as SlotDropData) : undefined,
    disabled: !hasOneSlot,
  });

  const isSlotOver = isOverTop || isOverBottom || isOverWhole || isOverUl || isOverUr || isOverLl || isOverLr || isOverLeft || isOverRight;

  const smallSize = { width: BOARD_CARD_W, height: BOARD_CARD_H };
  const dragSize = { width: DRAG_CARD_W, height: DRAG_CARD_H };
  const baseSize = isVsCard ? { width: VS_CARD_W, height: VS_CARD_H } : smallSize;
  const style: React.CSSProperties = {
    ...(isDragging ? dragSize : baseSize),
    backgroundColor: `${palette.bgDark}cc`,
    borderColor: isDragging ? palette.primary : 'rgba(255,255,255,0.25)',
    transform: transform
      ? `${CSS.Translate.toString(transform)}${isSlotOver ? ' scale(2)' : ''}`
      : (isSlotOver ? 'scale(2)' : undefined),
    zIndex: isDragging ? 99999 : undefined,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 0 20px rgba(255,255,255,0.8)' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`rounded-md border-2 flex items-center justify-center shadow-md transition-colors duration-700 relative
        ${card.locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:border-red-400/60 hover:scale-105'}
      `}
      style={style}
      onClick={() => {
        if (!isDragging && (hasOneSlot || hasTwoSlots || hasFourSlots || hasLeftRightSlots)) {
          setIsExpanded(prev => !prev);
        }
      }}
    >
      {isDerivativeCard && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            const nextVar = derivativeVar === 'x' ? 'y' : 'x';
            onDerivativeVariableChange?.(card.id, nextVar);
          }}
          className="absolute z-20 right-0.5 top-0.5 origin-top-right scale-[1.5] rounded-full border border-white/30 bg-slate-900/90 px-1 py-0.5 text-[8px] font-black text-white"
        >
          {derivativeLabel}
        </button>
      )}
      {isSeriesCard && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            const nextVar = seriesVar === 'x' ? 'y' : 'x';
            onSeriesVariableChange?.(card.id, nextVar);
          }}
          className="absolute z-20 right-0.5 top-0.5 origin-top-right scale-[1.5] rounded-full border border-white/30 bg-slate-900/90 px-1 py-0.5 text-[8px] font-black text-white"
        >
          {seriesVar}
        </button>
      )}
      {isLimitCard && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            const nextVar = limitVar === 'x' ? 'y' : 'x';
            onLimitVariableChange?.(card.id, nextVar);
          }}
          className="absolute z-20 right-0.5 top-0.5 origin-top-right scale-[1.5] rounded-full border border-white/30 bg-slate-900/90 px-1 py-0.5 text-[8px] font-black text-white"
        >
          {limitVar}
        </button>
      )}
      {hasFourSlots && (
        <>
          <div
            ref={setUlRef}
            className="absolute left-0 top-0 w-1/2 h-1/2 rounded-tl-md pointer-events-auto"
            style={isOverUl ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setUrRef}
            className="absolute right-0 top-0 w-1/2 h-1/2 rounded-tr-md pointer-events-auto"
            style={isOverUr ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setLlRef}
            className="absolute left-0 bottom-0 w-1/2 h-1/2 rounded-bl-md pointer-events-auto"
            style={isOverLl ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setLrRef}
            className="absolute right-0 bottom-0 w-1/2 h-1/2 rounded-br-md pointer-events-auto"
            style={isOverLr ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.7)' } : undefined}
          />
        </>
      )}
      {hasTwoSlots && (
        <>
          <div
            ref={setTopSlotRef}
            className="absolute left-0 right-0 top-0 h-1/2 rounded-t-md pointer-events-auto"
            style={isOverTop ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setBottomSlotRef}
            className="absolute left-0 right-0 bottom-0 h-1/2 rounded-b-md pointer-events-auto"
            style={isOverBottom ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.7)' } : undefined}
          />
        </>
      )}
      {hasLeftRightSlots && (
        <>
          <div
            ref={setLeftSlotRef}
            className="absolute left-0 top-0 w-1/2 h-full rounded-l-md pointer-events-auto"
            style={isOverLeft ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setRightSlotRef}
            className="absolute right-0 top-0 w-1/2 h-full rounded-r-md pointer-events-auto"
            style={isOverRight ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.7)' } : undefined}
          />
        </>
      )}
      {hasOneSlot && (
        <div
          ref={setWholeSlotRef}
          className="absolute inset-0 rounded-md pointer-events-auto"
          style={isOverWhole ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.7)' } : undefined}
        />
      )}

      {!isDragging && isExpanded && hasFourSlots && (
        <>
          {ulKey && card.slotCards?.[ulKey] && (
            <div className="absolute" style={{ left: '20%', top: '-12%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0, width: smallSize.width, height: smallSize.height }}>
              <div className={`w-full h-full rounded-md border-2 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[ulKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-1">
                  {cardsDatabase[card.slotCards[ulKey]!.symbol]?.image ? (
                    <img src={`${BASE}${cardsDatabase[card.slotCards[ulKey]!.symbol].image.replace(/^\//, '')}`} alt={card.slotCards[ulKey]!.symbol} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-chalk text-white">{card.slotCards[ulKey]!.symbol}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {urKey && card.slotCards?.[urKey] && (
            <div className="absolute" style={{ left: '80%', top: '-12%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0, width: smallSize.width, height: smallSize.height }}>
              <div className={`w-full h-full rounded-md border-2 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[urKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-1">
                  {cardsDatabase[card.slotCards[urKey]!.symbol]?.image ? (
                    <img src={`${BASE}${cardsDatabase[card.slotCards[urKey]!.symbol].image.replace(/^\//, '')}`} alt={card.slotCards[urKey]!.symbol} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-chalk text-white">{card.slotCards[urKey]!.symbol}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {llKey && card.slotCards?.[llKey] && (
            <div className="absolute" style={{ left: '20%', top: '88%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0, width: smallSize.width, height: smallSize.height }}>
              <div className={`w-full h-full rounded-md border-2 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[llKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-1">
                  {cardsDatabase[card.slotCards[llKey]!.symbol]?.image ? (
                    <img src={`${BASE}${cardsDatabase[card.slotCards[llKey]!.symbol].image.replace(/^\//, '')}`} alt={card.slotCards[llKey]!.symbol} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-chalk text-white">{card.slotCards[llKey]!.symbol}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {lrKey && card.slotCards?.[lrKey] && (
            <div className="absolute" style={{ left: '80%', top: '88%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0, width: smallSize.width, height: smallSize.height }}>
              <div className={`w-full h-full rounded-md border-2 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[lrKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-1">
                  {cardsDatabase[card.slotCards[lrKey]!.symbol]?.image ? (
                    <img src={`${BASE}${cardsDatabase[card.slotCards[lrKey]!.symbol].image.replace(/^\//, '')}`} alt={card.slotCards[lrKey]!.symbol} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-chalk text-white">{card.slotCards[lrKey]!.symbol}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {!isDragging && isExpanded && hasTwoSlots && (
        <>
          {topSlotKey && card.slotCards?.[topSlotKey] && (
            <div className="absolute left-1/2" style={{ top: '-10%', transform: 'translateX(-50%) scale(0.9)', zIndex: 0, width: smallSize.width, height: smallSize.height }}>
              <MobileSlotValueCard slotCard={card.slotCards[topSlotKey]!} />
            </div>
          )}
          {bottomSlotKey && card.slotCards?.[bottomSlotKey] && (
            <div className="absolute left-1/2" style={{ top: '86%', transform: 'translateX(-50%) scale(0.9)', zIndex: 0, width: smallSize.width, height: smallSize.height }}>
              <MobileSlotValueCard slotCard={card.slotCards[bottomSlotKey]!} />
            </div>
          )}
        </>
      )}
      {!isDragging && isExpanded && hasLeftRightSlots && (
        <>
          {leftSlotKey && card.slotCards?.[leftSlotKey] && (
            <div className="absolute top-1/2" style={{ left: '-10%', transform: 'translateY(-50%) scale(0.9)', zIndex: 0, width: smallSize.width, height: smallSize.height }}>
              <MobileSlotValueCard slotCard={card.slotCards[leftSlotKey]!} />
            </div>
          )}
          {rightSlotKey && card.slotCards?.[rightSlotKey] && (
            <div className="absolute top-1/2" style={{ right: '-10%', transform: 'translateY(-50%) translate(50%) scale(0.9)', zIndex: 0, width: smallSize.width, height: smallSize.height }}>
              <MobileSlotValueCard slotCard={card.slotCards[rightSlotKey]!} />
            </div>
          )}
        </>
      )}

      {!isDragging && isExpanded && hasOneSlot && card.slotCards?.[slotKeys[0]] && (
        <div className="absolute left-1/2" style={{ top: '-10%', transform: 'translateX(-50%) scale(0.9)', zIndex: 0, width: smallSize.width, height: smallSize.height }}>
          <MobileSlotValueCard slotCard={card.slotCards[slotKeys[0]]!} />
        </div>
      )}
      {cardData?.image ? (
        <img src={`${BASE}${cardData.image.replace(/^\//, '')}`} alt={card.symbol} decoding="async" className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <span className="text-2xl font-chalk text-white">{card.symbol}</span>
      )}
    </div>
  );
}

// ==========================================
// MOBILE BOARD DROP ZONE
// ==========================================
function MobileBoardDropZone({ id, palette }: { id: string; palette: ThemePalette }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="absolute inset-0 rounded-lg transition-all duration-300 z-10"
      style={
        isOver
          ? { background: `${palette.primary}18`, boxShadow: `inset 0 0 0 2px ${palette.primary}80` }
          : {}
      }
    />
  );
}

// ==========================================
// BRACKET KARTA — draggable, stack (, [, {
// ==========================================
interface BracketCardProps {
  syntax: GameCard[];
  bracketMode: { leftInsertPosition: number; pairIndex: number } | null;
  palette: ThemePalette;
  onCancel: () => void;
}

function BracketCard({ syntax, bracketMode, palette, onCancel }: BracketCardProps) {
  const openSymbols = ['(', '[', '{'];
  const closeSymbols = [')', ']', '}'];
  const firstOpen = syntax.find(c => openSymbols.includes(c.symbol));
  const exhausted = !firstOpen;
  const closeSymbol = bracketMode ? closeSymbols[bracketMode.pairIndex] : null;
  const closeCard = closeSymbol ? syntax.find(c => c.symbol === closeSymbol) : null;
  const closeCardData = closeSymbol ? cardsDatabase[closeSymbol] : null;
  const draggableCard = bracketMode ? closeCard : firstOpen;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableCard?.id ?? (bracketMode ? 'bracket-close-dummy' : 'bracket-exhausted'),
    data: draggableCard ?? undefined,
    disabled: bracketMode ? !closeCard : exhausted,
  });

  // V RIGHT fázi: zobraz uzavírací závorku jako draggable
  if (bracketMode) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="relative overflow-hidden rounded-md border-2 border-yellow-400/80 shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            width: FULL_CARD_W,
            height: FULL_CARD_H,
            backgroundColor: isDragging ? `${palette.bgDark}cc` : `${palette.bgMid}dd`,
            boxShadow: `0 0 12px rgba(250,204,21,0.5)`,
            transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
            zIndex: isDragging ? 99999 : undefined,
          }}
        >
          {closeCardData?.image ? (
            <img src={`${BASE}${closeCardData.image.replace(/^\//, '')}`} alt={closeSymbol ?? undefined} decoding="async" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-chalk text-yellow-300 leading-none">{closeSymbol}</span>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-[9px] text-red-400/70 hover:text-red-400 uppercase tracking-tight transition-colors"
        >
          Zrušit
        </button>
      </div>
    );
  }

  // Normální fáze: zobraz první dostupný pár
  return (
    <div
      ref={setNodeRef}
      {...(exhausted ? {} : listeners)}
      {...(exhausted ? {} : attributes)}
      className={`relative overflow-hidden rounded-md border-2 shadow-sm flex items-center justify-center transition-transform
        ${exhausted ? 'opacity-40 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:scale-105'}
      `}
      style={{
        width: FULL_CARD_W,
        height: FULL_CARD_H,
        backgroundColor: `${palette.bgDark}cc`,
        borderColor: exhausted ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
        boxShadow: exhausted ? 'none' : `0 0 10px ${palette.glow}`,
        transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
        zIndex: isDragging ? 99999 : undefined,
      }}
    >
      {exhausted ? (
        <span className="text-[9px] uppercase tracking-tight text-white/30 font-bold text-center px-1">Závorky vyčerpány</span>
      ) : (
        <>
          {cardsDatabase[firstOpen!.symbol]?.image ? (
            <img src={`${BASE}${cardsDatabase[firstOpen!.symbol].image.replace(/^\//, '')}`} alt={firstOpen!.symbol} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-chalk text-white leading-none">{firstOpen!.symbol}</span>
          )}
        </>
      )}
    </div>
  );
}

// ==========================================
// MAIN MOBILE GAME LAYOUT
// ==========================================
interface MobileGameLayoutProps {
  currentPlayer: Player;
  showEffectDebug?: boolean;
  debugEffectRows?: string[];
  state: {
    deck: GameCard[];
    discardPile: GameCard[];
    isDiscarding: boolean;
    hasModifiedBoardThisTurn: boolean;
    bracketMode: { leftInsertPosition: number; pairIndex: number } | null;
    tutorialActive?: boolean;
    tutorialStep?: number;
  };
  actions: {
    checkMathEngine: () => void;
    handleDiscardExpression: () => void;
    handleEndTurn: () => void;
    handleDiscard: (id: string) => void;
    cancelBracketMode: () => void;
    resetTutorial: () => void;
    skipTutorial: () => void;
    openLeaveGameConfirm?: () => void;
    setIntegralVariable: (cardId: string, variable: 'x' | 'y') => void;
    setDerivativeVariable: (cardId: string, variable: 'x' | 'y') => void;
    setSeriesVariable: (cardId: string, variable: 'x' | 'y') => void;
    setLimitVariable: (cardId: string, variable: 'x' | 'y') => void;
  };
  tutorialReferenceBoard?: GameCard[];
}

function TutorialReferenceRow({ cards, palette }: { cards: GameCard[]; palette: ThemePalette }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 rounded-lg px-2 py-1" style={{ background: `${palette.bgDark}aa` }}>
      {cards.map(card => {
        const cardData = cardsDatabase[card.symbol];
        return (
          <div
            key={card.id}
            className={`relative w-7 h-10 rounded border-2 bg-slate-800 flex items-center justify-center origin-center scale-[1.2] ${getBorderColor(card.symbol)}`}
          >
            {cardData?.image ? (
              <img
                src={`${BASE}${cardData.image.replace(/^\//, '')}`}
                alt={card.symbol}
               
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[9px] font-chalk text-white">{card.symbol}</span>
            )}
            {card.exponent && (
              <div className="absolute -top-2 -right-2 w-4 h-5 rounded border border-white/50 bg-slate-900 flex items-center justify-center">
                <span className="text-[8px] font-chalk text-white">{card.exponent.symbol}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MobileGameLayout({ currentPlayer, state, actions, tutorialReferenceBoard, showEffectDebug, debugEffectRows = [] }: MobileGameLayoutProps) {
  const { deck, discardPile, isDiscarding, hasModifiedBoardThisTurn, bracketMode, tutorialActive } = state;
  const palette = getPalette(currentPlayer.theme);
  const canVerify = true;
  const integralVar = findIntegralVariable(currentPlayer.board);
  const hasVsLockedCard = currentPlayer.board.some(card => card.locked && VS_CARD_SYMBOLS.has(card.symbol));
  const integralCard = currentPlayer.board.find(card => card.symbol === 'int');
  const integralLabel = integralCard?.integralVariable === 'y' ? 'dy' : 'dx';
  const showDxDy = Boolean(integralCard);
  const beforeCards = showDxDy ? currentPlayer.board.filter(card => !card.afterDxDy) : currentPlayer.board;
  const afterCards = showDxDy ? currentPlayer.board.filter(card => card.afterDxDy) : [];
  const totalBoardCards = beforeCards.length + afterCards.length;

  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  useDndMonitor({
    onDragStart: () => {
      setIsDraggingCard(true);
      setSelectedHandCardId(null);
    },
    onDragEnd: () => setIsDraggingCard(false),
    onDragCancel: () => setIsDraggingCard(false),
  });

  const handCards = currentPlayer.hand;

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-700"
      onClick={() => setSelectedHandCardId(null)}
      style={{
        background: `linear-gradient(to bottom, ${palette.bgDark} 0%, ${palette.bgMid} 100%)`,
        fontFamily: "'Merienda', cursive",
        color: '#fff',
        minHeight: 'max(884px, 100dvh)',
      }}
    >
      {/* ── NAV ── */}
      <nav
        className="flex items-center p-4 border-b sticky top-0 z-50 justify-between backdrop-blur-md transition-colors duration-700"
        style={{ borderColor: palette.navBorder, background: palette.navBg }}
      >
        <div className="flex items-center gap-2">
          {tutorialActive ? (
            <>
              <button
                onClick={actions.resetTutorial}
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={actions.skipTutorial}
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
              >
                Přeskočit
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                onClick={actions.handleDiscardExpression}
                title="Vymazat tabuli L (spotřebuje tah)"
              >
                <span className="material-symbols-outlined text-3xl">ink_eraser</span>
              </button>

              <div className="relative group/menu">
                <button
                  className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                  onClick={actions.openLeaveGameConfirm}
                >
                  <span className="material-symbols-outlined text-3xl">menu</span>
                </button>
                {showEffectDebug && (
                  <div className="pointer-events-none absolute left-0 top-full mt-2 hidden w-72 max-w-[85vw] rounded-lg border border-emerald-400/30 bg-black/85 p-3 text-[11px] text-emerald-100 shadow-xl backdrop-blur-sm group-hover/menu:block">
                    <div className="mb-1 font-black uppercase tracking-wide text-emerald-300">Aktivní efekty</div>
                    <div className="mb-1 text-emerald-200">Hráč: {currentPlayer.name}</div>
                    {debugEffectRows.length > 0 ? (
                      <ul className="space-y-0.5">
                        {debugEffectRows.map((line) => (
                          <li key={line}>• {line}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-emerald-200/80">Žádné aktivní efekty/statusy.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <span
            className="text-base font-bold tracking-tight ml-2"
            style={{ fontFamily: "'Merienda', cursive" }}
          >
            Math4fun
          </span>
        </div>
        <div className="flex-1" />
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ fontFamily: "'Merienda', cursive" }}
        >
          {currentPlayer.name}
        </h1>
      </nav>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col mx-auto w-full p-2 max-w-4xl gap-2">

        {/* CHALKBOARD — board + target */}
        <section className="relative group">
          <MobileBoardDropZone id="main-board" palette={palette} />
          <div
            className="w-full border-4 shadow-2xl flex items-center justify-center overflow-hidden relative rounded-lg p-4 transition-colors duration-700"
            style={{
              borderColor: `${palette.primary}66`,
              backgroundColor: palette.bgMid,
              backgroundImage: `radial-gradient(circle, ${palette.bgDot} 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
              aspectRatio: '4/3',
              minHeight: '180px',
            }}
          >
            {/* Overlay */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle at center, rgba(200,200,200,0.15) 0%, transparent 70%)' }}
            />

            {/* Board cards */}
            <div className="z-10 flex flex-col items-center gap-2 w-full" style={{ minHeight: '5rem' }}>
              {tutorialReferenceBoard && tutorialReferenceBoard.length > 0 && (
                <TutorialReferenceRow cards={tutorialReferenceBoard} palette={palette} />
              )}
              <div className={`flex items-stretch gap-0 flex-wrap w-full ${(hasVsLockedCard || showDxDy) ? 'justify-start' : 'justify-center'}`}>
              {currentPlayer.board.length === 0 ? (
                <span
                  className="uppercase tracking-[0.2em] text-xl pointer-events-none select-none italic self-center"
                  style={{ color: 'rgba(255,255,255,0.12)' }}
                >
                  Tabule
                </span>
              ) : (
                <>
                  <div className="flex items-stretch gap-0 flex-wrap">
                    {hasVsLockedCard && (
                      <div className="shrink-0" style={{ width: `calc(${BOARD_CARD_W} - 0.9rem)`, height: BOARD_CARD_H }} />
                    )}
                    {/* Kurzor před první kartou */}
                    <BoardDropZone id="main-board-before-0" isVisible={isDraggingCard || !!tutorialActive} />
                    {beforeCards.map((card, index) => (
                      <React.Fragment key={card.id}>
                        <div className="flex flex-col items-center">
                          <DraggableBoardCard
                            card={card}
                            palette={palette}
                            hasModifiedBoardThisTurn={hasModifiedBoardThisTurn}
                            onDerivativeVariableChange={actions.setDerivativeVariable}
                            onSeriesVariableChange={actions.setSeriesVariable}
                            onLimitVariableChange={actions.setLimitVariable}
                          />
                        </div>
                        {/* Kurzor za každou kartou */}
                        <BoardDropZone
                          id={`main-board-between-${index}-${index + 1}`}
                          isVisible={isDraggingCard || !!tutorialActive}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                  {showDxDy && (
                    <div className="flex items-stretch gap-0 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVar = integralCard!.integralVariable === 'y' ? 'x' : 'y';
                          actions.setIntegralVariable(integralCard!.id, nextVar);
                        }}
                        className="rounded-md border-2 shadow-md flex items-center justify-center bg-slate-900/90 text-white font-black"
                        style={{
                          width: BOARD_CARD_W,
                          height: BOARD_CARD_H,
                          borderColor: 'rgba(255,255,255,0.4)',
                          backgroundColor: `${palette.bgDark}cc`,
                          zIndex: 20,
                        }}
                      >
                        <span className="text-[10px] font-black">{integralLabel}</span>
                      </button>
                      <BoardDropZone id={`main-board-after-dxdy-${beforeCards.length}`} isVisible={isDraggingCard || !!tutorialActive} />
                      {afterCards.map((card, index) => {
                        const globalIndex = beforeCards.length + index;
                        return (
                          <React.Fragment key={card.id}>
                            <div className="flex flex-col items-center">
                              <DraggableBoardCard
                                card={card}
                                palette={palette}
                                hasModifiedBoardThisTurn={hasModifiedBoardThisTurn}
                                onDerivativeVariableChange={actions.setDerivativeVariable}
                                onSeriesVariableChange={actions.setSeriesVariable}
                                onLimitVariableChange={actions.setLimitVariable}
                              />
                            </div>
                            <BoardDropZone
                              id={globalIndex < totalBoardCards - 1
                                ? `main-board-between-${globalIndex}-${globalIndex + 1}`
                                : `main-board-after-${totalBoardCards - 1}`}
                              isVisible={isDraggingCard || !!tutorialActive}
                            />
                          </React.Fragment>
                        );
                      })}
                      <div className="shrink-0 pointer-events-none" style={{ width: BOARD_CARD_W, height: BOARD_CARD_H }} />
                    </div>
                  )}
                </>
              )}
              </div>
            </div>

            {/* Target R */}
            <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
              {integralVar && !integralCard && (
                <div className="rounded-md border-2 border-white/30 bg-slate-900/85 px-3 py-1 text-sm font-black text-white shadow-lg">
                  d{integralVar}
                </div>
              )}
              <div
                className="flex items-center gap-2 backdrop-blur-sm p-2 rounded-lg border border-white/20"
                style={{ background: 'rgba(0,0,0,0.30)' }}
              >
                <span className="text-xl font-bold text-white">=</span>
                <span className="text-3xl font-black text-white px-1">{currentPlayer.targetR}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ACTION BUTTONS */}
        <section className="flex flex-col items-center gap-3">
          <div className="flex gap-3 w-full">
            <button
              onClick={actions.checkMathEngine}
              disabled={!canVerify}
              className="flex-1 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: canVerify ? palette.primary : `${palette.primary}55`,
                color: '#fff',
                fontFamily: "'Merienda', cursive",
                boxShadow: canVerify ? `0 0 18px ${palette.glow}` : 'none',
              }}
            >
              <span className="material-symbols-outlined text-lg">verified</span>
              Ověřit (Q.E.D.)
            </button>

            <button
              onClick={actions.handleEndTurn}
              className="flex-1 font-bold py-4 rounded-xl border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{
                background: 'rgba(30,41,59,0.9)',
                color: '#cbd5e1',
                fontFamily: "'Merienda', cursive",
              }}
            >
              <span className="material-symbols-outlined text-lg">hourglass_empty</span>
              {isDiscarding ? 'Hotovo' : 'Ukončit tah'}
            </button>
          </div>
        </section>

        {/* UTILITY CARD ROW */}
        <section className="flex justify-center gap-4 px-4 py-2">

          {/* Závorky */}
          <BracketCard
            syntax={currentPlayer.syntax}
            bracketMode={bracketMode}
            palette={palette}
            onCancel={actions.cancelBracketMode}
          />

          {/* Discard zone */}
          <MobileDiscardSlot discardCount={discardPile.length} isDiscarding={isDiscarding} palette={palette} />

          {/* Draw pile */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-md shadow-lg border-2 border-white/40 relative overflow-hidden flex flex-col items-center justify-center transition-colors duration-700"
              style={{
                width: FULL_CARD_W,
                height: FULL_CARD_H,
                backgroundColor: palette.primary,
              }}
            >
              <img
                src={`${BASE}svg/zada.svg`}
                alt="Rub karty"
                className="w-full h-full object-cover"
                draggable={false}
              />
              <span className="absolute bottom-1.5 rounded-full border border-white/30 bg-slate-900/90 px-1.5 py-0.5 text-[10px] uppercase tracking-tighter text-white font-bold">
                Přidat ({deck.length})
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER (hand fan) ── */}
      <footer
        className="mt-auto pb-4 pt-2 px-4 transition-colors duration-700"
        style={{ background: `linear-gradient(to top, ${palette.footerBg} 0%, transparent 100%)` }}
      >
        <div className="relative h-44 max-w-lg mx-auto flex justify-center items-end select-none" style={{ transform: 'translateY(-110px)' }}>
          {handCards.map((card, index) => (
            <MiniHandCard
              key={card.id}
              card={card}
              index={index}
              total={handCards.length}
              isDiscarding={isDiscarding}
              onDiscard={actions.handleDiscard}
              onSelect={(id) => setSelectedHandCardId(prev => (prev === id ? null : id))}
              isSelected={selectedHandCardId === card.id}
              palette={palette}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
