import { cardsDatabase } from '../data/cardsDB';
import { generatePersonalTargetR, type DifficultyMode } from './gameHelpers';

// --- TYPY PRO CELOU HRU ---

export interface GameCard {
  id: string;
  symbol: string;
  type?: string; // Přidáno jako volitelné, pokud se s tím počítá jinde
  exponent?: GameCard | null;
  integralBounds?: { lower: number; upper: number }; // PŘIDÁNO: Pamatuje si meze integrálu
}

export interface PlayerStatus {
  mathModifiers: string[]; // Seznam aktivních závorek pro Python engine
  extraTurn?: boolean;
  extraDraw?: number;
  drawReduction?: number;
  noDrawNextTurn?: boolean;
  frozen?: boolean;
  immune?: boolean;
  playLimit?: number | null;
  infinitePlays?: boolean;
  mustPlayOperation?: boolean;
  operationLock?: boolean;
  numberLock?: boolean;
  exposedHand?: boolean;
  absoluteValue?: boolean;
  notifications: string[]; // PŘIDÁNO: Seznam zpráv od oponentů (krádeže, útoky)
}

export interface Player {
  id: number;
  name: string;
  hand: GameCard[];
  board: GameCard[];
  syntax: GameCard[];
  theme: string;
  targetR: number | string; // KAŽDÝ HRÁČ MÁ VLASTNÍ CÍL
  status: PlayerStatus;
}

// Inicializace statusu, aby se předešlo undefined chybám
const ensureStatus = (player: Player) => {
  if (!player.status) {
    player.status = {
      extraDraw: 0,
      drawReduction: 0,
      immune: false,
      frozen: false,
      operationLock: false,
      numberLock: false,
      mustPlayOperation: false,
      playLimit: null,
      infinitePlays: false,
      exposedHand: false,
      noDrawNextTurn: false,
      absoluteValue: false,
      mathModifiers: [],
      extraTurn: false,
      notifications: [] // PŘIDÁNO
    };
  } else if (!player.status.notifications) {
    player.status.notifications = []; // Pojistka pro starší stavy
  }
};

// --- HERNÍ ENGINE EFEKTŮ ---

export interface EffectResult {
  players: Player[];
  metadata?: {
    turnOrderReversed?: boolean;
    deckPreviewTriggered?: boolean;
    moduloOperationTriggered?: boolean;
  };
}

export const applyEffectLogic = (
  effectId: string,
  currentState: Player[],
  currentPlayerIndex: number,
  selectedTargetId?: number,
  targetCardId?: string,
  playedCard?: GameCard,
  currentDifficulty: DifficultyMode = 'ZŠ' // PŘIDÁNO: Potřebujeme vědět obtížnost pro efekty měnící R
): EffectResult | Player[] => {

  // Hluboká kopie stavu
  const newPlayers: Player[] = JSON.parse(JSON.stringify(currentState));
  const activePlayer = newPlayers[currentPlayerIndex];
  
  newPlayers.forEach(ensureStatus);

  // Určení cílového hráče (pokud není vybrán, bere se následující)
  const nextPlayerIndex = (currentPlayerIndex + 1) % newPlayers.length;
  const targetPlayer = selectedTargetId !== undefined
    ? newPlayers.find((p: Player) => p.id === selectedTargetId)
    : newPlayers[nextPlayerIndex];

  // Kontrola imunity — platí jen pro EFF_014 (derivace) a EFF_015 (integrál)
  const immuneEffects = ['EFF_014', 'EFF_015'];
  if (targetPlayer && targetPlayer.id !== activePlayer.id && targetPlayer.status.immune && immuneEffects.includes(effectId)) {
    console.log(`Efekt ${effectId} zrušen: Hráč ${targetPlayer.name} má imunitu!`);
    if (activePlayer.status.notifications) {
       activePlayer.status.notifications.push(`Tvůj útok na hráče ${targetPlayer.name} selhal kvůli imunitě!`);
    }
    return newPlayers;
  }

  switch (effectId) {
    // --- EFEKTY EFF_001 až EFF_025 (Podle karty.csv) ---

    case "EFF_001": // Dobrání 1 karty navíc (0-9, π)
      activePlayer.status.extraDraw = (activePlayer.status.extraDraw || 0) + 1;
      break;

    case "EFF_002": // π: Výměna 1 karty z vlastního L za kartu z L oponenta
      if (targetPlayer && targetCardId && playedCard) {
        let swappedCard: GameCard | null = null;
        
        const findAndSwap = (cards: GameCard[]): GameCard[] => {
          return cards.map(c => {
            if (c.id === targetCardId) {
              swappedCard = { ...c };
              return { ...playedCard, exponent: c.exponent };
            }
            if (c.exponent) {
              const result = findAndSwap([c.exponent]);
              c.exponent = result.length > 0 ? result[0] : null;
            }
            return c;
          });
        };
        
        targetPlayer.board = findAndSwap(targetPlayer.board);
        if (swappedCard) {
          activePlayer.hand.push(swappedCard);
          targetPlayer.status.notifications.push(`🔄 Hráč ${activePlayer.name} si vyměnil kartu z tvé plochy!`);
        }
      }
      break;

    case "EFF_003": // e: Imunita proti efektům int a d/dx
      activePlayer.status.immune = true;
      break;

    case "EFF_004": // y: Následující hráč musí odhodit všechny číslice
      if (targetPlayer) {
        const originalLength = targetPlayer.hand.length;
        targetPlayer.hand = targetPlayer.hand.filter((c: GameCard) => {
          const type = cardsDatabase[c.symbol]?.type;
          return type !== 'number';
        });
        if (targetPlayer.hand.length < originalLength) {
          targetPlayer.status.notifications.push(`🔥 Hráč ${activePlayer.name} ti spálil všechny číslice z ruky!`);
        }
      }
      break;

    case "EFF_005": // x: Následující hráč musí odhodit všechny operace
      if (targetPlayer) {
        const originalLength = targetPlayer.hand.length;
        targetPlayer.hand = targetPlayer.hand.filter((c: GameCard) => {
          const type = cardsDatabase[c.symbol]?.type;
          return type !== 'operator';
        });
        if (targetPlayer.hand.length < originalLength) {
          targetPlayer.status.notifications.push(`🔥 Hráč ${activePlayer.name} ti spálil všechny operace z ruky!`);
        }
      }
      break;

    case "EFF_006": // +: Následující hráč MUSÍ v příštím tahu použít operaci
      if (targetPlayer) {
        targetPlayer.status.mustPlayOperation = true;
        targetPlayer.status.notifications.push(`⚠️ Hráč ${activePlayer.name} ti nařídil: Musíš hrát operaci!`);
      }
      break;

    case "EFF_007": // -: Odstranění 1 libovolné karty z ruky zvoleného oponenta
      if (targetPlayer && targetPlayer.hand.length > 0) {
        const randomIndex = Math.floor(Math.random() * targetPlayer.hand.length);
        const [removed] = targetPlayer.hand.splice(randomIndex, 1);
        targetPlayer.status.notifications.push(`💥 Hráč ${activePlayer.name} ti spálil kartu z ruky: ${removed.symbol}`);
      }
      break;

    case "EFF_008": // *: Zdvojnásobení počtu dobíraných karet v PŘÍŠTÍM tahu
      activePlayer.status.extraDraw = (activePlayer.status.extraDraw || 0) + 2;
      break;

    case "EFF_009": // /: Náhled na 3 vrchní karty balíčku a jejich přerovnání
      // Signalizace, že je potřeba UI dialog v App.tsx
      return {
        players: newPlayers,
        metadata: { deckPreviewTriggered: true }
      };

    case "EFF_010": // a^b: Následující hráč přeskakuje svůj tah
      if (targetPlayer) {
        targetPlayer.status.frozen = true;
        targetPlayer.status.notifications.push(`⏭️ Hráč ${activePlayer.name} ti zakazuje další tah!`);
      }
      break;

    case "EFF_011": // sqrt: Odhození celého obsahu ruky a dobrání nových karet
      if (targetPlayer) {
        const count = targetPlayer.hand.length;
        targetPlayer.hand = [];
        targetPlayer.status.extraDraw = (targetPlayer.status.extraDraw || 0) + count;
        targetPlayer.status.notifications.push(`🔄 Hráč ${activePlayer.name} ti nutí obnovit celou ruku!`);
      }
      break;

    case "EFF_012": // mod: Hodnota R = R mod (lib. číslo z ruky)
      // Signalizace, že je potřeba UI dialog pro výběr čísla z ruky
      return {
        players: newPlayers,
        metadata: { moduloOperationTriggered: true }
      };

    case "EFF_013": // n!: Následující hráč nesmí vyložit více než 1 kartu v příštím tahu
      if (targetPlayer) {
        targetPlayer.status.playLimit = 1;
        targetPlayer.status.notifications.push(`🚫 Hráč ${activePlayer.name} ti omezil hraní na 1 kartu!`);
      }
      break;

    case "EFF_014": // d/dx: Odstranění všech konstant a proměnných z L oponenta
      if (targetPlayer) {
        const constantSymbols = ['π', 'e', 'x', 'y'];
        let removed = false;
        
        const removeConstants = (cards: GameCard[]): GameCard[] => {
          return cards.filter(c => {
            if (constantSymbols.includes(c.symbol)) {
              removed = true;
              return false;
            }
            if (c.exponent) {
              const result = removeConstants([c.exponent]);
              c.exponent = result.length > 0 ? result[0] : null;
            }
            return true;
          });
        };
        
        targetPlayer.board = removeConstants(targetPlayer.board);
        if (removed) {
          targetPlayer.status.notifications.push(`📉 Hráč ${activePlayer.name} ti derivoval - všechny konstanty zmizely!`);
        }
      }
      break;

    case "EFF_015": // int: Okamžité nahrazení cíle R libovolného hráče novým losem
      if (targetPlayer) {
        targetPlayer.targetR = generatePersonalTargetR(currentDifficulty);
        targetPlayer.status.notifications.push(`⚠️ Hráč ${activePlayer.name} ti kompletně změnil cíl R na: ${targetPlayer.targetR}`);
      }
      break;

    case "EFF_016": // ∑: Žádný hráč nemůže celé kolo hrát operace (včetně aktivního hráče)
      newPlayers.forEach((p: Player) => {
        p.status.operationLock = true;
      });
      newPlayers[currentPlayerIndex].status.notifications.push(`🔐 Zákaz operací pro všechny na příští kolo!`);
      break;

    case "EFF_017": // log: Můžeš hrát libovolný počet karet
      activePlayer.status.infinitePlays = true;
      break;

    case "EFF_018": { // sin: Všichni si předají karty po směru (clockwise)
      const tempHands1 = newPlayers.map(p => [...p.hand]);
      for (let i = 0; i < newPlayers.length; i++) {
        const nextIndex = (i + 1) % newPlayers.length;
        newPlayers[nextIndex].hand = tempHands1[i];
      }
      newPlayers.forEach(p => {
        if (p.id !== activePlayer.id) {
          p.status.notifications.push(`🔄 Všichni si vyměnili karty po směru!`);
        }
      });
      break;
    }

    case "EFF_019": { // cos: Všichni si předají karty proti směru (counter-clockwise)
      const tempHands2 = newPlayers.map(p => [...p.hand]);
      for (let i = 0; i < newPlayers.length; i++) {
        const prevIndex = (i - 1 + newPlayers.length) % newPlayers.length;
        newPlayers[prevIndex].hand = tempHands2[i];
      }
      newPlayers.forEach(p => {
        if (p.id !== activePlayer.id) {
          p.status.notifications.push(`🔄 Všichni si vyměnili karty proti směru!`);
        }
      });
      break;
    }

    case "EFF_020": { // tg: Všichni si předají karty po směru
      const tempHands3 = newPlayers.map(p => [...p.hand]);
      for (let i = 0; i < newPlayers.length; i++) {
        const nextIndex = (i + 1) % newPlayers.length;
        newPlayers[nextIndex].hand = tempHands3[i];
      }
      newPlayers.forEach(p => {
        if (p.id !== activePlayer.id) {
          p.status.notifications.push(`🔄 Všichni si vyměnili karty po směru!`);
        }
      });
      break;
    }

    case "EFF_021": { // cotg: Všichni si předají karty proti směru
      const tempHands4 = newPlayers.map(p => [...p.hand]);
      for (let i = 0; i < newPlayers.length; i++) {
        const prevIndex = (i - 1 + newPlayers.length) % newPlayers.length;
        newPlayers[prevIndex].hand = tempHands4[i];
      }
      newPlayers.forEach(p => {
        if (p.id !== activePlayer.id) {
          p.status.notifications.push(`🔄 Všichni si vyměnili karty proti směru!`);
        }
      });
      break;
    }

    case "EFF_022": // nCk: Prohození cifer v R cílového oponenta
      if (targetPlayer && typeof targetPlayer.targetR === 'number') {
        const digits = targetPlayer.targetR.toString().split('');
        digits.reverse();
        targetPlayer.targetR = parseInt(digits.join(''), 10);
        targetPlayer.status.notifications.push(`🔀 Hráč ${activePlayer.name} ti prohodil cifry cíle R!`);
      }
      break;

    case "EFF_023": // ∏: Žádný hráč nemůže celé kolo hrát čísla (včetně aktivního hráče)
      newPlayers.forEach((p: Player) => {
        p.status.numberLock = true;
      });
      newPlayers[currentPlayerIndex].status.notifications.push(`🔐 Zákaz čísel pro všechny na příští kolo!`);
      break;

    case "EFF_024": // lim: Zrušení všech aktivních efektů u všech hráčů
      newPlayers.forEach((p: Player) => {
        p.status.frozen = false;
        p.status.operationLock = false;
        p.status.mustPlayOperation = false;
        p.status.playLimit = null;
      });
      newPlayers.forEach(p => {
        if (p.id !== activePlayer.id) {
          p.status.notifications.push(`💥 Hráč ${activePlayer.name} zrušil všechny efekty!`);
        }
      });
      break;

    case "EFF_025": // det: Změní pořadí tahů na opačné
      newPlayers.reverse();
      newPlayers.forEach(p => {
        if (p.id !== activePlayer.id) {
          p.status.notifications.push(`🔄 Hráč ${activePlayer.name} otočil pořadí tahů!`);
        }
      });
      return {
        players: newPlayers,
        metadata: { turnOrderReversed: true }
      };

    case "EFF_026": // ztráta karty pro všechny soupeře (goniometrické funkce)
      newPlayers.forEach((p: Player) => {
        if (p.id !== activePlayer.id) {
          p.status.drawReduction = (p.status.drawReduction || 0) + 1;
          p.status.notifications.push(`🥶 Hráč ${activePlayer.name} tě připravil o doberání 1 karty!`);
        }
      });
      break;

    default:
      console.log(`Logika pro efekt '${effectId}' je spravována v App.tsx nebo není definována.`);
  }

  return newPlayers;
};