// @ts-nocheck
import React, { useState } from 'react';
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cardsDatabase } from '@/data/cardsDB';
import { getBorderColor } from '@/lib/gameHelpers';
import { BoardDropZone } from '@/components/game/Cards';
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

// ==========================================
// MINI HAND CARD (fan footer)
// ==========================================
interface MiniHandCardProps {
  card: GameCard;
  index: number;
  total: number;
  isDiscarding: boolean;
  onDiscard?: (id: string) => void;
  palette: ThemePalette;
}

function MiniHandCard({ card, index, total, isDiscarding, onDiscard, palette }: MiniHandCardProps) {
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
      : `rotate(${rotation}deg) translateY(${translateY}px) translateX(${translateX}px)`,
    zIndex: isDragging ? 99999 : 10 + index,
    position: 'absolute',
    width: '5.5rem',
    height: '8.25rem',
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
      onClick={() => isDiscarding && onDiscard && onDiscard(card.id)}
      style={style}
      className={`rounded-xl border-2 shadow-xl select-none
        flex flex-col p-1 transition-all duration-200 origin-bottom
        ${isDragging ? 'scale-110 ring-2 ring-white/30' : ''}
        ${isDiscarding
          ? 'cursor-pointer !border-red-500 animate-pulse'
          : 'cursor-grab active:cursor-grabbing hover:-translate-y-6'}
        ${borderColor}
      `}
    >
      <span className="font-black text-lg text-white leading-none">
        {card.symbol}
      </span>
      <div className="flex-1 flex items-center justify-center">
        {cardData?.image ? (
          <img
            src={`${BASE}${cardData.image.replace(/^\//, '')}`}
            alt={card.symbol}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-4xl font-black text-white">{card.symbol}</span>
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
        width: '5.5rem',
        height: '8.25rem',
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
function DraggableBoardCard({ card, palette, hasModifiedBoardThisTurn }: { card: GameCard; palette: ThemePalette; hasModifiedBoardThisTurn: boolean }) {
  const cardData = cardsDatabase[card.symbol];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: card,
  });

  const style: React.CSSProperties = {
    width: '3.5rem',
    height: '5rem',
    backgroundColor: `${palette.bgDark}cc`,
    borderColor: isDragging ? palette.primary : 'rgba(255,255,255,0.25)',
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 99999 : undefined,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? `0 0 20px ${palette.glow}` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`rounded-md border-2 flex items-center justify-center shadow-md transition-colors duration-700
        ${!hasModifiedBoardThisTurn ? 'cursor-grab active:cursor-grabbing hover:border-red-400/60 hover:scale-105' : 'cursor-default'}
      `}
      style={style}
    >
      {cardData?.image ? (
        <img src={`${BASE}${cardData.image.replace(/^\//, '')}`} alt={card.symbol} className="w-full h-full object-contain p-1" />
      ) : (
        <span className="text-2xl font-black text-white">{card.symbol}</span>
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

  // V RIGHT fázi: zobraz uzavírací závorku jako draggable
  if (bracketMode) {
    const closeSymbol = closeSymbols[bracketMode.pairIndex];
    const closeCard = syntax.find(c => c.symbol === closeSymbol);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: closeCard?.id ?? 'bracket-close-dummy',
      data: closeCard,
      disabled: !closeCard,
    });
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="rounded-md border-2 border-yellow-400/80 shadow-sm flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            width: '5.5rem',
            height: '8.25rem',
            backgroundColor: isDragging ? `${palette.bgDark}cc` : `${palette.bgMid}dd`,
            boxShadow: `0 0 12px rgba(250,204,21,0.5)`,
            transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
            zIndex: isDragging ? 99999 : undefined,
          }}
        >
          <span className="text-3xl font-black text-yellow-300 leading-none">{closeSymbol}</span>
          <span className="text-[9px] uppercase text-yellow-300/60 font-bold mt-1 tracking-tight">pravá závorka</span>
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
  const firstOpen = syntax.find(c => openSymbols.includes(c.symbol));
  const exhausted = !firstOpen;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: firstOpen?.id ?? 'bracket-exhausted',
    data: firstOpen,
    disabled: exhausted,
  });

  return (
    <div
      ref={setNodeRef}
      {...(exhausted ? {} : listeners)}
      {...(exhausted ? {} : attributes)}
      className={`rounded-md border-2 shadow-sm flex flex-col items-center justify-center transition-transform
        ${exhausted ? 'opacity-40 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:scale-105'}
      `}
      style={{
        width: '5.5rem',
        height: '8.25rem',
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
          <span className="text-2xl font-black text-white leading-none">{firstOpen!.symbol}</span>
          <span className="text-[9px] uppercase tracking-tight text-white/40 font-bold mt-1">Závorky</span>
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
  state: {
    deck: GameCard[];
    discardPile: GameCard[];
    isDiscarding: boolean;
    hasModifiedBoardThisTurn: boolean;
    bracketMode: { leftInsertPosition: number; pairIndex: number } | null;
  };
  actions: {
    checkMathEngine: () => void;
    handleEndTurn: () => void;
    handleDiscard: (id: string) => void;
    cancelBracketMode: () => void;
  };
}

export function MobileGameLayout({ currentPlayer, state, actions }: MobileGameLayoutProps) {
  const { deck, discardPile, isDiscarding, hasModifiedBoardThisTurn, bracketMode } = state;
  const palette = getPalette(currentPlayer.theme);

  const [isDraggingCard, setIsDraggingCard] = useState(false);
  useDndMonitor({
    onDragStart: () => setIsDraggingCard(true),
    onDragEnd: () => setIsDraggingCard(false),
    onDragCancel: () => setIsDraggingCard(false),
  });

  const modifierCard = currentPlayer.hand[0] ?? null;
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
        <button className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-3xl">menu</span>
        </button>
        <span
          className="text-base font-bold tracking-tight ml-2"
          style={{ fontFamily: "'Merienda', cursive" }}
        >
          Math4fun
        </span>
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
            <div className="z-10 flex items-stretch gap-0 flex-wrap justify-center w-full" style={{ minHeight: '5rem' }}>
              {currentPlayer.board.length === 0 ? (
                <span
                  className="uppercase tracking-[0.2em] text-xl pointer-events-none select-none italic self-center"
                  style={{ color: 'rgba(255,255,255,0.12)' }}
                >
                  Tabule
                </span>
              ) : (
                <>
                  {/* Kurzor před první kartou */}
                  <BoardDropZone id="main-board-before-0" isVisible={isDraggingCard} />
                  {currentPlayer.board.map((card, index) => (
                    <React.Fragment key={card.id}>
                      <div className="flex flex-col items-center">
                        <DraggableBoardCard card={card} palette={palette} hasModifiedBoardThisTurn={hasModifiedBoardThisTurn} />
                      </div>
                      {/* Kurzor za každou kartou */}
                      <BoardDropZone
                        id={index < currentPlayer.board.length - 1
                          ? `main-board-between-${index}-${index + 1}`
                          : `main-board-after-${currentPlayer.board.length - 1}`}
                        isVisible={isDraggingCard}
                      />
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>

            {/* Target R */}
            <div
              className="absolute bottom-3 right-3 flex items-center gap-2 backdrop-blur-sm p-2 rounded-lg border border-white/20"
              style={{ background: 'rgba(0,0,0,0.30)' }}
            >
              <span className="text-xl font-bold text-white">=</span>
              <span className="text-3xl font-black text-white px-1">{currentPlayer.targetR}</span>
            </div>
          </div>
        </section>

        {/* ACTION BUTTONS */}
        <section className="flex flex-col items-center gap-3">
          <div className="flex gap-3 w-full">
            <button
              onClick={actions.checkMathEngine}
              disabled={hasModifiedBoardThisTurn}
              className="flex-1 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: hasModifiedBoardThisTurn ? `${palette.primary}55` : palette.primary,
                color: '#fff',
                fontFamily: "'Merienda', cursive",
                boxShadow: hasModifiedBoardThisTurn ? 'none' : `0 0 18px ${palette.glow}`,
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
                width: '5.5rem',
                height: '8.25rem',
                backgroundColor: palette.primary,
              }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'repeating-linear-gradient(45deg,transparent,transparent 10px,white 10px,white 11px)',
                }}
              />
              <span className="material-symbols-outlined text-2xl text-white relative z-10">style</span>
              <span className="text-[10px] uppercase tracking-tighter text-white font-bold mt-1 relative z-10">
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
              palette={palette}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}
