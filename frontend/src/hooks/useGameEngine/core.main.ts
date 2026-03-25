import { useState, useCallback, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { toast } from "sonner";

import { cardsDatabase } from '@/data/cardsDB';
import { applyEffectLogic } from '@/lib/effects';
import {
  parseBoardToMathString,
  hasOperation,
  getSpecialSlots,
  createSlotCards,
  type DifficultyMode
} from '@/lib/gameHelpers';
import { evaluateExpression } from '@/lib/mathEngine';
import type { GameCard, Player } from '@/lib/effects';
import type { DropData, SlotDropData } from '@/components/game/Cards';
import type {
  GameStats,
  PendingEffectState,
  PlayerSummaryStats,
  RemoveResult,
} from './types';
import {
  createGameStats,
  createTutorialStepCard,
  mergeCardIntoSlotValue,
} from './helpers';
import { prepareInitialGameState, prepareTutorialState } from './core.gameSetup';
import { isTutorialExpressionReady } from './core.tutorial';

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
  const [tutorialAllowedDiscardIds, setTutorialAllowedDiscardIds] = useState<string[]>([]);
  const [tutorialReferenceBoard, setTutorialReferenceBoard] = useState<GameCard[]>([]);
  const [tutorialBracketInfoShown, setTutorialBracketInfoShown] = useState(false);
  const [tutorialTwosAdded, setTutorialTwosAdded] = useState(false);
  const [leaveGameConfirmOpen, setLeaveGameConfirmOpen] = useState(false);

  // --- STAVY PRO UI A EFEKTY ---
  const [pendingEffect, setPendingEffect] = useState<PendingEffectState | null>(null);
  const [effectStep, setEffectStep] = useState<'CHOOSE_EFFECT' | 'CHOOSE_TARGET'>('CHOOSE_EFFECT');
  const [chosenEffectChoice, setChosenEffectChoice] = useState<'ACTIVATE' | null>(null);
  const [targetingMode, setTargetingMode] = useState<{ effectId: string, targetPlayerId?: number } | null>(null);
  const [minigameMode, setMinigameMode] = useState<{ effectId: string, cards: GameCard[], targetPlayerId?: number } | null>(null);
  const [bracketMode, setBracketMode] = useState<{ leftInsertPosition: number; pairIndex: number } | null>(null);
  const [integralSetup, setIntegralSetup] = useState<{ card: GameCard, targetId: string | null, insertPosition?: number } | null>(null);
  const [deckPreviewMode, setDeckPreviewMode] = useState<{ originalDeck: GameCard[], reorderedDeck?: GameCard[] } | null>(null);
  const [moduloMode, setModuloMode] = useState<{ activePlayerIndex: number, targetPlayerId?: number } | null>(null);

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
        if (c.slotCards) {
          Object.entries(c.slotCards).forEach(([key, slotCard]) => {
            if (!slotCard || removed) return;
            const res = runRemoval([slotCard], id);
            if (res.removed) {
              removed = res.removed;
              c.slotCards![key] = res.newCards.length > 0 ? res.newCards[0] : null;
            }
          });
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
      if (node.slotCards) {
        Object.values(node.slotCards).forEach(slotCard => {
          if (slotCard) flatList.push(...runFlatten(slotCard));
        });
      }
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
          p.hand.push({ ...drawn, id: `h-${drawn.symbol}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}` });
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
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next[currentPlayerIndex]?.status) {
        next[currentPlayerIndex].status.playAnyAsZeroReady = false;
      }
      return next;
    });
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

  const grantTutorialStep3SupportCard = useCallback((): string | null => {
    let grantedSymbol: string | null = null;

    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[currentPlayerIndex];
      if (!p) return prev;

      const hasInHand = (symbol: string) => p.hand.some((card: GameCard) => card.symbol === symbol);
      const countTwosInTree = (cards: GameCard[]): number => cards.reduce((acc, card) => {
        let total = acc + (card.symbol === '2' ? 1 : 0);
        if (card.exponent) total += countTwosInTree([card.exponent]);
        if (card.slotCards) {
          Object.values(card.slotCards).forEach(slotCard => {
            if (slotCard) total += countTwosInTree([slotCard]);
          });
        }
        return total;
      }, 0);
      const powerCardsOnBoard = p.board.filter((card: GameCard) => card.symbol === 'a^b');
      const hasPowerOnBoard = powerCardsOnBoard.length > 0;
      const hasPowerWithoutExponent = powerCardsOnBoard.some((card: GameCard) => !card.slotCards?.single);
      const totalTwos = p.hand.filter((card: GameCard) => card.symbol === '2').length + countTwosInTree(p.board);

      if (!hasPowerOnBoard && !hasInHand('a^b')) {
        grantedSymbol = 'a^b';
      } else if (hasPowerWithoutExponent && !hasInHand('2')) {
        grantedSymbol = '2';
      } else if (totalTwos < 2 && !hasInHand('2')) {
        grantedSymbol = '2';
      }

      if (!grantedSymbol) return prev;

      p.hand.push(createTutorialStepCard(grantedSymbol, 't1-step3'));
      return next;
    });

    return grantedSymbol;
  }, [currentPlayerIndex]);

  const handleEndTurn = () => {
    if (bracketMode) {
      setBracketMode(null);
      toast.info("Nedokončená závorka byla vrácena do sady závorek.");
    }

    if (tutorialActive && tutorialStep !== 2 && tutorialStep !== 3) {
      return toast.error("V tutoriálu teď není čas ukončit tah.");
    }

    if (tutorialActive && tutorialStep === 3) {
      const p = players[currentPlayerIndex];
      const handLimit = 5;
      if (p.hand.length > handLimit) {
        setIsDiscarding(true);
        toast.warning(`Limit ruky překročen! Musíš zahodit ${p.hand.length - handLimit} karet.`);
        return;
      }

      setHasModifiedBoardThisTurn(false);
      setPlaysThisTurn(0);
      const granted = grantTutorialStep3SupportCard();
      if (granted) {
        toast.info(`Kolo ukončeno. Přidána karta ${granted}.`);
      } else {
        toast.info("Kolo ukončeno.");
      }
      return;
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
    const handLimit = 5;
    if (p.hand.length > handLimit) {
      setIsDiscarding(true);
      toast.warning(`Limit ruky překročen! Musíš zahodit ${p.hand.length - handLimit} karet.`);
      return;
    }
    finalizeTurn();
  };

  const handleDiscard = useCallback((cardId: string) => {
    if (tutorialActive && tutorialStep !== 2 && tutorialStep !== 3) {
      toast.error("V tutoriálu teď není dovoleno odhazovat.");
      return;
    }
    if (tutorialActive && tutorialStep === 3 && !isDiscarding) {
      toast.error("V tutoriálu teď neodhazuj karty.");
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
        const handLimit = 5;
        if (p.hand.length <= handLimit) {
          setIsDiscarding(false);
          if (tutorialActive) {
            if (!tutorialTwosAdded && tutorialStep === 2) {
              const firstPlayerId = next[0]?.id;
              const firstPlayerIndex = next.findIndex((player: Player) => player.id === firstPlayerId);
              if (firstPlayerIndex > -1) {
                const firstPlayerHand = next[firstPlayerIndex].hand;
                const hasPowerCard = firstPlayerHand.some((card: GameCard) => card.symbol === 'a^b');

                if (!hasPowerCard) {
                  firstPlayerHand.push(createTutorialStepCard('a^b', 't1-step3'));
                }
              }
              setTutorialTwosAdded(true);
              setTutorialStep(3);
            }
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
  }, [applyPendingHandSwap, tutorialActive, tutorialAllowedDiscardIds, tutorialStep, tutorialTwosAdded, isDiscarding]);

  const nextTurn = () => {
    setBracketMode(null);

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
        if (next[nextIdx].status.playAnyAsZeroNextTurn) {
          next[nextIdx].status.playAnyAsZeroReady = true;
          next[nextIdx].status.playAnyAsZeroNextTurn = false;
        }
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
      // PROVÁDĚNÍ MATEMATIKY LOKÁLNĚ MÍSTO BACKENDU
      const data = evaluateExpression(
        expression,
        curr.targetR.toString(),
        curr.status?.mathModifiers || []
      );

      if (!data.success) {
        toast.error(data.error || "Výpočet se nepodařil.", { id: toastId });
        return;
      }

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

  const addCardToGameState = useCallback((
    card: GameCard,
    targetId: string | null,
    insertPosition?: number,
    options?: { countAsAction?: boolean }
  ) => {
    const countAsAction = options?.countAsAction ?? true;
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

    if (countAsAction) {
      setHasModifiedBoardThisTurn(true);
      setPlaysThisTurn(prev => prev + 1);
    }
    setPendingEffect(null);
  }, [currentPlayerIndex, updatePlayerStats]);

  const addCardToSlotFromHand = useCallback((
    card: GameCard,
    parentId: string,
    slotKey: string,
    options?: { countAsAction?: boolean }
  ) => {
    const countAsAction = options?.countAsAction ?? true;
    let placed = false;
    let mergeError: string | null = null;

    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[currentPlayerIndex];

      const updateSlot = (cards: GameCard[]): GameCard[] => cards.map(c => {
        if (c.id === parentId) {
          const slotCards = c.slotCards ?? createSlotCards(c.symbol) ?? {};
          const existing = slotCards[slotKey] || null;
          const mergeResult = mergeCardIntoSlotValue(existing, card);
          if (!mergeResult.merged) {
            mergeError = mergeResult.error ?? 'Do tohoto okénka kartu vložit nejde.';
            return c;
          }
          slotCards[slotKey] = mergeResult.merged;
          p.hand = p.hand.filter((handCard: GameCard) => handCard.id !== card.id);
          p.syntax = p.syntax.filter((syntaxCard: GameCard) => syntaxCard.id !== card.id);
          placed = true;
          return { ...c, slotCards };
        }
        return c.exponent ? { ...c, exponent: updateSlot([c.exponent])[0] } : c;
      });

      p.board = updateSlot(p.board);
      return next;
    });

    if (mergeError) {
      toast.error(mergeError);
      return;
    }
    if (!placed) return;

    updatePlayerStats(currentPlayerIndex, stats => ({
      ...stats,
      cardsToBoard: stats.cardsToBoard + 1,
    }));

    if (countAsAction) {
      setHasModifiedBoardThisTurn(true);
      setPlaysThisTurn(prev => prev + 1);
    }
    setPendingEffect(null);
  }, [currentPlayerIndex, updatePlayerStats]);

  const placePendingEffectCard = useCallback((effectState: PendingEffectState) => {
    if (effectState.slotPlacement) {
      addCardToSlotFromHand(
        effectState.card,
        effectState.slotPlacement.parentId,
        effectState.slotPlacement.slotKey,
        { countAsAction: true }
      );
      return;
    }
    addCardToGameState(effectState.card, effectState.targetId, effectState.insertPosition);
  }, [addCardToGameState, addCardToSlotFromHand]);

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

    const activeHandCard = players[currentPlayerIndex].hand.find(c => c.id === active.id);

    if (tutorialActive) {
      if (tutorialStep === 2) {
        if (String(over.id) !== 'drop-discard') {
          toast.error("V tutoriálu teď odhazuj karty.");
          return;
        }
      } else if (tutorialStep !== 3) {
        toast.error("V tutoriálu teď nemůžeš s kartami hýbat.");
        return;
      } else if (tutorialStep === 3 && String(over.id) === 'drop-discard' && !isDiscarding) {
        toast.error("V tutoriálu teď neodhazuj karty.");
        return;
      }

      if (tutorialStep === 3 && activeHandCard && String(over.id) !== 'drop-discard') {
        const allowedSymbols = new Set(['2', '+', '3', 'a^b']);
        if (!allowedSymbols.has(activeHandCard.symbol)) {
          toast.error("V tutoriálu teď používej jen karty 2, +, 3 a a^b.");
          return;
        }
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

    const overId = String(over.id);

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
        const isCardInLockedSpecialSlot = (cards: GameCard[], targetId: string): boolean => {
          const containsInTree = (node: GameCard | null): boolean => {
            if (!node) return false;
            if (node.id === targetId) return true;
            if (node.exponent && containsInTree(node.exponent)) return true;
            if (node.slotCards) {
              for (const nested of Object.values(node.slotCards)) {
                if (containsInTree(nested)) return true;
              }
            }
            return false;
          };

          for (const card of cards) {
            const isLockedSpecial = !!card.locked && getSpecialSlots(card.symbol).length > 0;
            if (isLockedSpecial && card.slotCards) {
              for (const slotCard of Object.values(card.slotCards)) {
                if (containsInTree(slotCard)) return true;
              }
            }
            if (card.exponent && isCardInLockedSpecialSlot([card.exponent], targetId)) return true;
            if (card.slotCards) {
              for (const nested of Object.values(card.slotCards)) {
                if (nested && isCardInLockedSpecialSlot([nested], targetId)) return true;
              }
            }
          }
          return false;
        };

        const isLocked = (cards: GameCard[]): boolean => cards.some(c => {
          if (c.id === active.id) return !!c.locked;
          return c.exponent ? isLocked([c.exponent]) : false;
        });
        if (isLocked(players[currentPlayerIndex].board)) {
          return toast.error("Tuto kartu nelze odhodit.");
        }

        const isLockedSpecialSlotDiscard =
          difficulty === 'VŠ' &&
          isCardInLockedSpecialSlot(players[currentPlayerIndex].board, active.id as string);

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
          if (!isLockedSpecialSlotDiscard) {
            setHasModifiedBoardThisTurn(true);
          } else {
            toast.info("Mez/slot byl odhozen. Můžeš ihned vložit náhradu.");
          }
        }
      }
      return;
    }

    const slotData = over.data.current as SlotDropData | undefined;
    const isSpecialTargetDrop = overId.startsWith('drop-exponent-') || !!(slotData?.slotKey && slotData?.parentId);
    const isVsSpecialMove = difficulty === 'VŠ' && isSpecialTargetDrop;

    if (slotData?.slotKey && slotData?.parentId) {
      const slotCard = players[currentPlayerIndex].hand.find(c => c.id === active.id);
      if (!slotCard) {
        if (difficulty !== 'VŠ') return;

        let mergeError: string | null = null;
        let moved = false;

        setPlayers(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          const p = next[currentPlayerIndex];
          const { removed, newCards } = removeCardRecursively(p.board, active.id as string);
          if (!removed || removed.locked) return next;

          const updateSlot = (cards: GameCard[]): GameCard[] => cards.map(c => {
            if (c.id === slotData.parentId) {
              const currentSlots = c.slotCards ?? createSlotCards(c.symbol) ?? {};
              const existing = currentSlots[slotData.slotKey] || null;
              const mergeResult = mergeCardIntoSlotValue(existing, removed);
              if (!mergeResult.merged) {
                mergeError = mergeResult.error ?? 'Do tohoto okénka kartu vložit nejde.';
                return c;
              }
              currentSlots[slotData.slotKey] = mergeResult.merged;
              const updatedCard = { ...c, slotCards: currentSlots };
              moved = true;
              return updatedCard;
            }
            return c.exponent ? { ...c, exponent: updateSlot([c.exponent])[0] } : c;
          });

          const updatedBoard = updateSlot(newCards);
          if (mergeError) return next;
          p.board = updatedBoard;
          return next;
        });

        if (mergeError) {
          toast.error(mergeError);
          return;
        }
        if (moved) {
          setPendingEffect(null);
        }
        return;
      }
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

      if (cardsDatabase[slotCard.symbol]?.hasEffect && !tutorialActive) {
        setPendingEffect({
          card: slotCard,
          targetId: null,
          slotPlacement: { parentId: slotData.parentId, slotKey: slotData.slotKey }
        });
        return;
      }

      addCardToSlotFromHand(slotCard, slotData.parentId, slotData.slotKey, { countAsAction: true });
      return;
    }

    // Zjistíme jestli karta pochází z ruky nebo syntax (tj. jde o novou akci)
    const handCard = players[currentPlayerIndex].hand.find(c => c.id === active.id);
    const syntaxHandCard = players[currentPlayerIndex].syntax.find(c => c.id === active.id);
    const card = handCard || syntaxHandCard;
    const isFromHand = !!handCard;

    let targetId: string | null = null;
    let insertPosition: number | undefined = undefined;
    let forceAfterDxDy = false;
    const beforeDxDyCount = players[currentPlayerIndex].board.filter(c => !c.afterDxDy).length;

    // Pokud uživatel už akci tento tah provedl, chceme zjistit, jestli jde JEN o přesazení karty uvnitř boardu
    // Pokud je karta POUZE na tabuli (včetně exponentu/slotu), má povoleno se přesouvat.
    const isCardInBoardTree = (cards: GameCard[], targetId: string): boolean => cards.some(c => {
      if (c.id === targetId) return true;
      if (c.exponent && isCardInBoardTree([c.exponent], targetId)) return true;
      if (c.slotCards) {
        for (const slotCard of Object.values(c.slotCards)) {
          if (slotCard && isCardInBoardTree([slotCard], targetId)) return true;
        }
      }
      return false;
    });
    const isOnlyOnBoard = !card && isCardInBoardTree(players[currentPlayerIndex].board, String(active.id));
    const pStatus = players[currentPlayerIndex].status;
    if (pStatus?.playLimit !== null && pStatus?.playLimit !== undefined && playsThisTurn >= pStatus.playLimit && !isVsSpecialMove) {
      return toast.error("Tento tah už nesmíš vyložit další kartu!");
    }
    if (hasModifiedBoardThisTurn && !isOnlyOnBoard && !pStatus?.infinitePlays && !isVsSpecialMove) {
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

    let transformedSymbol = cardToPlace.symbol;
    if (!isOnlyOnBoard && isFromHand) {
      if (pStatus?.playAnyAsZeroReady) transformedSymbol = '0';
    }

    const wildcardConsumed = transformedSymbol !== cardToPlace.symbol;
    const transformedCardToPlace = wildcardConsumed
      ? { ...cardToPlace, symbol: transformedSymbol }
      : cardToPlace;

    const cardToPlaceWithDxDy = placeAfterDxDy !== undefined && !isOnlyOnBoard
      ? { ...transformedCardToPlace, afterDxDy: placeAfterDxDy }
      : transformedCardToPlace;

    if (wildcardConsumed) {
      setPlayers(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        if (next[currentPlayerIndex]?.status) {
          next[currentPlayerIndex].status.playAnyAsZeroReady = false;
        }
        return next;
      });
      toast.success(`Karta ${cardToPlace.symbol} byla zahrána jako ${transformedSymbol}.`);
    }

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
          const { removed, newCards } = removeCardRecursively(p.board, cardToPlace.id);
          if (!removed) return next;
          p.board = newCards;

          if (targetId === null && insertPosition !== undefined) {
            // Zjistíme posun indexování
            let adjustedPos = insertPosition;
            if (originIndex >= 0 && originIndex < insertPosition) adjustedPos -= 1;

            // Přemístíme
            const movedCard = removed;
            if (placeAfterDxDy !== undefined) {
              movedCard.afterDxDy = placeAfterDxDy;
            }
            p.board.splice(adjustedPos, 0, movedCard);
          } else if (targetId) {
            // Přidání k exponentu uvnitř tabule
            const movedCard = removed;

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
        addCardToGameState(cardToPlaceWithDxDy, targetId, insertPosition, { countAsAction: !isVsSpecialMove });
      }
    }
  }, [
    currentPlayerIndex,
    players,
    isDiscarding,
    hasModifiedBoardThisTurn,
    addCardToGameState,
    addCardToSlotFromHand,
    bracketMode,
    updatePlayerStats,
    difficulty,
    playsThisTurn,
    removeCardRecursively,
    tutorialActive,
    tutorialStep,
    tutorialBracketInfoShown,
    handleDiscard,
    flattenCardTree,
  ]);

  // ==========================================
  // 5. EFEKTY A CÍLENÍ
  // ==========================================

  const handleEffectChoice = (choice: 'ACTIVATE' | 'NONE', targetPlayerId?: number, targetCardId?: string) => {
    if (!pendingEffect) return;

    let metadata: Record<string, unknown> | undefined = undefined;

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
        // EFF_001 a EFF_008 jsou čistě "next turn" efekty přes status.extraDraw (applyEffectLogic)

        if (activeId === 'EFF_028') {
          let currentDeck = [...deck];
          let currentDiscard = [...discardPile];
          const drawnCards: GameCard[] = [];

          for (let i = 0; i < 3; i++) {
            if (currentDeck.length === 0) {
              if (currentDiscard.length === 0) break;
              currentDeck = [...currentDiscard].sort(() => Math.random() - 0.5);
              currentDiscard = [];
            }
            const drawn = currentDeck.pop();
            if (drawn) {
              drawnCards.push({
                ...drawn,
                id: `mini-${drawn.symbol}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
              });
            }
          }

          setDeck(currentDeck);
          setDiscardPile(currentDiscard);
          setMinigameMode({ effectId: activeId, cards: drawnCards });
          placePendingEffectCard(pendingEffect);
          setPendingEffect(null);
          setTargetingMode(null);
          setEffectStep('CHOOSE_EFFECT');
          setChosenEffectChoice(null);

          if (drawnCards.length === 0) {
            toast.error('Balíček je prázdný, efekt velikosti vektoru nelze použít.');
          } else {
            toast.info('Vyber 1 kartu. Zbylé 2 budou odhozeny.');
          }
          return;
        }

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

        const handSwapDirection = metadata?.handSwapDirection;
        if (handSwapDirection === 1 || handSwapDirection === -1) {
          setPendingHandSwap({
            direction: handSwapDirection,
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
          placePendingEffectCard(pendingEffect);
          return;
        }

        if (metadata?.moduloOperationTriggered) {
          // EFF_012: Výběr čísla z ruky
          setModuloMode({ activePlayerIndex: currentPlayerIndex, targetPlayerId });
          placePendingEffectCard(pendingEffect);
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
        placePendingEffectCard(pendingEffect);

        toast.success(`Efekt ${effect.name} aktivován!`);
      }
    } else {
      // --- VOLBA 'NONE': POLOŽENÍ NA PLOCHU L ---
      placePendingEffectCard(pendingEffect);
    }

    // Úklid po akci (pokud nebyly speciální efekty)
    if (!metadata?.deckPreviewTriggered && !metadata?.moduloOperationTriggered) {
      setPendingEffect(null);
      setTargetingMode(null);
      setEffectStep('CHOOSE_EFFECT');
      setChosenEffectChoice(null);
    }
  };

  const handleMinigamePick = useCallback((id: string) => {
    if (!minigameMode) return;

    if (minigameMode.effectId === 'EFF_028') {
      const selected = id !== 'CANCEL'
        ? minigameMode.cards.find((c: GameCard) => c.id === id)
        : undefined;

      const toDiscard = selected
        ? minigameMode.cards.filter((c: GameCard) => c.id !== selected.id)
        : [...minigameMode.cards];

      if (selected) {
        setPlayers(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          next[currentPlayerIndex].hand.push({
            ...selected,
            id: `mini-keep-${selected.symbol}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
          });
          return next;
        });
      }

      if (toDiscard.length > 0) {
        setDiscardPile(old => [...old, ...toDiscard]);
      }

      setMinigameMode(null);
      setPendingEffect(null);
      setTargetingMode(null);
      setEffectStep('CHOOSE_EFFECT');
      setChosenEffectChoice(null);

      if (selected) toast.success(`Vybral jsi kartu ${selected.symbol}.`);
      else toast.info('Výběr zrušen. Karty byly odhozeny.');
      return;
    }

    if (id !== 'CANCEL') {
      const card = minigameMode.cards.find((c: GameCard) => c.id === id);
      if (card) {
        setPlayers(prev => {
          const p = JSON.parse(JSON.stringify(prev));
          p[currentPlayerIndex].hand.push({
            ...card,
            id: `mini-${card.symbol}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
          });
          return p;
        });
      }
    }

    if (pendingEffect) {
      placePendingEffectCard(pendingEffect);
    }
    setMinigameMode(null);
    setPendingEffect(null);
    setTargetingMode(null);
    setEffectStep('CHOOSE_EFFECT');
    setChosenEffectChoice(null);
  }, [minigameMode, currentPlayerIndex, pendingEffect, placePendingEffectCard]);

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

  const handleStartGame = (configuredPlayers: { name: string, theme: string }[]) => {
    const { players: newPlayers, deck: newDeck } = prepareInitialGameState(configuredPlayers, difficulty);

    setDeck(newDeck);
    setPlayers(newPlayers);
    resetGameStats(newPlayers);
    setPendingHandSwap(null);
    setGamePhase('PLAYING');
  };

  const handleStartTutorial = () => {
    const {
      players: newPlayers,
      discardableIds,
      referenceBoard,
    } = prepareTutorialState();

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
    setTutorialReferenceBoard(referenceBoard);
    setTutorialBracketInfoShown(false);
    setTutorialTwosAdded(false);

    setGamePhase('PLAYING');
  };

  const resetTutorial = () => {
    handleStartTutorial();
  };

  const skipTutorial = () => {
    setTutorialActive(false);
    setTutorialStep(0);
    setTutorialAllowedDiscardIds([]);
    setTutorialReferenceBoard([]);
    setTutorialBracketInfoShown(false);
    setTutorialTwosAdded(false);
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
    setTutorialAllowedDiscardIds([]);
    setTutorialReferenceBoard([]);
    setTutorialBracketInfoShown(false);
    setTutorialTwosAdded(false);
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

  useEffect(() => {
    if (!tutorialActive) return;
    const current = players[currentPlayerIndex];
    if (!current) return;

    let timeoutId: number | null = null;
    if (tutorialStep === 3 && isTutorialExpressionReady(current.board)) {
      timeoutId = window.setTimeout(() => {
        setTutorialStep(4);
      }, 0);
    }
    if (tutorialStep === 4 && winner) {
      timeoutId = window.setTimeout(() => setTutorialStep(5), 0);
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [tutorialActive, tutorialStep, players, currentPlayerIndex, winner]);

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
      handleDragEnd, handleMinigamePick, cancelBracketMode, setMinigameMode, setBracketMode,
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