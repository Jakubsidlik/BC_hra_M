// @ts-nocheck
import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cardsDatabase } from '@/data/cardsDB';
import { getBorderColor } from '@/lib/gameHelpers';
import type { GameCard, Player } from '@/lib/effects';



const BASE = import.meta.env.BASE_URL;

// ==========================================
// THEME → CSS COLORS  (same palettes as mobile)
// ==========================================
interface ThemePalette {
  primary: string;
  bgDark: string;
  bgMid: string;
  bgDot: string;
  accent: string;
  navBg: string;
  navBorder: string;
  footerBg: string;
  glow: string;
}

const THEME_PALETTES: Record<string, ThemePalette> = {
  'bg-violet-600/60': { primary:'#7c3aed', bgDark:'#1e0a38', bgMid:'#2e1a5a', bgDot:'#3d2570', accent:'#7c3aed', navBg:'rgba(30,10,56,0.75)', navBorder:'rgba(124,58,237,0.25)', footerBg:'#1e0a38', glow:'rgba(124,58,237,0.5)' },
  'bg-emerald-600/60': { primary:'#059669', bgDark:'#052e16', bgMid:'#1a4731', bgDot:'#2d5a44', accent:'#059669', navBg:'rgba(5,46,22,0.75)', navBorder:'rgba(5,150,105,0.25)', footerBg:'#052e16', glow:'rgba(5,150,105,0.5)' },
  'bg-blue-600/60': { primary:'#2563eb', bgDark:'#0f172a', bgMid:'#1e3a6a', bgDot:'#2a4d8a', accent:'#2563eb', navBg:'rgba(15,23,42,0.75)', navBorder:'rgba(37,99,235,0.25)', footerBg:'#0f172a', glow:'rgba(37,99,235,0.5)' },
  'bg-rose-600/60': { primary:'#e11d48', bgDark:'#2d0a14', bgMid:'#4c1a28', bgDot:'#6b2438', accent:'#e11d48', navBg:'rgba(45,10,20,0.75)', navBorder:'rgba(225,29,72,0.25)', footerBg:'#2d0a14', glow:'rgba(225,29,72,0.5)' },
  'bg-pink-600/60': { primary:'#db2777', bgDark:'#2a0a1e', bgMid:'#4a1738', bgDot:'#6b2350', accent:'#db2777', navBg:'rgba(42,10,30,0.75)', navBorder:'rgba(219,39,119,0.25)', footerBg:'#2a0a1e', glow:'rgba(219,39,119,0.5)' },
  'bg-amber-500/60': { primary:'#d97706', bgDark:'#27160a', bgMid:'#4a2e14', bgDot:'#6b4020', accent:'#d97706', navBg:'rgba(39,22,10,0.75)', navBorder:'rgba(217,119,6,0.25)', footerBg:'#27160a', glow:'rgba(217,119,6,0.5)' },
  'bg-cyan-600/60': { primary:'#0891b2', bgDark:'#0a1f2e', bgMid:'#1a3a50', bgDot:'#254f6a', accent:'#0891b2', navBg:'rgba(10,31,46,0.75)', navBorder:'rgba(8,145,178,0.25)', footerBg:'#0a1f2e', glow:'rgba(8,145,178,0.5)' },
  'bg-orange-600/60': { primary:'#ea580c', bgDark:'#2a1008', bgMid:'#4a2214', bgDot:'#6b3420', accent:'#ea580c', navBg:'rgba(42,16,8,0.75)', navBorder:'rgba(234,88,12,0.25)', footerBg:'#2a1008', glow:'rgba(234,88,12,0.5)' },
};

function getTabletPalette(themeId: string): ThemePalette {
  return THEME_PALETTES[themeId] ?? THEME_PALETTES['bg-emerald-600/60'];
}

// ==========================================
// TABLET HAND CARD (fan footer)
// ==========================================
interface TabletHandCardProps {
  card: GameCard;
  index: number;
  total: number;
  isDiscarding: boolean;
  onDiscard?: (id: string) => void;
  palette: ThemePalette;
}

function TabletHandCard({ card, index, total, isDiscarding, onDiscard, palette }: TabletHandCardProps) {
  const cardData = cardsDatabase[card.symbol];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: card,
  });

  const midpoint = (total - 1) / 2;
  const d = index - midpoint;
  const rotation = isDragging ? 0 : d * 12;
  const translateY = isDragging ? 0 : Math.abs(d) * 6;
  const translateX = isDragging ? 0 : d * 28;

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
      <span className="font-black text-lg text-white leading-none">{card.symbol}</span>
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
// TABLET DISCARD ZONE
// ==========================================
function TabletDiscardSlot({ discardCount, isDiscarding, palette }: { discardCount: number; isDiscarding: boolean; palette: ThemePalette }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'drop-discard' });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: '5.5rem',
        height: '8.25rem',
        backgroundColor: isOver && isDiscarding ? 'rgba(127,29,29,0.8)' : `${palette.bgMid}aa`,
        borderColor: isOver && isDiscarding ? '#ef4444' : 'rgba(255,255,255,0.3)',
      }}
      className={`rounded-md border-2 shadow-inner relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300
        ${isOver && isDiscarding ? 'scale-105' : ''}
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
// TABLET BOARD DROP ZONE
// ==========================================
function TabletBoardDropZone({ id, palette }: { id: string; palette: ThemePalette }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="absolute inset-0 rounded-lg transition-all duration-300 z-10"
      style={isOver ? { background: `${palette.primary}18`, boxShadow: `inset 0 0 0 2px ${palette.primary}80` } : {}}
    />
  );
}

// ==========================================
// MAIN TABLET GAME LAYOUT
// ==========================================
interface TabletGameLayoutProps {
  currentPlayer: Player;
  state: {
    deck: GameCard[];
    discardPile: GameCard[];
    isDiscarding: boolean;
    hasModifiedBoardThisTurn: boolean;
    bracketMode: { step: 'LEFT' | 'RIGHT'; leftIndex: number | null; pairIndex?: number } | null;
  };
  actions: {
    checkMathEngine: () => void;
    handleEndTurn: () => void;
    handleDiscard: (id: string) => void;
  };
}

export function TabletGameLayout({ currentPlayer, state, actions }: TabletGameLayoutProps) {
  const { deck, discardPile, isDiscarding, hasModifiedBoardThisTurn } = state;
  const palette = getTabletPalette(currentPlayer.theme);

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
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Merienda', cursive" }}>
          {currentPlayer.name}
        </h1>
      </nav>

      {/* ── MAIN ── */}
      {/* Tablet: pt-0 gap-1 (tighter than phone's p-2 gap-2) */}
      <main className="flex-1 flex flex-col mx-auto w-full p-2 max-w-4xl pt-0 gap-1">

        {/* CHALKBOARD — aspect-[16/10] wider ratio for tablet */}
        <section className="relative group">
          <TabletBoardDropZone id="main-board" palette={palette} />
          <div
            className="w-full border-4 shadow-2xl flex items-center justify-center overflow-hidden relative rounded-lg p-4 transition-colors duration-700"
            style={{
              borderColor: `${palette.primary}66`,
              backgroundColor: palette.bgMid,
              backgroundImage: `radial-gradient(circle, ${palette.bgDot} 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
              aspectRatio: '16/10',
              minHeight: '180px',
            }}
          >
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle at center, rgba(200,200,200,0.15) 0%, transparent 70%)' }}
            />

            {/* Board cards */}
            <div className="z-10 flex items-end gap-2 flex-wrap justify-center w-full">
              {currentPlayer.board.length === 0 ? (
                <span
                  className="uppercase tracking-[0.2em] text-xl pointer-events-none select-none italic"
                  style={{ color: 'rgba(255,255,255,0.12)' }}
                >
                  Tabule
                </span>
              ) : (
                currentPlayer.board.map((card) => {
                  const cardData = cardsDatabase[card.symbol];
                  return (
                    <div key={card.id} className="flex flex-col items-center">
                      <div
                        className="rounded-md border-2 flex items-center justify-center shadow-md transition-colors duration-700"
                        style={{ width: '3.5rem', height: '5rem', backgroundColor: `${palette.bgDark}cc`, borderColor: 'rgba(255,255,255,0.25)' }}
                      >
                        {cardData?.image ? (
                          <img src={`${BASE}${cardData.image.replace(/^\//, '')}`} alt={card.symbol} className="w-full h-full object-contain p-1" />
                        ) : (
                          <span className="text-2xl font-black text-white">{card.symbol}</span>
                        )}
                      </div>
                    </div>
                  );
                })
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
        <section className="flex flex-col items-center">
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
              style={{ background: 'rgba(30,41,59,0.9)', color: '#cbd5e1', fontFamily: "'Merienda', cursive" }}
            >
              <span className="material-symbols-outlined text-lg">hourglass_empty</span>
              {isDiscarding ? 'Hotovo' : 'Ukončit tah'}
            </button>
          </div>
        </section>

        {/* UTILITY ROW — tablet: modifier LEFT, discard+draw RIGHT (justify-between) */}
        <section className="flex px-4 justify-between w-full">

          {/* Modifier — left side */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-md border-2 border-white/60 shadow-sm flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
              style={{
                width: '5.5rem',
                height: '8.25rem',
                backgroundColor: `${palette.bgDark}cc`,
                boxShadow: `0 0 10px ${palette.glow}`,
              }}
            >
              {modifierCard ? (
                <>
                  <span className="text-base font-black text-white leading-none">{modifierCard.symbol}</span>
                  <span className="text-[10px] uppercase tracking-tighter text-white/50 font-bold mt-1">Modifikátor</span>
                </>
              ) : (
                <>
                  <span className="text-base font-black text-white/30">( )</span>
                  <span className="text-[10px] uppercase tracking-tighter text-white/40 font-bold mt-1">Modifikátor</span>
                </>
              )}
            </div>
          </div>

          {/* Discard + Draw — grouped right side */}
          <div className="flex gap-3">
            {/* Discard zone */}
            <TabletDiscardSlot discardCount={discardPile.length} isDiscarding={isDiscarding} palette={palette} />

            {/* Draw pile */}
            <div className="flex flex-col items-center">
              <div
                className="rounded-md shadow-lg border-2 border-white/40 relative overflow-hidden flex flex-col items-center justify-center transition-colors duration-700"
                style={{ width: '5.5rem', height: '8.25rem', backgroundColor: palette.primary }}
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ background: 'repeating-linear-gradient(45deg,transparent,transparent 10px,white 10px,white 11px)' }}
                />
                <span className="material-symbols-outlined text-2xl text-white relative z-10">style</span>
                <span className="text-[10px] uppercase tracking-tighter text-white font-bold mt-1 relative z-10">
                  Líznout ({deck.length})
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER (hand fan) — tablet: pb-12 pt-2 (tighter top padding) ── */}
      <footer
        className="mt-auto pb-12 pt-2 px-4 transition-colors duration-700"
        style={{ background: `linear-gradient(to top, ${palette.footerBg} 0%, transparent 100%)` }}
      >
        <div className="relative h-40 max-w-lg mx-auto flex justify-center items-end select-none">
          {handCards.map((card, index) => (
            <TabletHandCard
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
