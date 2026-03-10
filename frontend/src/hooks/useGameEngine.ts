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
  const [playDirection] = useState<1 | -1>(1);
  const [isHandoff, setIsHandoff] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

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
  // 2. LOGIKA TAHŮ A PŘIDÁVÁNÍ KARET
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
        if (p.hand.length <= 5) {
          setIsDiscarding(false);
          // Přechod k dalšímu hráči
          setTimeout(() => {
            setIsHandoff(true);
          }, 300);
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
        next[nextIdx].status.mustPlayOperation = false;
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
        // Exponent se přidá jen pokud:
        // 1) Cílová karta má canHaveExponent = true
        // 2) Taženou kartou je číslo nebo proměnná (nikoliv operátor)
        const canAddExponent = (targetCard: GameCard): boolean => {
          const targetData = cardsDatabase[targetCard.symbol];
          const cardData = cardsDatabase[card.symbol];
          const isCardNumOrVar = cardData?.type === 'number' || cardData?.type === 'variable';
          return (targetData?.canHaveExponent === true) && isCardNumOrVar;
        };
        
        const update = (cs: GameCard[]): GameCard[] => cs.map(c =>
          c.id === targetId && canAddExponent(c) ? { ...c, exponent: card } : (c.exponent ? { ...c, exponent: update([c.exponent])[0] } : c)
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
        setBracketMode(null);
        setHasModifiedBoardThisTurn(true);
        toast.success("Závorky umístěny!", { icon: '✓' });
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
        const { removed, newCards } = removeCardRecursively(players[currentPlayerIndex].board, active.id as string);
        if (removed) {
          // Validace: nesmí být dvě sousední * nebo / operace za sebou
          const mulDivSymbols = new Set(['*', '/', '×', '÷', '·']);
          const hasSideBySideMulDiv = newCards.some((c, i) => {
            if (i === 0) return false;
            return mulDivSymbols.has(c.symbol) && mulDivSymbols.has(newCards[i - 1].symbol);
          });
          if (hasSideBySideMulDiv) {
            return toast.error("Nepovolený tah! Dvě operace × nebo ÷ nesmí být vedle sebe.", { icon: '🚫' });
          }

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
    
    // Pokud karta není v ruce ani syntax, zkontroluj zda není na tabuli
    // Karta z tabule může být tažena pouze na drop-discard (to bylo zpracováno výše)
    if (!card) {
      const isOnBoard = players[currentPlayerIndex].board.some(c => c.id === active.id);
      if (isOnBoard) return; // Karta z tabule přetažená jinam → ignoruj
    }
                 
    // DŮLEŽITÉ: Pokud se karta nenajde, zkusíme ji z active.data
    const cardToPlace = card || (active.data.current as GameCard | undefined);
    if (!cardToPlace) {
      toast.error("Chyba: Karta se nenašla. Zkus to znova.");
      return;
    }
    
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

    if (cardToPlace.symbol === '∫') {
      setIntegralSetup({ card: cardToPlace, targetId, insertPosition });
    } else if (cardsDatabase[cardToPlace.symbol]?.hasEffect) {
      setPendingEffect({ card: cardToPlace, targetId, insertPosition });
    } else {
      // --- ENFORCE RESTRICTION FLAGS ---
      const pStatus = players[currentPlayerIndex].status;
      const cardData = cardsDatabase[cardToPlace.symbol];

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

      // Validace: nesmí být dvě sousední × nebo ÷ operace vedle sebe
      const mulDivSymbols = new Set(['*', '/', '×', '÷', '·']);
      if (mulDivSymbols.has(cardToPlace.symbol) && targetId === null && insertPosition !== undefined) {
        const board = players[currentPlayerIndex].board;
        const simulated = [...board];
        simulated.splice(insertPosition, 0, cardToPlace);
        const hasSideBySideMulDiv = simulated.some((c, i) => {
          if (i === 0) return false;
          return mulDivSymbols.has(c.symbol) && mulDivSymbols.has(simulated[i - 1].symbol);
        });
        if (hasSideBySideMulDiv) {
          return toast.error("Nepovolený tah! Dvě operace × nebo ÷ nesmí být vedle sebe.", { icon: '🚫' });
        }
      }

      addCardToGameState(cardToPlace, targetId, insertPosition);
    }
  }, [currentPlayerIndex, players, isDiscarding, hasModifiedBoardThisTurn, addCardToGameState, bracketMode]);

  // ==========================================
  // 5. EFEKTY A CÍLENÍ
  // ==========================================

  const handleEffectChoice = (choice: 'ACTIVATE' | 'NONE', targetPlayerId?: number, targetCardId?: string) => {
  if (!pendingEffect) return;
  
  let metadata: any = undefined;

  if (choice === 'ACTIVATE') {
    const effect = cardsDatabase[pendingEffect.card.symbol]?.effects?.optionA;
    if (effect) {
      let activeId = effect.id;

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
      const effectResult = applyEffectLogic(
        activeId, players, currentPlayerIndex, targetPlayerId, targetCardId, pendingEffect.card, difficulty
      );

      // Zpracování EffectResult s metadaty
      const resultPlayers = Array.isArray(effectResult) ? effectResult : effectResult.players;
      metadata = !Array.isArray(effectResult) ? effectResult.metadata : undefined;

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
      isDiscarding, hasModifiedBoardThisTurn, playDirection,
      deckPreviewMode, moduloMode
    },
    actions: {
      setGamePhase, setDifficulty, handleStartGame, handleEndTurn, handleDiscard,
      nextTurn, checkMathEngine, handleEffectChoice, handleIntegralSubmit,
      handleDragEnd, cancelBracketMode, setMinigameMode, setBracketMode,
      setTargetingMode, setIntegralSetup, setPendingEffect, setEffectStep,
      setChosenEffectChoice, setPlayers, addCardToGameState, handleDiscardExpression,
      handleDeckPreviewConfirm, handleModuloSelect, setDeckPreviewMode, setModuloMode
    }
  };
}