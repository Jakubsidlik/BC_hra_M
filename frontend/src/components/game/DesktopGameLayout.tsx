import React, { useState } from 'react';
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cardsDatabase } from '@/data/cardsDB';
import { getBorderColor, getSpecialSlots } from '@/lib/gameHelpers';
import { BoardDropZone, type SlotDropData } from '@/components/game/Cards';
import type { GameCard, Player } from '@/lib/effects';

const BASE = import.meta.env.BASE_URL;

// ==========================================
// THEME → CSS COLORS (shared palette map)
// ==========================================
interface ThemePalette {
  primary: string;
  bgDark: string;
  bgMid: string;
  bgDot: string;
  navBg: string;
  navBorder: string;
  footerBg: string;
  glow: string;
}

const THEME_PALETTES: Record<string, ThemePalette> = {
  'bg-violet-600/60': { primary: '#7c3aed', bgDark: '#1e0a38', bgMid: '#2e1a5a', bgDot: '#3d2570', navBg: 'rgba(30,10,56,0.75)', navBorder: 'rgba(124,58,237,0.25)', footerBg: '#1e0a38', glow: 'rgba(124,58,237,0.5)' },
  'bg-emerald-600/60': { primary: '#059669', bgDark: '#052e16', bgMid: '#1a4731', bgDot: '#2d5a44', navBg: 'rgba(5,46,22,0.75)', navBorder: 'rgba(5,150,105,0.25)', footerBg: '#052e16', glow: 'rgba(5,150,105,0.5)' },
  'bg-blue-600/60': { primary: '#2563eb', bgDark: '#0f172a', bgMid: '#1e3a6a', bgDot: '#2a4d8a', navBg: 'rgba(15,23,42,0.75)', navBorder: 'rgba(37,99,235,0.25)', footerBg: '#0f172a', glow: 'rgba(37,99,235,0.5)' },
  'bg-rose-600/60': { primary: '#e11d48', bgDark: '#2d0a14', bgMid: '#4c1a28', bgDot: '#6b2438', navBg: 'rgba(45,10,20,0.75)', navBorder: 'rgba(225,29,72,0.25)', footerBg: '#2d0a14', glow: 'rgba(225,29,72,0.5)' },
  'bg-pink-600/60': { primary: '#db2777', bgDark: '#2a0a1e', bgMid: '#4a1738', bgDot: '#6b2350', navBg: 'rgba(42,10,30,0.75)', navBorder: 'rgba(219,39,119,0.25)', footerBg: '#2a0a1e', glow: 'rgba(219,39,119,0.5)' },
  'bg-amber-500/60': { primary: '#d97706', bgDark: '#27160a', bgMid: '#4a2e14', bgDot: '#6b4020', navBg: 'rgba(39,22,10,0.75)', navBorder: 'rgba(217,119,6,0.25)', footerBg: '#27160a', glow: 'rgba(217,119,6,0.5)' },
  'bg-cyan-600/60': { primary: '#0891b2', bgDark: '#0a1f2e', bgMid: '#1a3a50', bgDot: '#254f6a', navBg: 'rgba(10,31,46,0.75)', navBorder: 'rgba(8,145,178,0.25)', footerBg: '#0a1f2e', glow: 'rgba(8,145,178,0.5)' },
  'bg-orange-600/60': { primary: '#ea580c', bgDark: '#2a1008', bgMid: '#4a2214', bgDot: '#6b3420', navBg: 'rgba(42,16,8,0.75)', navBorder: 'rgba(234,88,12,0.25)', footerBg: '#2a1008', glow: 'rgba(234,88,12,0.5)' },
};

function getDesktopPalette(themeId: string): ThemePalette {
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

// Desktop card dimensions (larger than mobile/tablet)
const CARD_W = '8.35rem';
const CARD_H = '12.81rem';
const BOARD_CARD_W = '5.15rem';
const BOARD_CARD_H = '7.9rem';
const VS_CARD_SYMBOLS = new Set(['int', 'd/dx', '∑', '∏', 'lim']);

// ==========================================
// DESKTOP HAND CARD (fan footer)
// ==========================================
interface DesktopHandCardProps {
  card: GameCard;
  index: number;
  total: number;
  isDiscarding: boolean;
  onDiscard?: (id: string) => void;
  palette: ThemePalette;
}

function DesktopSlotValueCard({ slotCard }: { slotCard: GameCard }) {
  const slotCardData = cardsDatabase[slotCard.symbol];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slotCard.id,
    data: slotCard,
    disabled: !!slotCard.locked,
  });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 99999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onPointerDown={(event) => event.stopPropagation()}
      className={`w-full h-full rounded-md border-2 flex items-center justify-center bg-slate-800 shadow-xl cursor-grab active:cursor-grabbing ${getBorderColor(slotCard.symbol)} ${isDragging ? 'ring-2 ring-white/70 scale-105' : ''}`}
    >
      <div className="w-full h-full flex items-center justify-center p-1 pointer-events-none">
        {slotCardData?.image ? (
          <img src={`${BASE}${slotCardData.image.replace(/^\//, '')}`} alt={slotCard.symbol} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-black text-white">{slotCard.symbol}</span>
        )}
      </div>
    </div>
  );
}

function DesktopHandCard({ card, index, total, isDiscarding, onDiscard, palette }: DesktopHandCardProps) {
  const cardData = cardsDatabase[card.symbol];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: card,
  });

  // Fan offsets from the mockup (5-card spread); generalise for any count
  const midpoint = (total - 1) / 2;
  const d = index - midpoint;
  const rotationStep = 12;
  const xStep = 60;
  // Y: centre card lifted most (-75px), outer cards less lifted (-50px), interpolated
  const yBase = -75;
  const yOuter = -50;
  const normalised = Math.abs(d) / Math.max(midpoint, 1);
  const translateYVal = isDragging ? 0 : yBase + (yOuter - yBase) * normalised;
  const translateXVal = isDragging ? 0 : d * xStep;
  const rotation = isDragging ? 0 : d * rotationStep;

  const style: React.CSSProperties = {
    transform: transform
      ? CSS.Translate.toString(transform)
      : `rotate(${rotation}deg) translateX(${translateXVal}px) translateY(${translateYVal}px)`,
    zIndex: isDragging ? 99999 : 10 + index,
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    bottom: 0,
    left: '50%',
    marginLeft: `calc(-${CARD_W} / 2)`,
    backgroundColor: palette.bgMid,
    borderColor: isDragging ? palette.primary : `${palette.primary}66`,
    boxShadow: isDragging ? `0 0 30px ${palette.glow}` : undefined,
  };

  const borderColor = getBorderColor(card.symbol);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => isDiscarding && onDiscard && onDiscard(card.id)}
      style={style}
      className={`rounded-md border-2 shadow-xl select-none overflow-hidden
        transition-all duration-200 origin-bottom
        ${isDragging ? 'scale-110 ring-2 ring-white/30' : ''}
        ${isDiscarding
          ? 'cursor-pointer border-red-500! animate-pulse'
          : 'cursor-grab active:cursor-grabbing hover:-translate-y-4'}
        ${borderColor}
      `}
    >
      <div className="w-full h-full flex items-center justify-center">
        {cardData?.image ? (
          <img src={`${BASE}${cardData.image.replace(/^\//, '')}`} alt={card.symbol} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl font-black text-white">{card.symbol}</span>
        )}
      </div>
    </div>
  );
}

// ==========================================
// DESKTOP DISCARD ZONE
// ==========================================
function DesktopDiscardSlot({ discardCount, isDiscarding, palette }: { discardCount: number; isDiscarding: boolean; palette: ThemePalette }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'drop-discard' });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: CARD_W,
        height: CARD_H,
        backgroundColor: isOver ? 'rgba(127,29,29,0.8)' : `${palette.bgMid}aa`,
        borderColor: isOver ? '#ef4444' : 'rgba(255,255,255,0.3)',
      }}
      className={`rounded-md border-2 shadow-inner relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300
        ${isOver ? 'scale-105' : ''}
        ${isDiscarding && !isOver ? 'animate-pulse ring-4 ring-red-500/50' : ''}
      `}
    >
      <div className="absolute inset-0 rotate-12 translate-y-2" style={{ background: `${palette.primary}0d` }} />
      <span className="material-symbols-outlined text-3xl text-white/40 relative z-10">delete</span>
      <span className="text-[11px] uppercase tracking-tighter text-white/50 font-bold mt-2 relative z-10">
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
// DESKTOP DRAGGABLE BOARD CARD
// ==========================================
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
  const hasTwoSlots = slotKeys.length === 2;
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

  const isSlotOver = isOverTop || isOverBottom || isOverWhole || isOverUl || isOverUr || isOverLl || isOverLr;

  const style: React.CSSProperties = {
    width: isVsCard ? CARD_W : BOARD_CARD_W,
    height: isVsCard ? CARD_H : BOARD_CARD_H,
    backgroundColor: `${palette.bgDark}cc`,
    borderColor: isDragging ? palette.primary : 'rgba(255,255,255,0.25)',
    transform: transform
      ? `${CSS.Translate.toString(transform)}${isSlotOver ? ' scale(2)' : ''}`
      : (isSlotOver ? 'scale(2)' : undefined),
    zIndex: isDragging ? 99999 : undefined,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 0 24px rgba(255,255,255,0.85)' : undefined,
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
        if (!isDragging && (hasOneSlot || hasTwoSlots || hasFourSlots)) {
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
          className="absolute z-20 right-1 top-1 origin-top-right scale-[2] rounded-full border border-white/30 bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-black text-white"
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
          className="absolute z-20 right-1 top-1 origin-top-right scale-[2] rounded-full border border-white/30 bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-black text-white"
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
          className="absolute z-20 right-1 top-1 origin-top-right scale-[2] rounded-full border border-white/30 bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-black text-white"
        >
          {limitVar}
        </button>
      )}
      {hasFourSlots && (
        <>
          <div
            ref={setUlRef}
            className="absolute left-0 top-0 w-1/2 h-1/2 rounded-tl-md pointer-events-auto"
            style={isOverUl ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setUrRef}
            className="absolute right-0 top-0 w-1/2 h-1/2 rounded-tr-md pointer-events-auto"
            style={isOverUr ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setLlRef}
            className="absolute left-0 bottom-0 w-1/2 h-1/2 rounded-bl-md pointer-events-auto"
            style={isOverLl ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setLrRef}
            className="absolute right-0 bottom-0 w-1/2 h-1/2 rounded-br-md pointer-events-auto"
            style={isOverLr ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
        </>
      )}
      {hasTwoSlots && (
        <>
          <div
            ref={setTopSlotRef}
            className="absolute left-0 right-0 top-0 h-1/2 rounded-t-md pointer-events-auto"
            style={isOverTop ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setBottomSlotRef}
            className="absolute left-0 right-0 bottom-0 h-1/2 rounded-b-md pointer-events-auto"
            style={isOverBottom ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
        </>
      )}
      {hasOneSlot && (
        <div
          ref={setWholeSlotRef}
          className="absolute inset-0 rounded-md pointer-events-auto"
          style={isOverWhole ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
        />
      )}

      {!isDragging && isExpanded && hasFourSlots && (
        <>
          {ulKey && card.slotCards?.[ulKey] && (
            <div className="absolute" style={{ left: '20%', top: '-12%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0, width: BOARD_CARD_W, height: BOARD_CARD_H }}>
              <DesktopSlotValueCard slotCard={card.slotCards[ulKey]!} />
            </div>
          )}
          {urKey && card.slotCards?.[urKey] && (
            <div className="absolute" style={{ left: '80%', top: '-12%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0, width: BOARD_CARD_W, height: BOARD_CARD_H }}>
              <DesktopSlotValueCard slotCard={card.slotCards[urKey]!} />
            </div>
          )}
          {llKey && card.slotCards?.[llKey] && (
            <div className="absolute" style={{ left: '20%', top: '88%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0, width: BOARD_CARD_W, height: BOARD_CARD_H }}>
              <DesktopSlotValueCard slotCard={card.slotCards[llKey]!} />
            </div>
          )}
          {lrKey && card.slotCards?.[lrKey] && (
            <div className="absolute" style={{ left: '80%', top: '88%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0, width: BOARD_CARD_W, height: BOARD_CARD_H }}>
              <DesktopSlotValueCard slotCard={card.slotCards[lrKey]!} />
            </div>
          )}
        </>
      )}
      {!isDragging && isExpanded && hasTwoSlots && (
        <>
          {topSlotKey && card.slotCards?.[topSlotKey] && (
            <div className="absolute left-1/2" style={{ top: '-10%', transform: 'translateX(-50%) scale(0.9)', zIndex: 0, width: BOARD_CARD_W, height: BOARD_CARD_H }}>
              <DesktopSlotValueCard slotCard={card.slotCards[topSlotKey]!} />
            </div>
          )}
          {bottomSlotKey && card.slotCards?.[bottomSlotKey] && (
            <div className="absolute left-1/2" style={{ top: '86%', transform: 'translateX(-50%) scale(0.9)', zIndex: 0, width: BOARD_CARD_W, height: BOARD_CARD_H }}>
              <DesktopSlotValueCard slotCard={card.slotCards[bottomSlotKey]!} />
            </div>
          )}
        </>
      )}

      {!isDragging && isExpanded && hasOneSlot && card.slotCards?.[slotKeys[0]] && (
        <div className="absolute left-1/2" style={{ top: '-10%', transform: 'translateX(-50%) scale(0.9)', zIndex: 0, width: BOARD_CARD_W, height: BOARD_CARD_H }}>
          <DesktopSlotValueCard slotCard={card.slotCards[slotKeys[0]]!} />
        </div>
      )}
      {cardData?.image ? (
        <img src={`${BASE}${cardData.image.replace(/^\//, '')}`} alt={card.symbol} className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <span className="text-3xl font-black text-white">{card.symbol}</span>
      )}
    </div>
  );
}

// ==========================================
// DESKTOP BOARD DROP ZONE
// ==========================================
function DesktopBoardDropZone({ id, palette }: { id: string; palette: ThemePalette }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="absolute inset-0 rounded-lg transition-all duration-300 z-10"
      style={isOver ? { background: `${palette.primary}18`, boxShadow: `inset 0 0 0 3px ${palette.primary}80` } : {}}
    />
  );
}

// ==========================================
// BRACKET KARTA
// ==========================================
function BracketCard({ syntax, bracketMode, palette, onCancel }: {
  syntax: GameCard[];
  bracketMode: { leftInsertPosition: number; pairIndex: number } | null;
  palette: ThemePalette;
  onCancel: () => void;
}) {
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

  if (bracketMode) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          ref={setNodeRef} {...listeners} {...attributes}
          className="relative overflow-hidden rounded-md border-2 border-yellow-400/80 shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            width: CARD_W, height: CARD_H,
            backgroundColor: isDragging ? `${palette.bgDark}cc` : `${palette.bgMid}dd`,
            boxShadow: '0 0 12px rgba(250,204,21,0.5)',
            transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
            zIndex: isDragging ? 99999 : undefined,
          }}
        >
          {closeCardData?.image ? (
            <img src={`${BASE}${closeCardData.image.replace(/^\//, '')}`} alt={closeSymbol ?? undefined} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-black text-yellow-300 leading-none">{closeSymbol}</span>
          )}
        </div>
        <button onClick={onCancel} className="text-[9px] text-red-400/70 hover:text-red-400 uppercase tracking-tight">
          Zrušit
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...(exhausted ? {} : listeners)}
      {...(exhausted ? {} : attributes)}
      className={`relative overflow-hidden rounded-md border-2 shadow-sm flex items-center justify-center transition-transform
        ${exhausted ? 'opacity-40 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:scale-105'}`}
      style={{
        width: CARD_W, height: CARD_H,
        backgroundColor: `${palette.bgDark}cc`,
        borderColor: exhausted ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
        boxShadow: exhausted ? 'none' : `0 0 14px ${palette.glow}`,
        transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
        zIndex: isDragging ? 99999 : undefined,
      }}
    >
      {exhausted
        ? <span className="text-[9px] uppercase tracking-tight text-white/30 font-bold text-center px-1">Závorky vyčerpány</span>
        : <>
          {cardsDatabase[firstOpen!.symbol]?.image ? (
            <img src={`${BASE}${cardsDatabase[firstOpen!.symbol].image.replace(/^\//, '')}`} alt={firstOpen!.symbol} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-black text-white leading-none">{firstOpen!.symbol}</span>
          )}
        </>
      }
    </div>
  );
}

// ==========================================
// MAIN DESKTOP GAME LAYOUT
// ==========================================
interface DesktopGameLayoutProps {
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
    <div className="flex flex-wrap items-center justify-center gap-1 rounded-lg px-3 py-2" style={{ background: `${palette.bgDark}aa` }}>
      {cards.map(card => {
        const cardData = cardsDatabase[card.symbol];
        return (
          <div
            key={card.id}
            className={`relative w-12 h-16 rounded-md border-2 bg-slate-800 flex items-center justify-center ${getBorderColor(card.symbol)}`}
          >
            {cardData?.image ? (
              <img
                src={`${BASE}${cardData.image.replace(/^\//, '')}`}
                alt={card.symbol}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-black text-white">{card.symbol}</span>
            )}
            {card.exponent && (
              <div className="absolute -top-2 -right-2 w-6 h-8 rounded border border-white/50 bg-slate-900 flex items-center justify-center">
                <span className="text-[10px] font-black text-white">{card.exponent.symbol}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DesktopGameLayout({ currentPlayer, state, actions, tutorialReferenceBoard, showEffectDebug, debugEffectRows = [] }: DesktopGameLayoutProps) {
  const { deck, discardPile, isDiscarding, hasModifiedBoardThisTurn, bracketMode, tutorialActive, tutorialStep } = state;
  const palette = getDesktopPalette(currentPlayer.theme);
  const canVerify = tutorialActive ? tutorialStep === 4 : !hasModifiedBoardThisTurn;
  const integralVar = findIntegralVariable(currentPlayer.board);
  const hasVsLockedCard = currentPlayer.board.some(card => card.locked && VS_CARD_SYMBOLS.has(card.symbol));
  const integralCard = currentPlayer.board.find(card => card.symbol === 'int');
  const integralLabel = integralCard?.integralVariable === 'y' ? 'dy' : 'dx';
  const showDxDy = Boolean(integralCard);
  const beforeCards = showDxDy ? currentPlayer.board.filter(card => !card.afterDxDy) : currentPlayer.board;
  const afterCards = showDxDy ? currentPlayer.board.filter(card => card.afterDxDy) : [];
  const totalBoardCards = beforeCards.length + afterCards.length;

  const [isDraggingCard, setIsDraggingCard] = useState(false);
  useDndMonitor({
    onDragStart: () => setIsDraggingCard(true),
    onDragEnd: () => setIsDraggingCard(false),
    onDragCancel: () => setIsDraggingCard(false),
  });

  const handCards = currentPlayer.hand;

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-700"
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
                className="text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={actions.skipTutorial}
                className="text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
              >
                Přeskočit
              </button>
            </>
          ) : (
            <div className="relative group/menu">
              <button
                className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                onClick={actions.openLeaveGameConfirm}
              >
                <span className="material-symbols-outlined text-3xl">menu</span>
              </button>
              {showEffectDebug && (
                <div className="pointer-events-none absolute left-0 top-full mt-2 hidden w-80 max-w-[70vw] rounded-lg border border-emerald-400/30 bg-black/85 p-3 text-[11px] text-emerald-100 shadow-xl backdrop-blur-sm group-hover/menu:block">
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
          )}
          <span
            className="text-base font-bold tracking-tight ml-2"
            style={{ fontFamily: "'Merienda', cursive" }}
          >
            Math4fun
          </span>
        </div>
        <div className="flex-1" />
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Merienda', cursive" }}>
          {currentPlayer.name}
        </h1>
      </nav>

      {/* ── MAIN ── */}
      {/* Desktop: max-w-[90vw] téměř přes celou šířku, pt-0, gap-4 */}
      <main className="flex-1 flex flex-col mx-auto w-full px-6 max-w-[90vw] pt-0 gap-4">

        {/* CHALKBOARD — aspect-[21/9] ultra-wide for desktop */}
        <section className="relative group">
          <DesktopBoardDropZone id="main-board" palette={palette} />
          <div
            className="w-full border-4 shadow-2xl flex items-center justify-center overflow-hidden relative rounded-lg p-4 transition-colors duration-700"
            style={{
              borderColor: `${palette.primary}66`,
              backgroundColor: palette.bgMid,
              backgroundImage: `radial-gradient(circle, ${palette.bgDot} 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
              aspectRatio: '21 / 6.3',
              minHeight: '154px',
            }}
          >
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle at center, rgba(200,200,200,0.15) 0%, transparent 70%)' }}
            />

            {/* Board cards */}
            <div className="z-10 flex flex-col items-center gap-3 w-full" style={{ minHeight: '6rem' }}>
              {tutorialReferenceBoard && tutorialReferenceBoard.length > 0 && (
                <TutorialReferenceRow cards={tutorialReferenceBoard} palette={palette} />
              )}
              <div className={`flex items-stretch gap-0 flex-wrap w-full ${(hasVsLockedCard || showDxDy) ? 'justify-start' : 'justify-center'}`}>
              {currentPlayer.board.length === 0 ? (
                <span
                  className="uppercase tracking-[0.25em] text-2xl pointer-events-none select-none italic self-center"
                  style={{ color: 'rgba(255,255,255,0.10)' }}
                >
                  Tabule
                </span>
              ) : (
                <>
                  <div className="flex items-stretch gap-0 flex-wrap">
                    {hasVsLockedCard && (
                      <div className="shrink-0" style={{ width: `calc(${BOARD_CARD_W} - 0.9rem)`, height: BOARD_CARD_H }} />
                    )}
                    <BoardDropZone id="main-board-before-0" isVisible={isDraggingCard} />
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
                        <BoardDropZone
                          id={`main-board-between-${index}-${index + 1}`}
                          isVisible={isDraggingCard}
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
                        <span className="text-2xl font-black">{integralLabel}</span>
                      </button>
                      <BoardDropZone id={`main-board-after-dxdy-${beforeCards.length}`} isVisible={isDraggingCard} />
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
                              isVisible={isDraggingCard}
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

            {/* Target R — scaled up as per mockup */}
            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
              {integralVar && !integralCard && (
                <div
                  className="flex items-center justify-center rounded-md border-2 border-white/30 bg-slate-900/85 px-4 py-2 text-white font-black shadow-lg"
                  style={{ transform: 'scale(1.1)' }}
                >
                  d{integralVar}
                </div>
              )}
              <div
                className="flex items-center gap-2 backdrop-blur-sm p-2 rounded-lg border border-white/20 origin-bottom-right"
                style={{
                  background: 'rgba(0,0,0,0.20)',
                  transform: 'scale(1.32)',
                  transformOrigin: 'bottom right',
                  padding: '1.2rem',
                  borderRadius: '0.75rem',
                }}
              >
                <span className="text-2xl font-bold text-white">=</span>
                <span className="text-4xl font-black text-white px-2">{currentPlayer.targetR}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ACTION BUTTONS — Q.E.D. fixed 7.26rem, End Turn fixed 15.5rem, justify-between */}
        <section className="flex flex-col items-center w-full">
          <div className="flex justify-between w-full">
            <button
              onClick={actions.checkMathEngine}
              disabled={!canVerify}
              className="font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                width: '7.26rem',
                background: canVerify ? palette.primary : `${palette.primary}55`,
                color: '#fff',
                fontFamily: "'Merienda', cursive",
                boxShadow: canVerify ? `0 0 20px ${palette.glow}` : 'none',
              }}
            >
              <span className="material-symbols-outlined text-lg">verified</span>
              Ověřit (Q.E.D.)
            </button>

            <button
              onClick={actions.handleEndTurn}
              className="font-bold py-4 rounded-xl border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{
                width: '15.5rem',
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

        {/* UTILITY ROW — modifier LEFT, discard+draw RIGHT (justify-between), larger cards */}
        <section className="flex justify-between w-full">

          {/* Závorky */}
          <BracketCard
            syntax={currentPlayer.syntax}
            bracketMode={bracketMode}
            palette={palette}
            onCancel={actions.cancelBracketMode}
          />

          {/* Discard + Draw — right */}
          <div className="flex gap-3">
            <DesktopDiscardSlot discardCount={discardPile.length} isDiscarding={isDiscarding} palette={palette} />

            <div className="flex flex-col items-center">
              <div
                className="rounded-md shadow-lg border-2 border-white/40 relative overflow-hidden flex flex-col items-center justify-center transition-colors duration-700"
                style={{ width: CARD_W, height: CARD_H, backgroundColor: palette.primary }}
              >
                <img
                  src={`${BASE}svg/zada.svg`}
                  alt="Rub karty"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                <span className="absolute bottom-2 rounded-full border border-white/30 bg-slate-900/90 px-2 py-0.5 text-[11px] uppercase tracking-tighter text-white font-bold">
                  Přidat ({deck.length})
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER (hand fan) — desktop: pb-44, cards larger & higher ── */}
      <footer
        className="mt-auto pb-20 pt-2 px-4 transition-colors duration-700"
        style={{ background: `linear-gradient(to top, ${palette.footerBg} 0%, transparent 100%)` }}
      >
        {/* translateY(-110px) to lift the whole fan up as in the mockup */}
        <div
          className="relative max-w-lg mx-auto flex justify-center items-end h-48 select-none"
          style={{ transform: 'translateY(-200px)' }}
        >
          {handCards.map((card, index) => (
            <DesktopHandCard
              key={card.id}
              card={card}
              index={index}
              total={handCards.length}
              isDiscarding={isDiscarding}
              onDiscard={actions.handleDiscard}
              palette={palette}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
