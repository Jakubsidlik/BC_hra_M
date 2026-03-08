import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';
import React from 'react';
import { cardsDatabase } from '@/data/cardsDB';
import { getBorderColor } from '@/lib/gameHelpers';
import type { GameCard } from '@/lib/effects';

const BASE = import.meta.env.BASE_URL;

export interface DropData {
  parentId: string;
}

// --- INTERFACY PRO PROPS ---
interface BoardAreaProps {
  id: string;
  cards: GameCard[];
  targetR?: number | string;
  playerTheme?: string; 
  isTargeting?: boolean;     
  onCardClick?: (id: string) => void; 
  absoluteValue?: boolean; // Pro zobrazení |L|
}

interface BoardCardProps {
  card: GameCard;
  isTargeting?: boolean;
  onCardClick?: (id: string) => void;
  absoluteValue?: boolean; // Pro vizuální zobrazení | | kolem karet
}

interface BoardDropZoneProps {
  id: string;
  isVisible: boolean;
}

// ==========================================
// NOVÁ: DROP ZÓNA MEZI KARTAMI
// ==========================================
export function BoardDropZone({ id, isVisible }: BoardDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-300 ease-out ${
        isVisible 
          ? 'w-8 md:w-12 lg:w-16 opacity-100' 
          : 'w-2 opacity-0'
      } h-36 md:h-44 lg:h-48 flex items-center justify-center`}
    >
      <div className={`w-full h-8 md:h-12 lg:h-16 rounded-lg border-2 border-dashed transition-all duration-300 ${
        isOver 
          ? 'border-emerald-400 bg-emerald-400/20 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
          : 'border-white/20 bg-white/5'
      }`} />
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
    // disabled zde NESMÍ být, aby karta šla přetáhnout do hřbitova!
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
    zIndex: isDragging ? 100 : 10 + index,
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
        ${isDragging ? 'scale-110 shadow-[0_0_25px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/50 z-[200] rotate-0' : ''}
        ${isDiscarding 
          ? 'cursor-pointer border-red-500 hover:scale-105 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-2 ring-red-600/15 animate-pulse' 
          : 'cursor-grab active:cursor-grabbing hover:-translate-y-8 hover:z-50 hover:scale-105'}
        ${borderColor}
      `}
    >
      {isDiscarding && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold z-30 shadow-lg uppercase whitespace-nowrap">
          Táhni na hřbitov
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
export function BoardCard({ card, isTargeting, onCardClick, absoluteValue }: BoardCardProps) {
  const cardData = cardsDatabase[card.symbol];
  const borderColor = getBorderColor(card.symbol);
  
  // Zóna pro vhození exponentu
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-exponent-${card.id}`,
    data: { parentId: card.id } as DropData,
  });

  // NOVÉ: Možnost kartu chytit z plochy a odhodit na hřbitov (kaskádové mazání)
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: isTargeting // Nelze tahat, pokud zrovna na něco cílíš efektem
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = () => {
    if (isTargeting && onCardClick) onCardClick(card.id);
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
      {/* Zóna pro Exponent - Skrytá, dokud nad ni nenajedeš */}
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

      {/* Hlavní karta na stole */}
      <div 
        className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 rounded-xl border-3 md:border-4 flex items-center justify-center bg-slate-800 shadow-xl
        ${borderColor}
        ${cardData?.hasEffect ? 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' : ''}
        ${isDragging ? 'scale-110 shadow-[0_0_25px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/50 z-[200]' : ''}
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
export function BoardArea({ id, cards, targetR, playerTheme, isTargeting, onCardClick, absoluteValue }: BoardAreaProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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
        className={`relative flex-1 w-full min-h-[250px] md:min-h-[350px] rounded-3xl lg:rounded-[3.5rem] border-4 border-dashed transition-all duration-500 flex items-center justify-center p-4 md:p-6 lg:p-8
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
                Tabule L
              </div>
            ) : (
              // Karty s drop zónami mezi nimi
              <>
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
                      absoluteValue={absoluteValue} 
                    />
                    
                    {/* Drop zóna za každou kartou (kromě poslední) */}
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
              </>
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
      <div className="flex flex-col items-center justify-center bg-black/50 backdrop-blur-xl p-6 md:p-8 lg:p-12 rounded-3xl lg:rounded-[3rem] border-2 border-white/10 min-w-[8rem] md:min-w-[10rem] lg:min-w-[14rem] shadow-xl transition-transform hover:scale-105">
        <div className="text-5xl md:text-7xl lg:text-9xl font-chalk text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.7)] text-center">
          {targetR}
        </div>
        <div className="text-[8px] md:text-[10px] lg:text-xs font-mono text-white/40 uppercase tracking-[0.4em] mt-3 md:mt-4 lg:mt-6 font-black text-center">
          Cílový<br/>parametr R
        </div>
      </div>

    </div>
  );
}