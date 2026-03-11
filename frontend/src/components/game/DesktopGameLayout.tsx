import React, { useState } from 'react';
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cardsDatabase } from '@/data/cardsDB';
import { getBorderColor } from '@/lib/gameHelpers';
import { BoardDropZone } from '@/components/game/Cards';
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

// Desktop card dimensions (larger than mobile/tablet)
const CARD_W = '7.26rem';
const CARD_H = '10.88rem';

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
      className={`rounded-md border-2 shadow-xl select-none flex flex-col p-1
        transition-all duration-200 origin-bottom
        ${isDragging ? 'scale-110 ring-2 ring-white/30' : ''}
        ${isDiscarding
          ? 'cursor-pointer !border-red-500 animate-pulse'
          : 'cursor-grab active:cursor-grabbing hover:-translate-y-4'}
        ${borderColor}
      `}
    >
      <span className="font-black text-xl text-white leading-none">{card.symbol}</span>
      <div className="flex-1 flex items-center justify-center">
        {cardData?.image ? (
          <img src={`${BASE}${cardData.image.replace(/^\//, '')}`} alt={card.symbol} className="w-full h-full object-contain" />
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
function DraggableBoardCard({ card, palette }: { card: GameCard; palette: ThemePalette; hasModifiedBoardThisTurn: boolean }) {
  const cardData = cardsDatabase[card.symbol];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: card,
  });

  const style: React.CSSProperties = {
    width: '4.5rem',
    height: '6.75rem',
    backgroundColor: `${palette.bgDark}cc`,
    borderColor: isDragging ? palette.primary : 'rgba(255,255,255,0.25)',
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 99999 : undefined,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? `0 0 24px ${palette.glow}` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`rounded-md border-2 flex items-center justify-center shadow-md transition-colors duration-700
        cursor-grab active:cursor-grabbing hover:border-red-400/60 hover:scale-105
      `}
      style={style}
    >
      {cardData?.image ? (
        <img src={`${BASE}${cardData.image.replace(/^\//, '')}`} alt={card.symbol} className="w-full h-full object-contain p-1" />
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
          ref={setNodeRef} {...listeners} {...attributes}
          className="rounded-md border-2 border-yellow-400/80 shadow-sm flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            width: CARD_W, height: CARD_H,
            backgroundColor: isDragging ? `${palette.bgDark}cc` : `${palette.bgMid}dd`,
            boxShadow: '0 0 12px rgba(250,204,21,0.5)',
            transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
            zIndex: isDragging ? 99999 : undefined,
          }}
        >
          <span className="text-3xl font-black text-yellow-300 leading-none">{closeSymbol}</span>
          <span className="text-[9px] uppercase text-yellow-300/60 font-bold mt-1 tracking-tight">pravá závorka</span>
        </div>
        <button onClick={onCancel} className="text-[9px] text-red-400/70 hover:text-red-400 uppercase tracking-tight">
          Zrušit
        </button>
      </div>
    );
  }

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
            <span className="text-lg font-black text-white leading-none">{firstOpen!.symbol}</span>
            <span className="text-[9px] uppercase tracking-tight text-white/40 font-bold mt-1">Závorky</span>
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

export function DesktopGameLayout({ currentPlayer, state, actions }: DesktopGameLayoutProps) {
  const { deck, discardPile, isDiscarding, hasModifiedBoardThisTurn, bracketMode } = state;
  const palette = getDesktopPalette(currentPlayer.theme);

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
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Merienda', cursive" }}>
          {currentPlayer.name}
        </h1>
      </nav>

      {/* ── MAIN ── */}
      {/* Desktop: max-w-[1200px], pt-0, gap-4 */}
      <main className="flex-1 flex flex-col mx-auto w-full p-2 max-w-[1200px] pt-0 gap-4">

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
              aspectRatio: '21/9',
              minHeight: '220px',
            }}
          >
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle at center, rgba(200,200,200,0.15) 0%, transparent 70%)' }}
            />

            {/* Board cards */}
            <div className="z-10 flex items-stretch gap-0 flex-wrap justify-center w-full" style={{ minHeight: '6rem' }}>
              {currentPlayer.board.length === 0 ? (
                <span
                  className="uppercase tracking-[0.25em] text-2xl pointer-events-none select-none italic self-center"
                  style={{ color: 'rgba(255,255,255,0.10)' }}
                >
                  Tabule
                </span>
              ) : (
                <>
                  <BoardDropZone id="main-board-before-0" isVisible={isDraggingCard} />
                  {currentPlayer.board.map((card, index) => (
                    <React.Fragment key={card.id}>
                      <div className="flex flex-col items-center">
                        <DraggableBoardCard card={card} palette={palette} hasModifiedBoardThisTurn={hasModifiedBoardThisTurn} />
                      </div>
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

            {/* Target R — scaled up as per mockup */}
            <div
              className="absolute bottom-4 right-4 flex items-center gap-2 backdrop-blur-sm p-2 rounded-lg border border-white/20 origin-bottom-right"
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
        </section>

        {/* ACTION BUTTONS — Q.E.D. fixed 7.26rem, End Turn fixed 15.5rem, justify-between */}
        <section className="flex flex-col items-center w-full">
          <div className="flex justify-between w-full">
            <button
              onClick={actions.checkMathEngine}
              disabled={hasModifiedBoardThisTurn}
              className="font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                width: '7.26rem',
                background: hasModifiedBoardThisTurn ? `${palette.primary}55` : palette.primary,
                color: '#fff',
                fontFamily: "'Merienda', cursive",
                boxShadow: hasModifiedBoardThisTurn ? 'none' : `0 0 20px ${palette.glow}`,
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
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 10px,white 10px,white 11px)' }}
                />
                <span className="material-symbols-outlined text-3xl text-white relative z-10">style</span>
                <span className="text-[11px] uppercase tracking-tighter text-white font-bold mt-2 relative z-10">
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
