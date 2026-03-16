import { useState, useCallback, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { toast } from "sonner";

import { cardsDatabase } from '@/data/cardsDB';
import { applyEffectLogic } from '@/lib/effects';
import { 
  generateFilteredDeck, 
  generatePersonalTargetR, 
  parseBoardToMathString,
  hasOperation,
  getSpecialSlots,
  createSlotCards,
  type DifficultyMode 
} from '@/lib/gameHelpers';
import type { GameCard, Player } from '@/lib/effects';
import type { DropData, SlotDropData } from '@/components/game/Cards';

type RemoveResult = { removed: GameCard | null, newCards: GameCard[] };

type PlayerSummaryStats = {
  id: number;
  name: string;
  targetR: string;
  targetScore: number;
  cardsToBoard: number;
  cardsFromBoardToDiscard: number;
  bracketPairsUsed: number;
  maxDrawInTurn: number;
  wrongQEDAttempts: number;
  currentTurnDraw: number;
};

type GameStats = {
  players: Record<number, PlayerSummaryStats>;
  firstWrongQED: { playerId: number } | null;
};

const createGameStats = (playerList: Player[]): GameStats => {
  const players: Record<number, PlayerSummaryStats> = {};
  playerList.forEach(player => {
    const targetNumber = typeof player.targetR === 'number' ? player.targetR : Number(player.targetR);
    players[player.id] = {
      id: player.id,
      name: player.name,
      targetR: String(player.targetR),
      targetScore: Number.isFinite(targetNumber) ? Math.abs(targetNumber) : 0,
      cardsToBoard: 0,
      cardsFromBoardToDiscard: 0,
      bracketPairsUsed: 0,
      maxDrawInTurn: 0,
      wrongQEDAttempts: 0,
      currentTurnDraw: 0,
    };
  });
  return { players, firstWrongQED: null };
};

export function useGameEngine() {
  // --- STAVY JÁDRA ---
  const [gamePhase, setGamePhase] = useState<'MENU' | 'RULES' | 'PICK_MODE' | 'SETUP' | 'PLAYING'>('MENU');
  const [difficulty, setDifficulty] = useState<DifficultyMode>('ZŠ');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [deck, setDeck] = useState<GameCard[]>([]);
  const [discardPile, setDiscardPile] = useState<GameCard[]>([]);
  const [playDirection] = useState<1 | -1>(1);
  const [isHandoff, setIsHandoff] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameSummaryOpen, setGameSummaryOpen] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [pendingHandSwap, setPendingHandSwap] = useState<{ direction: 1 | -1; snapshot: { playerId: number; hand: GameCard[] }[] } | null>(null);

  // --- TUTORIAL ---
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialDiscardDone, setTutorialDiscardDone] = useState(false);
  const [tutorialAllowedDiscardIds, setTutorialAllowedDiscardIds] = useState<string[]>([]);
  const [tutorialReferenceBoard, setTutorialReferenceBoard] = useState<GameCard[]>([]);
  const [tutorialBracketInfoShown, setTutorialBracketInfoShown] = useState(false);
  const [leaveGameConfirmOpen, setLeaveGameConfirmOpen] = useState(false);

  // --- STAVY PRO UI A EFEKTY ---
  const [pendingEffect, setPendingEffect] = useState<{card: GameCard, targetId: string | null, insertPosition?: number} | null>(null);
  const [effectStep, setEffectStep] = useState<'CHOOSE_EFFECT' | 'CHOOSE_TARGET'>('CHOOSE_EFFECT');
  const [chosenEffectChoice, setChosenEffectChoice] = useState<'ACTIVATE' | null>(null);
  const [targetingMode, setTargetingMode] = useState<{effectId: string, targetPlayerId?: number} | null>(null);
  const [minigameMode, setMinigameMode] = useState<{effectId: string, cards: GameCard[], targetPlayerId?: number} | null>(null);
  const [bracketMode, setBracketMode] = useState<{ leftInsertPosition: number; pairIndex: number } | null>(null);
  const [integralSetup, setIntegralSetup] = useState<{card: GameCard, targetId: string | null, insertPosition?: number} | null>(null);
  const [deckPreviewMode, setDeckPreviewMode] = useState<{originalDeck: GameCard[], reorderedDeck?: GameCard[]} | null>(null);
  const [moduloMode, setModuloMode] = useState<{activePlayerIndex: number, targetPlayerId?: number} | null>(null);
  
  // --- OMEZENÍ TAHU ---
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [hasModifiedBoardThisTurn, setHasModifiedBoardThisTurn] = useState(false);
  const [playsThisTurn, setPlaysThisTurn] = useState(0);

  // ==========================================
  // 1. REKURZIVNÍ LOGIKA (Kaskády)
  // ==========================================

  const removeCardRecursively = useCallback((cards: GameCard[], targetId: string): RemoveResult => {
    const runRemoval = (currentCards: GameCard[], id: string): RemoveResult => {
      let removed: GameCard | null = null;
      const filtered = currentCards.filter(c => {
        if (c.id === id) {
          removed = c;
          return false;
        }
        if (c.exponent) {
          const res = runRemoval([c.exponent], id);
          if (res.removed) {
            removed = res.removed;
            c.exponent = res.newCards.length > 0 ? res.newCards[0] : null;
          }
        }
        return true;
      });
      return { removed, newCards: filtered };
    };
    return runRemoval(cards, targetId);
  }, []);

  const flattenCardTree = useCallback((card: GameCard): GameCard[] => {
    const runFlatten = (node: GameCard): GameCard[] => {
      const flatList: GameCard[] = [{ ...node, exponent: null }]; 
      if (node.exponent) flatList.push(...runFlatten(node.exponent));
      return flatList;
    };
    return runFlatten(card);
  }, []);

  const updatePlayerStats = useCallback((playerId: number, updater: (stats: PlayerSummaryStats) => PlayerSummaryStats) => {
    setGameStats(prev => {
      if (!prev) return prev;
      const existing = prev.players[playerId];
      if (!existing) return prev;
      return {
        ...prev,
        players: {
          ...prev.players,
          [playerId]: updater(existing),
        },
      };
    });
  }, []);

  const resetGameStats = useCallback((playerList: Player[]) => {
    setGameStats(createGameStats(playerList));
    setGameSummaryOpen(false);
  }, []);

  // ==========================================
  // 2. LOGIKA TAHŮ A PŘIDÁVÁNÍ KARET
  // ==========================================

  const performDraw = useCallback((count: number, playerIndex: number) => {
    let drawnCount = 0;
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[playerIndex];
      if (!p) return prev;

      let currentDeck = [...deck];
      let currentDiscard = [...discardPile];

      for (let i = 0; i < count; i++) {
        if (p.hand.length >= 12) break;
        if (currentDeck.length === 0) {
          if (currentDiscard.length === 0) break;
          currentDeck = [...currentDiscard].sort(() => Math.random() - 0.5);
          currentDiscard = [];
        }
        const drawn = currentDeck.pop();
        if (drawn) {
          p.hand.push({ ...drawn, id: `h-${drawn.symbol}-${Date.now()}-${Math.random().toString(36).substring(2,5)}` });
          drawnCount += 1;
        }
      }
      setDeck(currentDeck);
      setDiscardPile(currentDiscard);
      return next;
    });
    if (drawnCount > 0) {
      updatePlayerStats(playerIndex, stats => {
        const currentTurnDraw = stats.currentTurnDraw + drawnCount;
        return {
          ...stats,
          currentTurnDraw,
          maxDrawInTurn: Math.max(stats.maxDrawInTurn, currentTurnDraw),
        };
      });
    }
  }, [deck, discardPile, updatePlayerStats]);

  const applyPendingHandSwap = useCallback(() => {
    if (!pendingHandSwap) return;
    const { direction, snapshot } = pendingHandSwap;
    const snapshotMap = new Map(snapshot.map(entry => [entry.playerId, entry.hand]));

    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const count = next.length;
      const newHands = next.map((_: Player, index: number) => {
        const sourceIndex = (index - direction + count) % count;
        const sourceId = next[sourceIndex].id;
        return snapshotMap.get(sourceId) ?? [];
      });
      next.forEach((player: Player, index: number) => {
        player.hand = newHands[index];
      });
      return next;
    });

    setPendingHandSwap(null);
  }, [pendingHandSwap]);

  const finalizeTurn = useCallback(() => {
    applyPendingHandSwap();
    setIsDiscarding(false);
    const p = players[currentPlayerIndex];
    if (p?.status?.extraTurn) {
      toast.success("Extra tah!", { icon: '⚡' });
      setPlayers(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        next[currentPlayerIndex].status.extraTurn = false;
        return next;
      });
      updatePlayerStats(currentPlayerIndex, stats => ({
        ...stats,
        currentTurnDraw: 0,
      }));
      setHasModifiedBoardThisTurn(false);
      setPlaysThisTurn(0);
      performDraw(1, currentPlayerIndex);
      return;
    }
    setIsHandoff(true);
  }, [applyPendingHandSwap, players, currentPlayerIndex, performDraw, updatePlayerStats]);

  const handleDiscardExpression = () => {
    if (hasModifiedBoardThisTurn) return toast.error("Již jsi provedl akci za tento tah!");

    const current = players[currentPlayerIndex];
    const removableCards = current?.board.filter((card: GameCard) => !card.locked) || [];
    const allCards = removableCards.flatMap((card: GameCard) => flattenCardTree(card));
    if (allCards.length > 0) {
      updatePlayerStats(currentPlayerIndex, stats => ({
        ...stats,
        cardsFromBoardToDiscard: stats.cardsFromBoardToDiscard + allCards.length,
      }));
    }
    
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[currentPlayerIndex];
      const lockedCards = p.board.filter((card: GameCard) => card.locked);
      const removable = p.board.filter((card: GameCard) => !card.locked);
      const removedCards = removable.flatMap((card: GameCard) => flattenCardTree(card));
      setDiscardPile(old => [...old, ...removedCards]);
      p.board = lockedCards;
      return next;
    });
    
    setHasModifiedBoardThisTurn(true);
    toast.info("Celý výraz byl vyhozen do odhazovacího balíčku.");
  };

  const handleEndTurn = () => {
    if (tutorialActive && tutorialStep !== 2) {
      return toast.error("V tutoriálu teď není čas ukončit tah.");
    }
    const p = players[currentPlayerIndex];
    const hasOperatorInHand = p?.hand?.some((card: GameCard) => cardsDatabase[card.symbol]?.type === 'operator') ?? false;
    if (p?.status?.mustPlayOperation && hasOperatorInHand) {
      return toast.error("Musíš v tomto tahu zahrát operaci.");
    }
    if (p?.status?.mustPlayOperation && !hasOperatorInHand) {
      setPlayers(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        if (next[currentPlayerIndex]?.status) {
          next[currentPlayerIndex].status.mustPlayOperation = false;
        }
        return next;
      });
    }
    const handLimit = tutorialActive && tutorialStep === 2 ? 6 : 5;
    if (p.hand.length > handLimit) {
      setIsDiscarding(true);
      toast.warning(`Limit ruky překročen! Musíš zahodit ${p.hand.length - handLimit} karet.`);
      return;
    }
    finalizeTurn();
  };

  const handleDiscard = (cardId: string) => {
    if (tutorialActive && tutorialStep !== 2) {
      toast.error("V tutoriálu teď není dovoleno odhazovat.");
      return;
    }
    if (tutorialActive && tutorialStep === 2 && tutorialAllowedDiscardIds.length > 0 && !tutorialAllowedDiscardIds.includes(cardId)) {
      toast.error("V tutoriálu teď odhazuj jen přebytečné karty.");
      return;
    }
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      
      // DŮLEŽITÉ: Najít hráče podle cardId místo closure currentPlayerIndex
      let discardedCard: GameCard | null = null;
      let activePlayerIdx = -1;
      
      for (let i = 0; i < next.length; i++) {
        const idx = next[i].hand.findIndex((c: GameCard) => c.id === cardId);
        if (idx > -1) {
          activePlayerIdx = i;
          const [removed] = next[i].hand.splice(idx, 1);
          discardedCard = removed;
          break;
        }
      }
      
      if (discardedCard && activePlayerIdx > -1) {
        setDiscardPile(old => [...old, discardedCard]);
        const p = next[activePlayerIdx];
        
        // Kontrola nového počtu karet (po odebrání)
        const handLimit = tutorialActive && tutorialStep === 2 ? 6 : 5;
        if (p.hand.length <= handLimit) {
          setIsDiscarding(false);
          if (tutorialActive) {
            setTutorialDiscardDone(true);
            setHasModifiedBoardThisTurn(false);
            setPlaysThisTurn(0);
          } else {
            // Přechod k dalšímu hráči
            setTimeout(() => {
              applyPendingHandSwap();
              setIsHandoff(true);
            }, 300);
          }
        }
      }
      
      return next;
    });
  };

  const nextTurn = () => {
    let nextIdx = (currentPlayerIndex + playDirection + players.length) % players.length;
    if (players[nextIdx].status?.frozen) {
      toast.info(`${players[nextIdx].name} vynechává.`, { icon: '❄️' });
      setPlayers(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        next[nextIdx].status.frozen = false;
        return next;
      });
      nextIdx = (nextIdx + playDirection + players.length) % players.length;
    }

    setCurrentPlayerIndex(nextIdx);
    setIsHandoff(false);
    setHasModifiedBoardThisTurn(false);
    setPlaysThisTurn(0);
    updatePlayerStats(nextIdx, stats => ({
      ...stats,
      currentTurnDraw: 0,
    }));

    const p = players[nextIdx];
    const totalToDraw = Math.max(0, 1 + (p.status?.extraDraw || 0) - (p.status?.drawReduction || 0));
    
    // Zobrazit počet dobratých karet (kromě prvního kola)
    if (currentPlayerIndex !== 0 && totalToDraw > 0) {
      const drawMessage = totalToDraw === 1 ? '1 karta' : `${totalToDraw} karty`;
      toast.info(`${players[nextIdx].name} dobírá ${drawMessage}`, { icon: '🃏' });
    }
    
    if (totalToDraw > 0) performDraw(totalToDraw, nextIdx);

    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next[nextIdx].status) {
        next[nextIdx].status.extraDraw = 0;
        next[nextIdx].status.drawReduction = 0;
        next[nextIdx].status.notifications = [];
        // Jednokolová omezení — resetovat na začátku nového tahu hráče
        next[nextIdx].status.operationLock = false;
        next[nextIdx].status.numberLock = false;
        next[nextIdx].status.playLimit = null;
        next[nextIdx].status.infinitePlays = false;
      }
      return next;
    });
  };

  // ==========================================
  // 3. MATEMATICKÝ ENGINE
  // ==========================================

  const checkMathEngine = async () => {
    if (tutorialActive && tutorialStep !== 4) {
      return toast.error("V tutoriálu teď ještě neověřuj Q.E.D.");
    }
    if (hasModifiedBoardThisTurn && !(tutorialActive && tutorialStep === 4)) {
      return toast.error("V tomto tahu jsi již akci provedl!");
    }
    const curr = players[currentPlayerIndex];
    const missingSlots = curr.board.flatMap((card: GameCard) => {
      const slots = getSpecialSlots(card.symbol);
      return slots.filter(slot => !card.slotCards?.[slot.key]);
    });
    if (missingSlots.length > 0) {
      return toast.error("Doplň čísla do okének speciálních karet.");
    }
    const expression = parseBoardToMathString(curr.board);
    if (!expression.trim()) return toast.error("Plocha L je prázdná!");
    if (!hasOperation(curr.board)) return toast.error("Výraz L musí obsahovat alespoň jednu operaci!");

    // Validace: nesmí být dvě sousední × nebo ÷ operace vedle sebe
    const mulDivSymbols = new Set(['*', '/', '×', '÷', '·']);
    const hasSideBySideMulDiv = curr.board.some((c, i) => {
      if (i === 0) return false;
      return mulDivSymbols.has(c.symbol) && mulDivSymbols.has(curr.board[i - 1].symbol);
    });
    if (hasSideBySideMulDiv) {
      toast.error("Dvě operace × nebo ÷ nesmí být vedle sebe!");
      const boardCount = curr.board.flatMap((card: GameCard) => flattenCardTree(card)).length;
      if (boardCount > 0) {
        updatePlayerStats(currentPlayerIndex, stats => ({
          ...stats,
          cardsFromBoardToDiscard: stats.cardsFromBoardToDiscard + boardCount,
        }));
      }
      setPlayers(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        setDiscardPile(old => [...old, ...next[currentPlayerIndex].board]);
        next[currentPlayerIndex].board = [];
        return next;
      });
      setHasModifiedBoardThisTurn(true);
      return;
    }
    
    const toastId = toast.loading("Ověřování...");
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const resp = await fetch(`${API_URL}/evaluate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression, target_r: curr.targetR.toString(), modifiers: curr.status?.mathModifiers || [] })
      });
      if (!resp.ok) {
        const errorData = await resp.json();
        toast.error(errorData?.error || "Výpočet se nepodařil.", { id: toastId });
        return;
      }
      const data = await resp.json();
      if (data.success && data.is_match) {
        toast.success("Q.E.D.!", { id: toastId });
        setWinner(curr);
      } else {
        toast.error("Chyba v důkazu!", { id: toastId });
        const boardCount = curr.board.flatMap((card: GameCard) => flattenCardTree(card)).length;
        updatePlayerStats(currentPlayerIndex, stats => ({
          ...stats,
          wrongQEDAttempts: stats.wrongQEDAttempts + 1,
          cardsFromBoardToDiscard: stats.cardsFromBoardToDiscard + boardCount,
        }));
        setGameStats(prev => {
          if (!prev || prev.firstWrongQED) return prev;
          return { ...prev, firstWrongQED: { playerId: curr.id } };
        });
        setPlayers(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          setDiscardPile(old => [...old, ...next[currentPlayerIndex].board]);
          next[currentPlayerIndex].board = [];
          return next;
        });
        setHasModifiedBoardThisTurn(true);
      }
    } catch {
      toast.error("Server offline.", { id: toastId });
    }
  };

  // ==========================================
  // 4. MANIPULACE S PLOCHOU
  // ==========================================

  const addCardToGameState = useCallback((card: GameCard, targetId: string | null, insertPosition?: number) => {
    const slotCards = card.slotCards ?? createSlotCards(card.symbol);
    const cardWithSlots = slotCards ? { ...card, slotCards } : card;
    const cardData = cardsDatabase[cardWithSlots.symbol];
    // Odebrat kartu z ruky a přidat na tabuli okamžitě
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[currentPlayerIndex];
      p.hand = p.hand.filter((c: GameCard) => c.id !== card.id);
      p.syntax = p.syntax.filter((c: GameCard) => c.id !== card.id);
      if (targetId) {
        // Exponent se přidá jen pokud:
        // 1) Cílová karta má canHaveExponent = true
        // 2) Taženou kartou je číslo nebo proměnná (nikoliv operátor)
        const canAddExponent = (targetCard: GameCard): boolean => {
          const targetData = cardsDatabase[targetCard.symbol];
          const cardData = cardsDatabase[cardWithSlots.symbol];
          const isCardNumOrVar = cardData?.type === 'number' || cardData?.type === 'variable';
          return (targetData?.canHaveExponent === true) && isCardNumOrVar;
        };
        
        const update = (cs: GameCard[]): GameCard[] => cs.map(c =>
          c.id === targetId && canAddExponent(c) ? { ...c, exponent: card } : (c.exponent ? { ...c, exponent: update([c.exponent])[0] } : c)
        );
        p.board = update(p.board);
      } else if (insertPosition !== undefined) {
        // Vložit kartu na specifickou pozici
        p.board.splice(insertPosition, 0, cardWithSlots);
      } else {
        p.board.push(cardWithSlots);
      }
      if (p.status && cardData?.type === 'operator') {
        p.status.mustPlayOperation = false;
      }
      return next;
    });

    updatePlayerStats(currentPlayerIndex, stats => ({
      ...stats,
      cardsToBoard: stats.cardsToBoard + 1,
    }));

    setHasModifiedBoardThisTurn(true);
    setPlaysThisTurn(prev => prev + 1);
    setPendingEffect(null);
  }, [currentPlayerIndex, updatePlayerStats]);

  const setIntegralVariable = useCallback((cardId: string, variable: 'x' | 'y') => {
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const update = (cards: GameCard[]): GameCard[] => cards.map(c => {
        if (c.id === cardId) return { ...c, integralVariable: variable };
        return c.exponent ? { ...c, exponent: update([c.exponent])[0] } : c;
      });
      if (next[currentPlayerIndex]) {
        next[currentPlayerIndex].board = update(next[currentPlayerIndex].board);
      }
      return next;
    });
  }, [currentPlayerIndex]);

  const setDerivativeVariable = useCallback((cardId: string, variable: 'x' | 'y') => {
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const update = (cards: GameCard[]): GameCard[] => cards.map(c => {
        if (c.id === cardId) return { ...c, derivativeVariable: variable };
        return c.exponent ? { ...c, exponent: update([c.exponent])[0] } : c;
      });
      if (next[currentPlayerIndex]) {
        next[currentPlayerIndex].board = update(next[currentPlayerIndex].board);
      }
      return next;
    });
  }, [currentPlayerIndex]);

  const setSeriesVariable = useCallback((cardId: string, variable: 'x' | 'y') => {
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const update = (cards: GameCard[]): GameCard[] => cards.map(c => {
        if (c.id === cardId) return { ...c, seriesVariable: variable };
        return c.exponent ? { ...c, exponent: update([c.exponent])[0] } : c;
      });
      if (next[currentPlayerIndex]) {
        next[currentPlayerIndex].board = update(next[currentPlayerIndex].board);
      }
      return next;
    });
  }, [currentPlayerIndex]);

  const setLimitVariable = useCallback((cardId: string, variable: 'x' | 'y') => {
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const update = (cards: GameCard[]): GameCard[] => cards.map(c => {
        if (c.id === cardId) return { ...c, limitVariable: variable };
        return c.exponent ? { ...c, exponent: update([c.exponent])[0] } : c;
      });
      if (next[currentPlayerIndex]) {
        next[currentPlayerIndex].board = update(next[currentPlayerIndex].board);
      }
      return next;
    });
  }, [currentPlayerIndex]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (tutorialActive) {
      if (tutorialStep === 2) {
        if (String(over.id) !== 'drop-discard') {
          toast.error("V tutoriálu teď odhazuj karty.");
          return;
        }
      } else if (tutorialStep !== 3) {
        toast.error("V tutoriálu teď nemůžeš s kartami hýbat.");
        return;
      } else if (tutorialStep === 3 && String(over.id) === 'drop-discard') {
        toast.error("V tutoriálu teď neodhazuj karty.");
        return;
      }
    }

    // Pomocná funkce pro výpočet insertPosition ze zone ID
    const getInsertPosition = (overId: string): number | undefined => {
      if (overId.includes('-before-')) return 0;
      if (overId.includes('-between-')) {
        const m = overId.match(/-between-(\d+)-(\d+)/);
        return m ? parseInt(m[2]) : undefined;
      }
      if (overId.includes('-after-')) return players[currentPlayerIndex].board.length;
      if (overId === 'main-board' || overId.startsWith('main-board')) return players[currentPlayerIndex].board.length;
      return undefined;
    };

    // ── ZÁVORKA DRAG ──
    const openSymbols = ['(', '[', '{'];
    const closeSymbols = [')', ']', '}'];
    const syntaxCard = players[currentPlayerIndex].syntax.find(c => c.id === active.id);
    if (syntaxCard) {
      const overId = String(over.id);
      const insertPos = getInsertPosition(overId);

      if (openSymbols.includes(syntaxCard.symbol) && insertPos !== undefined) {
        // Fáze LEFT: hráč umístil otevírací závorku
        if (bracketMode) return toast.error("Nejprve dokonči umístění závorky.");
        const pairIndex = openSymbols.indexOf(syntaxCard.symbol);
        setBracketMode({ leftInsertPosition: insertPos, pairIndex });
        toast.info("Nyní přetáhni pravou závorku na místo v tabuli.", { icon: ')' });
        return;
      }

      if (closeSymbols.includes(syntaxCard.symbol) && insertPos !== undefined && bracketMode) {
        // Fáze RIGHT: hráč umístil uzavírací závorku
        const { leftInsertPosition, pairIndex } = bracketMode;
        if (insertPos <= leftInsertPosition) {
          return toast.error("Pravá závorka musí být za levou!");
        }
        // Validace obsahu závorek
        const board = players[currentPlayerIndex].board;
        const cardsInBrackets = board.slice(leftInsertPosition, insertPos);
        const hasValidContent = cardsInBrackets.some(c => {
          const cd = cardsDatabase[c.symbol];
          return cd?.type === 'number' || cd?.type === 'variable' || c.symbol === 'π';
        });
        if (!hasValidContent) {
          return toast.error("V závorkách musí být alespoň jedno číslo nebo proměnná!");
        }
        // Získej závorky ze syntax
        const lB = players[currentPlayerIndex].syntax.find(c => c.symbol === openSymbols[pairIndex]);
        const rB = players[currentPlayerIndex].syntax.find(c => c.symbol === closeSymbols[pairIndex]);
        if (!lB || !rB) return;
        // Vlož závorky do boardu
        setPlayers(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          const player = next[currentPlayerIndex];
          player.syntax = player.syntax.filter((c: GameCard) => c.id !== lB.id && c.id !== rB.id);
          player.board.splice(leftInsertPosition, 0, lB);
          player.board.splice(insertPos + 1, 0, rB);
          return next;
        });
        updatePlayerStats(currentPlayerIndex, stats => ({
          ...stats,
          bracketPairsUsed: stats.bracketPairsUsed + 1,
        }));
        setBracketMode(null);
        setHasModifiedBoardThisTurn(true);
        setPlaysThisTurn(prev => prev + 1);
        toast.success("Závorky umístěny!", { icon: '✓' });
        if (tutorialActive && tutorialStep === 3 && !tutorialBracketInfoShown) {
          setTutorialBracketInfoShown(true);
          toast.info("Ve hře máš 3 páry závorek: (), [], {}. Můžeš použít libovolný typ.");
        }
        return;
      }
      return; // Syntax karta bez validní drop zóny – ignoruj
    }

    if (over.id === 'drop-discard') {
      const cardInHand = players[currentPlayerIndex].hand.find(c => c.id === active.id);
      if (cardInHand) {
        if (!isDiscarding) return toast.error("Odhazovat lze jen na konci tahu.");
        handleDiscard(active.id as string);
      } else {
        if (hasModifiedBoardThisTurn) return toast.error("Již jsi provedl akci.");
        const isLocked = (cards: GameCard[]): boolean => cards.some(c => {
          if (c.id === active.id) return !!c.locked;
          return c.exponent ? isLocked([c.exponent]) : false;
        });
        if (isLocked(players[currentPlayerIndex].board)) {
          return toast.error("Tuto kartu nelze odhodit.");
        }
        const { removed, newCards } = removeCardRecursively(players[currentPlayerIndex].board, active.id as string);
        if (removed) {
          setPlayers(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            next[currentPlayerIndex].board = newCards;
            return next;
          });
          const removedCards = flattenCardTree(removed);
          setDiscardPile(old => [...old, ...removedCards]);
          updatePlayerStats(currentPlayerIndex, stats => ({
            ...stats,
            cardsFromBoardToDiscard: stats.cardsFromBoardToDiscard + removedCards.length,
          }));
          setHasModifiedBoardThisTurn(true);
        }
      }
      return;
    }

    const slotData = over.data.current as SlotDropData | undefined;
    if (slotData?.slotKey && slotData?.parentId) {
      const slotCard = players[currentPlayerIndex].hand.find(c => c.id === active.id);
      if (!slotCard) return;
      if (hasModifiedBoardThisTurn) return toast.error("Za kolo smíš z ruky provést pouze 1 akci!");

      const slotCardData = cardsDatabase[slotCard.symbol];
      if (slotCardData?.type === 'operator' || slotCardData?.type === 'syntax') {
        return toast.error("Do okénka lze vložit jen čísla nebo symboly.");
      }
      if (players[currentPlayerIndex].status?.mustPlayOperation) {
        return toast.error("Musíš v tomto tahu zahrát operaci.");
      }
      if (players[currentPlayerIndex].status?.numberLock) {
        return toast.error("Tento tah nesmíš hrát číslo! (Zákaz čísel ∏)");
      }

      setPlayers(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        const p = next[currentPlayerIndex];
        p.hand = p.hand.filter((c: GameCard) => c.id !== slotCard.id);

        const updateSlot = (cards: GameCard[]): GameCard[] => cards.map(c => {
          if (c.id === slotData.parentId) {
            const slotCards = c.slotCards ?? createSlotCards(c.symbol) ?? {};
            const existing = slotCards[slotData.slotKey] || null;
            slotCards[slotData.slotKey] = slotCard;
            if (existing) p.hand.push(existing);
            return { ...c, slotCards };
          }
          return c.exponent ? { ...c, exponent: updateSlot([c.exponent])[0] } : c;
        });

        p.board = updateSlot(p.board);
        return next;
      });

      updatePlayerStats(currentPlayerIndex, stats => ({
        ...stats,
        cardsToBoard: stats.cardsToBoard + 1,
      }));

      setHasModifiedBoardThisTurn(true);
      setPlaysThisTurn(prev => prev + 1);
      return;
    }

    // Zjistíme jestli karta pochází z ruky nebo syntax (tj. jde o novou akci)
    const card = players[currentPlayerIndex].hand.find(c => c.id === active.id) || 
                 players[currentPlayerIndex].syntax.find(c => c.id === active.id);

    const overId = String(over.id);
    let targetId: string | null = null;
    let insertPosition: number | undefined = undefined;
    let forceAfterDxDy = false;
    const beforeDxDyCount = players[currentPlayerIndex].board.filter(c => !c.afterDxDy).length;

    // Pokud uživatel už akci tento tah provedl, chceme zjistit, jestli jde JEN o přesazení karty uvnitř boardu
    // Pokud je karta POUZE na tabuli (není v ruce ani v syntax), má povoleno se přesouvat.
    const isOnlyOnBoard = !card && players[currentPlayerIndex].board.some(c => c.id === active.id);
    const pStatus = players[currentPlayerIndex].status;
    if (pStatus?.playLimit !== null && pStatus?.playLimit !== undefined && playsThisTurn >= pStatus.playLimit) {
      return toast.error("Tento tah už nesmíš vyložit další kartu!");
    }
    if (hasModifiedBoardThisTurn && !isOnlyOnBoard && !pStatus?.infinitePlays) {
      return toast.error("Za kolo smíš z ruky provést pouze 1 akci!");
    }
    
    // DŮLEŽITÉ: Pokud se karta nenajde, zkusíme ji z active.data
    // Zde buď našla karta z hand/syntax, NEBO isOnlyOnBoard si ji vezme z active.data
    const cardToPlace = card || (active.data.current as GameCard | undefined);
    if (!cardToPlace) {
      toast.error("Chyba: Karta se nenašla. Zkus to znova.");
      return;
    }

    if (cardToPlace.locked) {
      return toast.error("Tuto kartu nelze přesouvat.");
    }
    
    // Rozpoznání typu drop zóny
    if (overId.startsWith('drop-exponent-')) {
      targetId = (over.data.current as DropData).parentId;
    } else if (overId.startsWith('main-board-after-dxdy-')) {
      const match = overId.match(/main-board-after-dxdy-(\d+)/);
      if (match) {
        insertPosition = parseInt(match[1]);
        forceAfterDxDy = true;
      }
    } else if (overId.includes('-before-')) {
      // Drop před první kartou
      insertPosition = 0;
    } else if (overId.includes('-between-')) {
      // Drop mezi kartami - najdeme pozici
      const match = overId.match(/-between-(\d+)-(\d+)/);
      if (match) {
        insertPosition = parseInt(match[2]); // Pozice za první kartou
      }
    } else if (overId.includes('-after-')) {
      // Drop za poslední kartou
      insertPosition = players[currentPlayerIndex].board.length;
    } else if (overId === 'main-board') {
      // Drop na hlavní plochu - přidat na konec
      insertPosition = players[currentPlayerIndex].board.length;
    }

    const placeAfterDxDy = insertPosition !== undefined
      ? (forceAfterDxDy || insertPosition > beforeDxDyCount)
      : undefined;
    const cardToPlaceWithDxDy = placeAfterDxDy !== undefined && !isOnlyOnBoard
      ? { ...cardToPlace, afterDxDy: placeAfterDxDy }
      : cardToPlace;

    if (cardToPlaceWithDxDy.symbol === '∫') {
      setIntegralSetup({ card: cardToPlaceWithDxDy, targetId, insertPosition });
    } else if (cardsDatabase[cardToPlaceWithDxDy.symbol]?.hasEffect && !tutorialActive && !isOnlyOnBoard) {
      setPendingEffect({ card: cardToPlaceWithDxDy, targetId, insertPosition });
    } else {
      // --- ENFORCE RESTRICTION FLAGS ---
      const cardData = cardsDatabase[cardToPlaceWithDxDy.symbol];

      // EFF_016: operationLock — nesmí hrát operace
      if (pStatus?.operationLock && cardData?.type === 'operator') {
        return toast.error("Tento tah nesmíš hrát kartu operace! (Zákaz operací ∑)");
      }
      // EFF_023: numberLock — nesmí hrát čísla
      if (pStatus?.numberLock && cardData?.type === 'number') {
        return toast.error("Tento tah nesmíš hrát číslo! (Zákaz čísel ∏)");
      }
      // EFF_006: mustPlayOperation — musí hrát operaci
      if (pStatus?.mustPlayOperation && cardData?.type !== 'operator') {
        return toast.error("Musíš hrát kartu operace! Tak ti nařídil soupeř (+).");
      }
      // EFF_013: playLimit — smí hrát jen N karet za tah (sledujeme kolik již zahrál)
      // (playLimit resets each turn via nextTurn clearing; we track via hasModifiedBoardThisTurn for limit=1)
      // The basic limit=1 case: hasModifiedBoardThisTurn already catches it (same error path above)

      // Speciální funkce pro pouhý přesun na tabuli
      if (isOnlyOnBoard) {
        setPlayers(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          const p = next[currentPlayerIndex];
          const originIndex = p.board.findIndex((c: GameCard) => c.id === cardToPlace.id);
          
           if (originIndex !== -1 && targetId === null && insertPosition !== undefined) {
             // Zjistíme posun indexování
             let adjustedPos = insertPosition;
             if (originIndex < insertPosition) adjustedPos -= 1;
             
             // Přemístíme
             const [movedCard] = p.board.splice(originIndex, 1);
             if (placeAfterDxDy !== undefined) {
              movedCard.afterDxDy = placeAfterDxDy;
             }
             p.board.splice(adjustedPos, 0, movedCard);
          } else if (originIndex !== -1 && targetId) {
             // Přidání k exponentu uvnitř tabule
             const [movedCard] = p.board.splice(originIndex, 1);
             
             const canAddExponent = (targetCard: GameCard): boolean => {
               const targetData = cardsDatabase[targetCard.symbol];
               const cardData = cardsDatabase[movedCard.symbol];
               const isCardNumOrVar = cardData?.type === 'number' || cardData?.type === 'variable';
               return (targetData?.canHaveExponent === true) && isCardNumOrVar;
             };
             
             const update = (cs: GameCard[]): GameCard[] => cs.map(c =>
               c.id === targetId && canAddExponent(c) ? { ...c, exponent: movedCard } : (c.exponent ? { ...c, exponent: update([c.exponent])[0] } : c)
             );
             p.board = update(p.board);
          }
          return next;
        });
        // Úmyslně se ZDE NEVOLÁ setHasModifiedBoardThisTurn(true)!
        setPendingEffect(null);
      } else {
        addCardToGameState(cardToPlaceWithDxDy, targetId, insertPosition);
      }
    }
  }, [currentPlayerIndex, players, isDiscarding, hasModifiedBoardThisTurn, addCardToGameState, bracketMode, updatePlayerStats]);

  // ==========================================
  // 5. EFEKTY A CÍLENÍ
  // ==========================================

  const handleEffectChoice = (choice: 'ACTIVATE' | 'NONE', targetPlayerId?: number, targetCardId?: string) => {
  if (!pendingEffect) return;
  
  let metadata: any = undefined;

  if (choice === 'ACTIVATE') {
    const effect = cardsDatabase[pendingEffect.card.symbol]?.effects?.optionA;
    if (effect) {
      const activeId = effect.id;

      // Pokud efekt vyžaduje kartu soupeře a ID karty ještě nemáme, zapneme TargetingMode
      const cardTargetingEffects = ['EFF_002'];
      if (cardTargetingEffects.includes(activeId) && !targetCardId) {
        setTargetingMode({ effectId: activeId, targetPlayerId });
        setEffectStep('CHOOSE_EFFECT');
        return; // Zastavíme funkci, dokud hráč neklikne na kartu na stole soupeře
      }

      // --- 2. OKAMŽITÉ AKCE ---
      // EFF_001: draw 1 immediately; EFF_008 only gives extraDraw for NEXT turn (handled in applyEffectLogic)
      const immediateDraw: Record<string, number> = { "EFF_001": 1 };
      if (immediateDraw[activeId]) performDraw(immediateDraw[activeId], currentPlayerIndex);

      // --- 3. APLIKACE LOGIKY EFEKTU ---
      const playersForEffect = players.map((p, idx) => {
        if (idx !== currentPlayerIndex) return p;
        return { ...p, hand: p.hand.filter((c: GameCard) => c.id !== pendingEffect.card.id) };
      });
      const effectResult = applyEffectLogic(
        activeId, playersForEffect, currentPlayerIndex, targetPlayerId, targetCardId, pendingEffect.card, difficulty
      );

      // Zpracování EffectResult s metadaty
      const resultPlayers = Array.isArray(effectResult) ? effectResult : effectResult.players;
      metadata = !Array.isArray(effectResult) ? effectResult.metadata : undefined;

      if (metadata?.handSwapDirection) {
        setPendingHandSwap({
          direction: metadata.handSwapDirection,
          snapshot: playersForEffect.map(p => ({
            playerId: p.id,
            hand: p.hand.map(card => ({ ...card }))
          }))
        });
      }

      setPlayers(resultPlayers);

      // --- SPECIÁLNÍ EFEKTY S UI DIALOGY ---
      if (metadata?.deckPreviewTriggered) {
        // EFF_009: Náhled a přerovnání balíčku
        setDeckPreviewMode({ originalDeck: deck });
        addCardToGameState(pendingEffect.card, pendingEffect.targetId, pendingEffect.insertPosition);
        return;
      }

      if (metadata?.moduloOperationTriggered) {
        // EFF_012: Výběr čísla z ruky
        setModuloMode({ activePlayerIndex: currentPlayerIndex, targetPlayerId });
        addCardToGameState(pendingEffect.card, pendingEffect.targetId, pendingEffect.insertPosition);
        return;
      }

      if (metadata?.turnOrderReversed) {
        // EFF_025: pořadí hráčů bylo obráceno — najdeme nový index aktivního hráče
        const activePlayerId = players[currentPlayerIndex].id;
        const resultPlayers = Array.isArray(effectResult) ? effectResult : effectResult.players;
        const newActiveIndex = resultPlayers.findIndex((p: { id: number }) => p.id === activePlayerId);
        setCurrentPlayerIndex(newActiveIndex >= 0 ? newActiveIndex : 0);
      }

      // --- 5. POLOŽENÍ KARTY NA PLOCHU L ---
      // Karta se po využití efektu stává součástí plochy L
      addCardToGameState(pendingEffect.card, pendingEffect.targetId, pendingEffect.insertPosition);

      toast.success(`Efekt ${effect.name} aktivován!`);
    }
  } else {
    // --- VOLBA 'NONE': POLOŽENÍ NA PLOCHU L ---
    addCardToGameState(pendingEffect.card, pendingEffect.targetId, pendingEffect.insertPosition);
  }

  // Úklid po akci (pokud nebyly speciální efekty)
  if (!metadata?.deckPreviewTriggered && !metadata?.moduloOperationTriggered) {
    setPendingEffect(null);
    setTargetingMode(null);
    setEffectStep('CHOOSE_EFFECT');
    setChosenEffectChoice(null);
  }
};

  // ==========================================
  // 6. SPECIÁLNÍ EFEKTY - DECK PREVIEW (EFF_009)
  // ==========================================

  const handleDeckPreviewConfirm = useCallback((reorderedCards: GameCard[]) => {
    // Aktualizuj deck s přeřazenými kartami
    setDeck(reorderedCards);
    
    // Úklid UI stavů
    setDeckPreviewMode(null);
    setPendingEffect(null);
    setTargetingMode(null);
    setEffectStep('CHOOSE_EFFECT');
    setChosenEffectChoice(null);
    
    toast.success("Balíček byl přerovnán!");
  }, []);

  // ==========================================
  // 7. SPECIÁLNÍ EFEKTY - MODULO OPERATION (EFF_012)
  // ==========================================

  const handleModuloSelect = useCallback((selectedNumber: number) => {
    // Aplikuj modulo operaci na cílového hráče
    if (!moduloMode) return;

    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const targetIdx = next.findIndex((p: Player) => p.id === (moduloMode.targetPlayerId || moduloMode.activePlayerIndex));
      
      if (targetIdx !== -1) {
        const target = next[targetIdx];
        if (typeof target.targetR === 'number') {
          target.targetR = target.targetR % selectedNumber;
          target.status.notifications.push(`🔢 Tvůj cíl R byl změněn dělením modulo(${selectedNumber}) na: ${target.targetR}`);
        }
      }
      return next;
    });

    // Úklid UI stavů
    setModuloMode(null);
    setPendingEffect(null);
    setTargetingMode(null);
    setEffectStep('CHOOSE_EFFECT');
    setChosenEffectChoice(null);
    
    toast.success("Modulo operace aplikována!");
  }, [moduloMode]);

  const cancelBracketMode = () => {
    setBracketMode(null);
    toast.info("Umístění závorky zrušeno.");
  };

  const handleIntegralSubmit = (lower: number | null, upper: number | null, usedCardIds: string[]) => {
    if (!integralSetup) return;
    const finalLower = lower ?? Math.floor(Math.random() * 10) + 1;
    const finalUpper = upper ?? Math.floor(Math.random() * 10) + 1;
    const cardWithBounds: GameCard = { ...integralSetup.card, integralBounds: { lower: finalLower, upper: finalUpper } };
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[currentPlayerIndex].hand = next[currentPlayerIndex].hand.filter((c: GameCard) => !usedCardIds.includes(c.id));
      return next;
    });
    addCardToGameState(cardWithBounds, integralSetup.targetId, integralSetup.insertPosition);
    setIntegralSetup(null);
  };

  const handleStartGame = (configuredPlayers: {name: string, theme: string}[]) => {
    const initialDeck = generateFilteredDeck(difficulty);
    const vsCards = ['int', 'd/dx', '∑', '∏', 'lim'];
    const newPlayers: Player[] = configuredPlayers.map((p, i) => ({
      id: i, name: p.name, theme: p.theme, hand: [], board: [],
      targetR: generatePersonalTargetR(difficulty),
      syntax: [
        { id: `p${i}-l1`, symbol: '(' }, { id: `p${i}-r1`, symbol: ')' },  // Pár 1: kulaté
        { id: `p${i}-l2`, symbol: '[' }, { id: `p${i}-r2`, symbol: ']' },  // Pár 2: hranaté
        { id: `p${i}-l3`, symbol: '{' }, { id: `p${i}-r3`, symbol: '}' },  // Pár 3: složené
        { id: `p${i}-eq`, symbol: '=' }
      ],
      status: { mathModifiers: [], extraTurn: false, frozen: false, extraDraw: 0, drawReduction: 0, notifications: [] }
    }));

    if (difficulty === 'VŠ') {
      newPlayers.forEach((player, idx) => {
        const picked = vsCards[Math.floor(Math.random() * vsCards.length)];
        player.board.push({
          id: `vs-${idx}-${picked}-${Date.now()}`,
          symbol: picked,
          locked: true,
          slotCards: createSlotCards(picked),
        });
      });
    }

    // Deal 5 cards to each player
    const deckCopy = [...initialDeck];
    newPlayers.forEach(player => {
      for (let i = 0; i < 5; i++) {
        const drawn = deckCopy.pop();
        if (drawn) {
          player.hand.push({ ...drawn, id: `h-${drawn.symbol}-${Date.now()}-${Math.random().toString(36).substring(2,5)}` });
        }
      }
    });

    // Starting player draws 6th card
    const drawn = deckCopy.pop();
    if (drawn) {
      newPlayers[0].hand.push({ ...drawn, id: `h-${drawn.symbol}-${Date.now()}-${Math.random().toString(36).substring(2,5)}` });
    }

    setDeck(deckCopy);
    setPlayers(newPlayers);
    resetGameStats(newPlayers);
    setPendingHandSwap(null);
    setGamePhase('PLAYING');
  };

  const handleStartTutorial = () => {
    const makeCard = (symbol: string, prefix: string) => ({
      id: `${prefix}-${symbol}-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
      symbol
    });

    const p1HandSymbols = ['2', '*', 'sin(π/2)', '+', '3', '2', '7', '8', '4', '9'];
    const p1Hand = p1HandSymbols.map(sym => makeCard(sym, 't1'));
        const referenceBoard: GameCard[] = [
          makeCard('(', 'ref'),
          makeCard('2', 'ref'),
          makeCard('*', 'ref'),
          makeCard('sin(π/2)', 'ref'),
          makeCard('+', 'ref'),
          { ...makeCard('3', 'ref'), exponent: makeCard('2', 'ref-exp') },
          makeCard(')', 'ref'),
        ];

    const discardableIds = p1Hand.filter(c => ['7', '8', '4', '9'].includes(c.symbol)).map(c => c.id);

    const newPlayers: Player[] = [
      {
        id: 0,
        name: 'Matematik 1',
        theme: 'bg-violet-600/60',
        hand: p1Hand,
        board: [],
        targetR: 11,
        syntax: [
          { id: `t1-l1`, symbol: '(' }, { id: `t1-r1`, symbol: ')' },
          { id: `t1-l2`, symbol: '[' }, { id: `t1-r2`, symbol: ']' },
          { id: `t1-l3`, symbol: '{' }, { id: `t1-r3`, symbol: '}' },
          { id: `t1-eq`, symbol: '=' }
        ],
        status: { mathModifiers: [], extraTurn: false, frozen: false, extraDraw: 0, drawReduction: 0, notifications: [] }
      },
      {
        id: 1,
        name: 'Matematik 2',
        theme: 'bg-emerald-600/60',
        hand: [],
        board: [],
        targetR: 0,
        syntax: [
          { id: `t2-l1`, symbol: '(' }, { id: `t2-r1`, symbol: ')' },
          { id: `t2-l2`, symbol: '[' }, { id: `t2-r2`, symbol: ']' },
          { id: `t2-l3`, symbol: '{' }, { id: `t2-r3`, symbol: '}' },
          { id: `t2-eq`, symbol: '=' }
        ],
        status: { mathModifiers: [], extraTurn: false, frozen: false, extraDraw: 0, drawReduction: 0, notifications: [] }
      }
    ];

    setDifficulty('ZŠ');
    setDeck([]);
    setDiscardPile([]);
    setPlayers(newPlayers);
    setCurrentPlayerIndex(0);
    setIsHandoff(false);
    setWinner(null);
    setHasModifiedBoardThisTurn(false);
    setPlaysThisTurn(0);
    resetGameStats(newPlayers);
    setPendingHandSwap(null);

    setTutorialAllowedDiscardIds(discardableIds);
    setTutorialActive(true);
    setTutorialStep(0);
    setTutorialDiscardDone(false);
    setTutorialReferenceBoard(referenceBoard);
    setTutorialBracketInfoShown(false);

    setGamePhase('PLAYING');
  };

  const resetTutorial = () => {
    handleStartTutorial();
  };

  const skipTutorial = () => {
    setTutorialActive(false);
    setTutorialStep(0);
    setTutorialDiscardDone(false);
    setTutorialAllowedDiscardIds([]);
    setTutorialReferenceBoard([]);
    setTutorialBracketInfoShown(false);
    setWinner(null);
    setDeck([]);
    setDiscardPile([]);
    setPlayers([]);
    setIsHandoff(false);
    setHasModifiedBoardThisTurn(false);
    setPlaysThisTurn(0);
    setGameStats(null);
    setGameSummaryOpen(false);
    setPendingHandSwap(null);
    setGamePhase('PICK_MODE');
  };

  const returnToModeSelect = () => {
    setTutorialActive(false);
    setTutorialStep(0);
    setTutorialDiscardDone(false);
    setTutorialAllowedDiscardIds([]);
    setTutorialReferenceBoard([]);
    setTutorialBracketInfoShown(false);
    setWinner(null);
    setDeck([]);
    setDiscardPile([]);
    setPlayers([]);
    setIsHandoff(false);
    setHasModifiedBoardThisTurn(false);
    setPlaysThisTurn(0);
    setGameStats(null);
    setGameSummaryOpen(false);
    setPendingHandSwap(null);
    setGamePhase('PICK_MODE');
  };

  const openLeaveGameConfirm = () => {
    setLeaveGameConfirmOpen(true);
  };

  const closeLeaveGameConfirm = () => {
    setLeaveGameConfirmOpen(false);
  };

  const openGameSummary = () => {
    setGameSummaryOpen(true);
  };

  const closeGameSummary = () => {
    setGameSummaryOpen(false);
  };

  const confirmLeaveGame = () => {
    setLeaveGameConfirmOpen(false);
    returnToModeSelect();
  };

  const isTutorialExpressionReady = useCallback((board: GameCard[]) => {
    const openSet = new Set(['(', '[', '{']);
    const closeSet = new Set([')', ']', '}']);
    const sequence = ['OPEN', '2', '*', 'sin(π/2)', '+', '3', 'CLOSE'];
    let seqIndex = 0;
    let exponentBase: GameCard | null = null;
    for (const card of board) {
      const expected = sequence[seqIndex];
      const matches = (expected === 'OPEN' && openSet.has(card.symbol)) ||
        (expected === 'CLOSE' && closeSet.has(card.symbol)) ||
        card.symbol === expected;
      if (matches) {
        if (sequence[seqIndex] === '3') exponentBase = card;
        seqIndex += 1;
        if (seqIndex === sequence.length) break;
      }
    }
    if (seqIndex !== sequence.length || !exponentBase) return false;
    return exponentBase.exponent?.symbol === '2';
  }, []);

  useEffect(() => {
    if (!tutorialActive) return;
    const current = players[currentPlayerIndex];
    if (!current) return;

    if (tutorialStep === 2 && tutorialDiscardDone) {
      setTutorialStep(3);
    }
    if (tutorialStep === 3 && isTutorialExpressionReady(current.board)) {
      setTutorialStep(4);
    }
    if (tutorialStep === 4 && winner) {
      setTutorialStep(5);
    }
  }, [tutorialActive, tutorialStep, tutorialDiscardDone, players, currentPlayerIndex, winner, isTutorialExpressionReady]);

  return {
    state: {
      gamePhase, difficulty, players, currentPlayerIndex, deck, discardPile,
      isHandoff, winner, pendingEffect, effectStep, chosenEffectChoice,
      targetingMode, minigameMode, bracketMode, integralSetup,
      isDiscarding, hasModifiedBoardThisTurn, playDirection,
      deckPreviewMode, moduloMode,
      tutorialActive, tutorialStep, tutorialReferenceBoard,
      leaveGameConfirmOpen, gameSummaryOpen, gameStats
    },
    actions: {
      setGamePhase, setDifficulty, handleStartGame, handleStartTutorial, handleEndTurn, handleDiscard,
      nextTurn, checkMathEngine, handleEffectChoice, handleIntegralSubmit,
      handleDragEnd, cancelBracketMode, setMinigameMode, setBracketMode,
      setTargetingMode, setIntegralSetup, setPendingEffect, setEffectStep,
      setChosenEffectChoice, setPlayers, addCardToGameState, handleDiscardExpression,
      setIntegralVariable, setDerivativeVariable, setSeriesVariable, setLimitVariable,
      handleDeckPreviewConfirm, handleModuloSelect, setDeckPreviewMode, setModuloMode,
      setTutorialStep, resetTutorial, skipTutorial, returnToModeSelect,
      openLeaveGameConfirm, closeLeaveGameConfirm, confirmLeaveGame,
      openGameSummary, closeGameSummary
    }
  };
}