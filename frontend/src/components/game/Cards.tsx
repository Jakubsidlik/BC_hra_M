import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';
import React from 'react';
import { cardsDatabase } from '@/data/cardsDB';
import { getBorderColor, getSpecialSlots } from '@/lib/gameHelpers';
import type { GameCard } from '@/lib/effects';

const BASE = import.meta.env.BASE_URL;

export interface DropData {
  parentId: string;
}

export interface SlotDropData {
  parentId: string;
  slotKey: string;
}

// --- INTERFACY PRO PROPS ---
interface BoardAreaProps {
  id: string;
  cards: GameCard[];
  targetR?: number | string;
  playerTheme?: string;
  isTargeting?: boolean;
  onCardClick?: (id: string) => void;
  onIntegralVariableChange?: (cardId: string, variable: 'x' | 'y') => void;
  absoluteValue?: boolean; // Pro zobrazení |L|
  bracketMode?: { step: 'LEFT' | 'RIGHT', leftIndex: number | null, pairIndex?: number } | null;
}

interface BoardCardProps {
  card: GameCard;
  isTargeting?: boolean;
  onCardClick?: (id: string) => void;
  onIntegralVariableChange?: (cardId: string, variable: 'x' | 'y') => void;
  absoluteValue?: boolean; // Pro vizuální zobrazení | | kolem karet
}

interface BoardDropZoneProps {
  id: string;
  isVisible: boolean;
}

// ==========================================
// DROP ZÓNA MEZI KARTAMI — SVISLÝ KURZOR
// ==========================================
export function BoardDropZone({ id, isVisible }: BoardDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const showCursor = isOver;

  return (
    <div
      ref={setNodeRef}
      className="flex items-stretch justify-center shrink-0 self-stretch"
      style={{
        width: '0.9rem',
        minHeight: '5rem',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 150ms ease',
        paddingTop: '0.5rem',
        paddingBottom: '0.5rem',
      }}
    >
      <div
        className="mx-auto rounded-full flex-1"
        style={{
          width: '2px',
          background: showCursor ? 'rgba(255,255,255,0.95)' : 'transparent',
          boxShadow: showCursor ? '0 0 10px rgba(255,255,255,0.8)' : 'none',
          transition: 'all 120ms ease',
          minHeight: '4rem',
        }}
      />
    </div>
  );
}

interface HandCardProps {
  card: GameCard;
  index: number;
  total: number;
  isDiscarding?: boolean;    // Režim vyhazování karet
  onDiscard?: (id: string) => void; // Callback pro vyhození kliknutím (volitelné)
}

// ==========================================
// 1. KARTA V RUCE (S PODPOROU OBRÁZKŮ A ODHOZOVÁNÍ)
// ==========================================
export function HandCard({ card, index, total, isDiscarding, onDiscard }: HandCardProps) {
  const cardData = cardsDatabase[card.symbol];

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: card,
    // disabled zde NESMÍ být, aby karta šla přetáhnout na odhazovací pole!
  });

  // VÝPOČET VĚJÍŘE
  const midpoint = (total - 1) / 2;
  const distanceFromCenter = index - midpoint;

  const rotation = isDragging ? 0 : distanceFromCenter * 6;
  const translateY = isDragging ? 0 : Math.abs(distanceFromCenter) * 4;
  const translateX = isDragging ? 0 : distanceFromCenter * 2;

  const style = {
    transform: transform
      ? CSS.Translate.toString(transform)
      : `rotate(${rotation}deg) translateY(${translateY}px) translateX(${translateX}px)`,
    zIndex: isDragging ? 99999 : 10 + index,
    opacity: 1,
  };

  const borderColor = getBorderColor(card.symbol);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => isDiscarding && onDiscard && onDiscard(card.id)}
      style={style}
      className={`relative w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 transition-all duration-200 origin-bottom bg-slate-800 shadow-xl
        ${isDragging ? 'scale-110 shadow-[0_0_25px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/50 rotate-0' : ''}
        ${isDiscarding
          ? 'cursor-pointer border-red-500 hover:scale-105 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-2 ring-red-600/15 animate-pulse'
          : 'cursor-grab active:cursor-grabbing hover:-translate-y-8 hover:z-50 hover:scale-105'}
        ${borderColor}
      `}
    >
      {isDiscarding && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold z-30 shadow-lg uppercase whitespace-nowrap">
          Táhni na odhazovací pole
        </div>
      )}

      <div className="w-full h-full flex items-center justify-center p-2 pointer-events-none">
        {cardData?.image ? (
          <img
            src={`${BASE}${cardData.image.replace(/^\//, '')}`}
            alt={card.symbol}
            className="w-full h-full object-contain drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]"
          />
        ) : (
          <span className="text-3xl font-chalk text-white drop-shadow-md">{card.symbol}</span>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. KARTA POLOŽENÁ NA STOLE (L)
// ==========================================
export function BoardCard({ card, isTargeting, onCardClick, onIntegralVariableChange, absoluteValue }: BoardCardProps) {
  const cardData = cardsDatabase[card.symbol];
  const borderColor = getBorderColor(card.symbol);
  const specialSlots = getSpecialSlots(card.symbol);
  const slotKeys = specialSlots.map(slot => slot.key);
  const hasFourSlots = slotKeys.length === 4;
  const hasTwoSlots = slotKeys.length === 2;
  const hasOneSlot = slotKeys.length === 1;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isIntegralMenuOpen, setIsIntegralMenuOpen] = useState(false);
  const isIntegralCard = card.symbol === 'int';
  const integralVar = card.integralVariable === 'y' ? 'y' : 'x';
  const integralLabel = integralVar === 'y' ? 'dy' : 'dx';

  // Zóna pro vhození exponentu
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-exponent-${card.id}`,
    data: { parentId: card.id } as DropData,
  });

  // NOVÉ: Možnost kartu chytit z plochy a odhodit na odhazovací pole (kaskádové mazání)
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: isTargeting || card.locked // Nelze tahat, pokud zrovna na něco cílíš efektem
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

  const translate = transform ? CSS.Translate.toString(transform) : '';
  const scale = isSlotOver ? ' scale(2)' : '';
  const style = {
    transform: `${translate}${scale}`.trim() || undefined,
    zIndex: isDragging ? 9999 : 1,
    opacity: 1,
  };

  const handleClick = () => {
    if (isTargeting && onCardClick) {
      onCardClick(card.id);
      return;
    }
    if ((hasOneSlot || hasTwoSlots || hasFourSlots) && !isDragging) {
      setIsExpanded(prev => !prev);
    }
  };

  const handleIntegralToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsIntegralMenuOpen(prev => !prev);
  };

  const handleIntegralSelect = (event: React.MouseEvent<HTMLButtonElement>, variable: 'x' | 'y') => {
    event.stopPropagation();
    onIntegralVariableChange?.(card.id, variable);
    setIsIntegralMenuOpen(false);
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-end h-36 md:h-44 lg:h-48 group ${isTargeting ? 'cursor-pointer' : ''}`}
      style={style}
      onClick={handleClick}
      ref={setDragRef}
      {...listeners}
      {...attributes}
    >
      {hasFourSlots && (
        <>
          <div
            ref={setUlRef}
            className="absolute left-0 top-0 w-1/2 h-1/2 rounded-tl-xl pointer-events-auto"
            style={isOverUl ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setUrRef}
            className="absolute right-0 top-0 w-1/2 h-1/2 rounded-tr-xl pointer-events-auto"
            style={isOverUr ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setLlRef}
            className="absolute left-0 bottom-0 w-1/2 h-1/2 rounded-bl-xl pointer-events-auto"
            style={isOverLl ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setLrRef}
            className="absolute right-0 bottom-0 w-1/2 h-1/2 rounded-br-xl pointer-events-auto"
            style={isOverLr ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
        </>
      )}
      {hasTwoSlots && (
        <>
          <div
            ref={setTopSlotRef}
            className="absolute left-0 right-0 top-0 h-1/2 rounded-t-xl pointer-events-auto"
            style={isOverTop ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
          <div
            ref={setBottomSlotRef}
            className="absolute left-0 right-0 bottom-0 h-1/2 rounded-b-xl pointer-events-auto"
            style={isOverBottom ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
          />
        </>
      )}
      {hasOneSlot && (
        <div
          ref={setWholeSlotRef}
          className="absolute inset-0 rounded-xl pointer-events-auto"
          style={isOverWhole ? { boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.7)' } : undefined}
        />
      )}

      {!isDragging && isExpanded && hasFourSlots && (
        <>
          {ulKey && card.slotCards?.[ulKey] && (
            <div className="absolute" style={{ left: '20%', top: '-12%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0 }}>
              <div className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[ulKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-3">
                  {cardsDatabase[card.slotCards[ulKey]!.symbol]?.image ? (
                    <img
                      src={`${BASE}${cardsDatabase[card.slotCards[ulKey]!.symbol].image.replace(/^\//, '')}`}
                      alt={card.slotCards[ulKey]!.symbol}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span className="text-4xl md:text-5xl font-chalk text-white pointer-events-none">
                      {card.slotCards[ulKey]!.symbol}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {urKey && card.slotCards?.[urKey] && (
            <div className="absolute" style={{ left: '80%', top: '-12%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0 }}>
              <div className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[urKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-3">
                  {cardsDatabase[card.slotCards[urKey]!.symbol]?.image ? (
                    <img
                      src={`${BASE}${cardsDatabase[card.slotCards[urKey]!.symbol].image.replace(/^\//, '')}`}
                      alt={card.slotCards[urKey]!.symbol}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span className="text-4xl md:text-5xl font-chalk text-white pointer-events-none">
                      {card.slotCards[urKey]!.symbol}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {llKey && card.slotCards?.[llKey] && (
            <div className="absolute" style={{ left: '20%', top: '88%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0 }}>
              <div className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[llKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-3">
                  {cardsDatabase[card.slotCards[llKey]!.symbol]?.image ? (
                    <img
                      src={`${BASE}${cardsDatabase[card.slotCards[llKey]!.symbol].image.replace(/^\//, '')}`}
                      alt={card.slotCards[llKey]!.symbol}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span className="text-4xl md:text-5xl font-chalk text-white pointer-events-none">
                      {card.slotCards[llKey]!.symbol}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {lrKey && card.slotCards?.[lrKey] && (
            <div className="absolute" style={{ left: '80%', top: '88%', transform: 'translateX(-50%) scale(0.85)', zIndex: 0 }}>
              <div className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[lrKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-3">
                  {cardsDatabase[card.slotCards[lrKey]!.symbol]?.image ? (
                    <img
                      src={`${BASE}${cardsDatabase[card.slotCards[lrKey]!.symbol].image.replace(/^\//, '')}`}
                      alt={card.slotCards[lrKey]!.symbol}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span className="text-4xl md:text-5xl font-chalk text-white pointer-events-none">
                      {card.slotCards[lrKey]!.symbol}
                    </span>
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
            <div className="absolute left-1/2" style={{ top: '-10%', transform: 'translateX(-50%) scale(0.9)', zIndex: 0 }}>
              <div className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[topSlotKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-3">
                  {cardsDatabase[card.slotCards[topSlotKey]!.symbol]?.image ? (
                    <img
                      src={`${BASE}${cardsDatabase[card.slotCards[topSlotKey]!.symbol].image.replace(/^\//, '')}`}
                      alt={card.slotCards[topSlotKey]!.symbol}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span className="text-4xl md:text-5xl font-chalk text-white pointer-events-none">
                      {card.slotCards[topSlotKey]!.symbol}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {bottomSlotKey && card.slotCards?.[bottomSlotKey] && (
            <div className="absolute left-1/2" style={{ top: '86%', transform: 'translateX(-50%) scale(0.9)', zIndex: 0 }}>
              <div className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[bottomSlotKey]!.symbol)}`}>
                <div className="w-full h-full flex items-center justify-center p-3">
                  {cardsDatabase[card.slotCards[bottomSlotKey]!.symbol]?.image ? (
                    <img
                      src={`${BASE}${cardsDatabase[card.slotCards[bottomSlotKey]!.symbol].image.replace(/^\//, '')}`}
                      alt={card.slotCards[bottomSlotKey]!.symbol}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span className="text-4xl md:text-5xl font-chalk text-white pointer-events-none">
                      {card.slotCards[bottomSlotKey]!.symbol}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!isDragging && isExpanded && hasOneSlot && card.slotCards?.[slotKeys[0]] && (
        <div className="absolute left-1/2" style={{ top: '-10%', transform: 'translateX(-50%) scale(0.9)', zIndex: 0 }}>
          <div className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 flex items-center justify-center bg-slate-800 shadow-xl ${getBorderColor(card.slotCards[slotKeys[0]]!.symbol)}`}>
            <div className="w-full h-full flex items-center justify-center p-3">
              {cardsDatabase[card.slotCards[slotKeys[0]]!.symbol]?.image ? (
                <img
                  src={`${BASE}${cardsDatabase[card.slotCards[slotKeys[0]]!.symbol].image.replace(/^\//, '')}`}
                  alt={card.slotCards[slotKeys[0]]!.symbol}
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <span className="text-4xl md:text-5xl font-chalk text-white pointer-events-none">
                  {card.slotCards[slotKeys[0]]!.symbol}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Zóna pro Exponent - Skrytá, dokud nad ni nenajedeš */}
      {cardData?.canHaveExponent && (
        <div
          ref={setDropRef}
          className={`absolute -top-4 -right-6 w-12 h-16 md:w-14 md:h-20 lg:w-16 lg:h-22 rounded-lg transition-all duration-200 z-10 flex items-center justify-center
          ${card.exponent ? 'opacity-100' : (isOver ? 'opacity-100 border-2 border-dashed border-yellow-400 bg-yellow-400/20 scale-110' : 'opacity-0')}
          ${isTargeting ? 'pointer-events-none' : ''} 
        `}
        >
          {card.exponent && (
            <div className="w-full h-full scale-90 pointer-events-none">
              <div className={`w-full h-full bg-slate-800 rounded-lg border-2 ${getBorderColor(card.exponent.symbol)} flex items-center justify-center p-1`}>
                {cardsDatabase[card.exponent.symbol]?.image ? (
                  <img src={`${BASE}${cardsDatabase[card.exponent.symbol].image.replace(/^\//, '')}`} className="w-full h-full object-contain" alt="exp" />
                ) : (
                  <span className="text-xl font-chalk text-slate-200">{card.exponent.symbol}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isIntegralCard && !isTargeting && (
        <div className="absolute -right-9 top-10 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleIntegralToggle}
            className="rounded-full bg-slate-900/90 border border-white/20 px-2 py-1 text-[10px] font-bold text-white shadow-md hover:bg-slate-800"
          >
            {integralLabel}
          </button>
          {isIntegralMenuOpen && (
            <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-slate-950/95 p-1 shadow-xl">
              <button
                type="button"
                onClick={(event) => handleIntegralSelect(event, 'x')}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg ${integralVar === 'x' ? 'bg-emerald-500/80 text-white' : 'text-slate-200 hover:bg-white/10'}`}
              >
                dx
              </button>
              <button
                type="button"
                onClick={(event) => handleIntegralSelect(event, 'y')}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg ${integralVar === 'y' ? 'bg-emerald-500/80 text-white' : 'text-slate-200 hover:bg-white/10'}`}
              >
                dy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hlavní karta na stole */}
      <div
        className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 flex items-center justify-center bg-slate-800 shadow-xl
        ${borderColor}
        ${cardData?.hasEffect ? 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' : ''}
        ${isDragging ? 'scale-110 shadow-[0_0_25px_rgba(255,255,255,0.7)] ring-2 ring-white/70 z-200' : ''}
        ${isTargeting ? 'hover:scale-105 hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''}
        ${absoluteValue ? 'border-x-6 border-x-blue-500' : ''}
      `}>
        <div className="w-full h-full flex items-center justify-center p-3">
          {cardData?.image ? (
            <img
              src={`${BASE}${cardData.image.replace(/^\//, '')}`}
              alt={cardData.symbol}
              className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
            />
          ) : (
            <span className="text-4xl md:text-5xl font-chalk text-white pointer-events-none">
              {cardData?.symbol || card.symbol}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. CELÁ HRACÍ PLOCHA (STŮL)
// ==========================================
export function BoardArea({ id, cards, targetR, playerTheme, isTargeting, onCardClick, onIntegralVariableChange, absoluteValue }: BoardAreaProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const integralVar = (() => {
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
  })();

  // Sledování drag stavu pro vizuální feedback
  useEffect(() => {
    const handleDragStart = () => setIsDraggingOver(true);
    const handleDragEnd = () => setIsDraggingOver(false);

    document.addEventListener('dnd-kit:drag:start', handleDragStart);
    document.addEventListener('dnd-kit:drag:end', handleDragEnd);

    return () => {
      document.removeEventListener('dnd-kit:drag:start', handleDragStart);
      document.removeEventListener('dnd-kit:drag:end', handleDragEnd);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row items-center w-full gap-6 lg:gap-10">

      {/* NALEVO: Konstrukce L */}
      <div
        ref={setNodeRef}
        className={`relative flex-1 w-full min-h-62.5 md:min-h-87.5 rounded-3xl lg:rounded-[3.5rem] border-4 border-dashed transition-all duration-500 flex items-center justify-center p-4 md:p-6 lg:p-8
          ${isOver ? 'border-emerald-400 scale-[1.02] shadow-[0_0_40px_rgba(16,185,129,0.2)] bg-emerald-900/10' : 'border-white/10'}
          ${playerTheme || 'bg-slate-900/60'}
          shadow-[inset_0_2px_30px_rgba(0,0,0,0.6)]
        `}
      >
        {/* VIZUALIZACE ABSOLUTNÍ HODNOTY |L| */}
        <div className="flex items-center gap-4">
          {absoluteValue && (
            <div className="w-2.5 h-48 bg-white/40 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse" />
          )}

          <div className={`flex items-end gap-3 flex-wrap justify-center min-h-144px transition-all duration-300 ${isDraggingOver ? 'gap-6' : 'gap-3'}`}>
            {cards.length === 0 ? (
              // Prázdná plocha - velká drop zóna
              <div className="font-chalk text-white/10 text-2xl md:text-5xl uppercase tracking-[0.25em] pointer-events-none select-none italic self-center">
                Tabule
              </div>
            ) : (
              // Karty s drop zónami mezi nimi
              <div className="flex flex-row items-center justify-center">
                {/* Drop zóna před první kartou */}
                <BoardDropZone
                  id={`${id}-before-0`}
                  isVisible={isDraggingOver}
                />

                {cards.map((c, index) => (
                  <React.Fragment key={c.id}>
                    <BoardCard
                      card={c}
                      isTargeting={isTargeting}
                      onCardClick={onCardClick}
                      onIntegralVariableChange={onIntegralVariableChange}
                      absoluteValue={absoluteValue}
                    />

                    {/* Drop zóna za kartou */}
                    {index < cards.length - 1 && (
                      <BoardDropZone
                        id={`${id}-between-${index}-${index + 1}`}
                        isVisible={isDraggingOver}
                      />
                    )}
                  </React.Fragment>
                ))}

                {/* Drop zóna za poslední kartou */}
                <BoardDropZone
                  id={`${id}-after-${cards.length - 1}`}
                  isVisible={isDraggingOver}
                />
              </div>
            )}
          </div>

          {absoluteValue && (
            <div className="w-2.5 h-48 bg-white/40 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse" />
          )}
        </div>
      </div>

      {/* UPROSTŘED: Rovnítko */}
      <div className="text-5xl md:text-7xl lg:text-9xl font-chalk text-white/40 select-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
        =
      </div>

      {/* NAPRAVO: Cíl R */}
      <div className="flex flex-col items-center justify-center gap-3">
        {integralVar && (
          <div className="rounded-md border-2 border-white/30 bg-slate-900/85 px-3 py-1 text-sm font-black text-white shadow-lg">
            d{integralVar}
          </div>
        )}
        <div className="flex flex-col items-center justify-center bg-black/50 backdrop-blur-xl p-6 md:p-8 lg:p-12 rounded-3xl lg:rounded-[3rem] border-2 border-white/10 min-w-32 md:min-w-40 lg:min-w-56 shadow-xl transition-transform hover:scale-105">
          <div className="text-5xl md:text-7xl lg:text-9xl font-chalk text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.7)] text-center">
            {targetR}
          </div>
          <div className="text-[8px] md:text-[10px] lg:text-xs font-mono text-white/40 uppercase tracking-[0.4em] mt-3 md:mt-4 lg:mt-6 font-black text-center">
            Výsledek
          </div>
        </div>
      </div>

    </div>
  );
}