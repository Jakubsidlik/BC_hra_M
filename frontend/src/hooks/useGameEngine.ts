import { useState, useCallback } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { toast } from "sonner";

import { cardsDatabase } from '@/data/cardsDB';
import { applyEffectLogic } from '@/lib/effects';
import { 
  generateFilteredDeck, 
  generatePersonalTargetR, 
  parseBoardToMathString,
  hasOperation,
  type DifficultyMode 
} from '@/lib/gameHelpers';
import type { GameCard, Player } from '@/lib/effects';
import type { DropData } from '@/components/game/Cards';

type RemoveResult = { removed: GameCard | null, newCards: GameCard[] };

export function useGameEngine() {
  // --- STAVY JÁDRA ---
  const [gamePhase, setGamePhase] = useState<'MENU' | 'RULES' | 'PICK_MODE' | 'SETUP' | 'PLAYING'>('MENU');
  const [difficulty, setDifficulty] = useState<DifficultyMode>('ZŠ');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [deck, setDeck] = useState<GameCard[]>([]);
  const [discardPile, setDiscardPile] = useState<GameCard[]>([]);
  const [playDirection, setPlayDirection] = useState<1 | -1>(1);
  const [isHandoff, setIsHandoff] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // --- STAVY PRO UI A EFEKTY ---
  const [pendingEffect, setPendingEffect] = useState<{card: GameCard, targetId: string | null, insertPosition?: number} | null>(null);
  const [effectStep, setEffectStep] = useState<'CHOOSE_EFFECT' | 'CHOOSE_TARGET'>('CHOOSE_EFFECT');
  const [chosenEffectChoice, setChosenEffectChoice] = useState<'ACTIVATE' | null>(null);
  const [lastPlayedEffect, setLastPlayedEffect] = useState<string | null>(null);
  const [targetingMode, setTargetingMode] = useState<{effectId: string, targetPlayerId?: number} | null>(null);
  const [minigameMode, setMinigameMode] = useState<{effectId: string, cards: GameCard[], targetPlayerId?: number} | null>(null);
  const [bracketMode, setBracketMode] = useState<{ step: 'LEFT' | 'RIGHT', leftIndex: number | null } | null>(null);
  const [integralSetup, setIntegralSetup] = useState<{card: GameCard, targetId: string | null, insertPosition?: number} | null>(null);
  
  // --- OMEZENÍ TAHU ---
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [hasModifiedBoardThisTurn, setHasModifiedBoardThisTurn] = useState(false);

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

  // ==========================================
  // 2. LOGIKA TAHŮ A LÍZÁNÍ
  // ==========================================

  const performDraw = useCallback((count: number, playerIndex: number) => {
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
        if (drawn) p.hand.push({ ...drawn, id: `h-${drawn.symbol}-${Date.now()}-${Math.random().toString(36).substring(2,5)}` });
      }
      setDeck(currentDeck);
      setDiscardPile(currentDiscard);
      return next;
    });
  }, [deck, discardPile]);

  const finalizeTurn = useCallback(() => {
    setIsDiscarding(false);
    const p = players[currentPlayerIndex];
    if (p?.status?.extraTurn) {
      toast.success("Extra tah!", { icon: '⚡' });
      setPlayers(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        next[currentPlayerIndex].status.extraTurn = false;
        return next;
      });
      setHasModifiedBoardThisTurn(false);
      performDraw(1, currentPlayerIndex);
      return;
    }
    setIsHandoff(true);
  }, [players, currentPlayerIndex, performDraw]);

  const handleDiscardExpression = () => {
    if (hasModifiedBoardThisTurn) return toast.error("Již jsi provedl akci za tento tah!");
    
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[currentPlayerIndex];
      const allCards = p.board.flatMap((card: GameCard) => flattenCardTree(card));
      setDiscardPile(old => [...old, ...allCards]);
      p.board = [];
      return next;
    });
    
    setHasModifiedBoardThisTurn(true);
    toast.info("Celý výraz byl vyhozen do odhazovacího balíčku.");
  };

  const handleEndTurn = () => {
    const p = players[currentPlayerIndex];
    if (p.hand.length > 5) {
      setIsDiscarding(true);
      toast.warning(`Limit ruky překročen! Musíš zahodit ${p.hand.length - 5} karet.`);
      return;
    }
    finalizeTurn();
  };

  const handleDiscard = (cardId: string) => {
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[currentPlayerIndex];
      const idx = p.hand.findIndex((c: GameCard) => c.id === cardId);
      if (idx > -1) {
        const [removed] = p.hand.splice(idx, 1);
        setDiscardPile(old => [...old, removed]);
        if (p.hand.length <= 5) {
          setIsDiscarding(false);
          setTimeout(() => finalizeTurn(), 300);
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

    const p = players[nextIdx];
    const totalToDraw = Math.max(0, 1 + (p.status?.extraDraw || 0) - (p.status?.drawReduction || 0));
    if (totalToDraw > 0) performDraw(totalToDraw, nextIdx);

    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next[nextIdx].status) {
        next[nextIdx].status.extraDraw = 0;
        next[nextIdx].status.drawReduction = 0;
        next[nextIdx].status.notifications = [];
      }
      return next;
    });
  };

  // ==========================================
  // 3. MATEMATICKÝ ENGINE
  // ==========================================

  const checkMathEngine = async () => {
    if (hasModifiedBoardThisTurn) return toast.error("V tomto tahu jsi již akci provedl!");
    const curr = players[currentPlayerIndex];
    const expression = parseBoardToMathString(curr.board);
    if (!expression.trim()) return toast.error("Plocha L je prázdná!");
    if (!hasOperation(curr.board)) return toast.error("Výraz L musí obsahovat alespoň jednu operaci!");
    
    const toastId = toast.loading("Ověřování...");
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const resp = await fetch(`${API_URL}/evaluate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression, target_r: curr.targetR.toString(), modifiers: curr.status?.mathModifiers || [] })
      });
      const data = await resp.json();
      if (data.success && data.is_match) {
        toast.success("Q.E.D.!", { id: toastId });
        setWinner(curr);
      } else {
        toast.error("Chyba v důkazu!", { id: toastId });
        setPlayers(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          setDiscardPile(old => [...old, ...next[currentPlayerIndex].board]);
          next[currentPlayerIndex].board = [];
          return next;
        });
        setHasModifiedBoardThisTurn(true);
      }
    } catch { toast.error("Server offline.", { id: toastId }); }
  };

  // ==========================================
  // 4. MANIPULACE S PLOCHOU
  // ==========================================

  const addCardToGameState = useCallback((card: GameCard, targetId: string | null, insertPosition?: number) => {
    // Odebrat kartu z ruky a přidat na tabuli okamžitě
    setPlayers(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const p = next[currentPlayerIndex];
      p.hand = p.hand.filter((c: GameCard) => c.id !== card.id);
      p.syntax = p.syntax.filter((c: GameCard) => c.id !== card.id);
      if (targetId) {
        const update = (cs: GameCard[]): GameCard[] => cs.map(c =>
          c.id === targetId ? { ...c, exponent: card } : (c.exponent ? { ...c, exponent: update([c.exponent])[0] } : c)
        );
        p.board = update(p.board);
      } else if (insertPosition !== undefined) {
        // Vložit kartu na specifickou pozici
        p.board.splice(insertPosition, 0, card);
      } else {
        p.board.push(card);
      }
      return next;
    });

    setHasModifiedBoardThisTurn(true);
    setPendingEffect(null);
  }, [currentPlayerIndex]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (over.id === 'drop-discard') {
      const cardInHand = players[currentPlayerIndex].hand.find(c => c.id === active.id);
      if (cardInHand) {
        if (!isDiscarding) return toast.error("Odhazovat lze jen na konci tahu.");
        handleDiscard(active.id as string);
      } else {
        if (hasModifiedBoardThisTurn) return toast.error("Již jsi provedl akci.");
        const { removed, newCards } = removeCardRecursively(players[currentPlayerIndex].board, active.id as string);
        if (removed) {
          setPlayers(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            next[currentPlayerIndex].board = newCards;
            return next;
          });
          setDiscardPile(old => [...old, ...flattenCardTree(removed)]);
          setHasModifiedBoardThisTurn(true);
        }
      }
      return;
    }

    if (hasModifiedBoardThisTurn) return toast.error("Za kolo smíš provést 1 akci!");
    const card = players[currentPlayerIndex].hand.find(c => c.id === active.id) || 
                 players[currentPlayerIndex].syntax.find(c => c.id === active.id);
    if (!card) return;
    
    // Rozpoznání typu drop zóny
    const overId = String(over.id);
    let targetId: string | null = null;
    let insertPosition: number | undefined = undefined;
    
    if (overId.startsWith('drop-exponent-')) {
      targetId = (over.data.current as DropData).parentId;
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

    if (card.symbol === '∫') {
      setIntegralSetup({ card, targetId, insertPosition });
    } else if (cardsDatabase[card.symbol]?.hasEffect) {
      setPendingEffect({ card, targetId, insertPosition });
    } else {
      addCardToGameState(card, targetId, insertPosition);
    }
  }, [currentPlayerIndex, players, isDiscarding, hasModifiedBoardThisTurn, addCardToGameState]);

  // ==========================================
  // 5. EFEKTY A CÍLENÍ
  // ==========================================

  const handleEffectChoice = (choice: 'ACTIVATE' | 'NONE', targetPlayerId?: number, targetCardId?: string) => {
  if (!pendingEffect) return;
  
  if (choice === 'ACTIVATE') {
    const effect = cardsDatabase[pendingEffect.card.symbol]?.effects?.optionA;
    if (effect) {
      let activeId = effect.id;

      // --- 1. LOGIKA KOPÍROVÁNÍ (Copy Cat / EFF_037) ---
      if (activeId === 'EFF_037' && lastPlayedEffect) {
        activeId = lastPlayedEffect; // Přebereme ID předchozího efektu
        toast.info("Kopíruji předchozí efekt!");
      } else if (activeId !== 'EFF_037') {
        // Uložíme ID pro budoucího Kopíráka (tím zmizí error 6133)
        setLastPlayedEffect(activeId);
      }

      // --- 2. KONTROLA TARGETING REŽIMU ---
      // Pokud efekt vyžaduje kartu soupeře (např. EFF_006) a ID karty ještě nemáme, zapneme TargetingMode
      const cardTargetingEffects = ['EFF_006', 'EFF_014', 'EFF_036', 'EFF_045'];
      if (cardTargetingEffects.includes(activeId) && !targetCardId) {
        setTargetingMode({ effectId: activeId, targetPlayerId });
        setEffectStep('CHOOSE_EFFECT');
        return; // Zastavíme funkci, dokud hráč neklikne na kartu na stole soupeře
      }

      // --- 3. OKAMŽITÉ AKCE ---
      const immediateDraw: Record<string, number> = { "EFF_001": 1, "EFF_008": 2 };
      if (immediateDraw[activeId]) performDraw(immediateDraw[activeId], currentPlayerIndex);

      if (activeId === 'EFF_032') setPlayDirection(d => d === 1 ? -1 : 1);

      // --- 4. APLIKACE LOGIKY EFEKTU ---
      setPlayers(prev => applyEffectLogic(
        activeId, prev, currentPlayerIndex, targetPlayerId, targetCardId, pendingEffect.card, difficulty
      ));

      // --- 5. ZAHOZENÍ KARTY NA HŘBITOV ---
      // Karta se nepokládá na stůl, ale "spálí" se pro efekt
      setDiscardPile(old => [...old, { ...pendingEffect.card, exponent: null }]);
      setPlayers(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        const p = next[currentPlayerIndex];
        p.hand = p.hand.filter((c: GameCard) => c.id !== pendingEffect.card.id);
        return next;
      });

      toast.success(`Efekt ${effect.name} aktivován!`);
      setHasModifiedBoardThisTurn(true);
    }
  } else {
    // --- VOLBA 'NONE': POLOŽENÍ NA PLOCHU L ---
    addCardToGameState(pendingEffect.card, pendingEffect.targetId, pendingEffect.insertPosition);
  }

  // Úklid po akci
  setPendingEffect(null);
  setTargetingMode(null);
  setEffectStep('CHOOSE_EFFECT');
  setChosenEffectChoice(null);
};

  const handleBracketClick = (cardId: string) => {
    if (!bracketMode || hasModifiedBoardThisTurn) return;
    const idx = players[currentPlayerIndex].board.findIndex(c => c.id === cardId);
    if (idx === -1) return;
    if (bracketMode.step === 'LEFT') {
      setBracketMode({ step: 'RIGHT', leftIndex: idx });
    } else {
      setPlayers(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        const p = next[currentPlayerIndex];
        const lB = p.syntax.splice(p.syntax.findIndex((c: any) => c.symbol === '('), 1)[0];
        const rB = p.syntax.splice(p.syntax.findIndex((c: any) => c.symbol === ')'), 1)[0];
        p.board.splice(idx + 1, 0, rB);
        p.board.splice(bracketMode.leftIndex!, 0, lB);
        return next;
      });
      setBracketMode(null);
      setHasModifiedBoardThisTurn(true);
    }
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
    const newPlayers: Player[] = configuredPlayers.map((p, i) => ({
      id: i, name: p.name, theme: p.theme, hand: [], board: [],
      targetR: generatePersonalTargetR(difficulty),
      syntax: [
        { id: `p${i}-l1`, symbol: '(' }, { id: `p${i}-r1`, symbol: ')' },
        { id: `p${i}-l2`, symbol: '(' }, { id: `p${i}-r2`, symbol: ')' },
        { id: `p${i}-l3`, symbol: '(' }, { id: `p${i}-r3`, symbol: ')' },
        { id: `p${i}-eq`, symbol: '=' }
      ],
      status: { mathModifiers: [], extraTurn: false, frozen: false, extraDraw: 0, drawReduction: 0, notifications: [] }
    }));

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
    setGamePhase('PLAYING');
  };

  return {
    state: {
      gamePhase, difficulty, players, currentPlayerIndex, deck, discardPile,
      isHandoff, winner, pendingEffect, effectStep, chosenEffectChoice,
      targetingMode, minigameMode, bracketMode, integralSetup,
      isDiscarding, hasModifiedBoardThisTurn, playDirection, lastPlayedEffect
    },
    actions: {
      setGamePhase, setDifficulty, handleStartGame, handleEndTurn, handleDiscard,
      nextTurn, checkMathEngine, handleEffectChoice, handleIntegralSubmit,
      handleDragEnd, handleBracketClick, setMinigameMode, setBracketMode,
      setTargetingMode, setIntegralSetup, setPendingEffect, setEffectStep,
      setChosenEffectChoice, setPlayers, addCardToGameState, handleDiscardExpression
    }
  };
}