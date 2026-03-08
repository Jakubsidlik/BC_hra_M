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
  mathModifiers: string[]; // Seznam aktivních modifikátorů pro Python engine
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

export const applyEffectLogic = (
  effectId: string,
  currentState: Player[],
  currentPlayerIndex: number,
  selectedTargetId?: number,
  targetCardId?: string,
  playedCard?: GameCard,
  currentDifficulty: DifficultyMode = 'ZŠ' // PŘIDÁNO: Potřebujeme vědět obtížnost pro efekty měnící R
): Player[] => {

  // Hluboká kopie stavu
  const newPlayers: Player[] = JSON.parse(JSON.stringify(currentState));
  const activePlayer = newPlayers[currentPlayerIndex];
  
  newPlayers.forEach(ensureStatus);

  // Určení cílového hráče (pokud není vybrán, bere se následující)
  const nextPlayerIndex = (currentPlayerIndex + 1) % newPlayers.length;
  const targetPlayer = selectedTargetId !== undefined
    ? newPlayers.find((p: Player) => p.id === selectedTargetId)
    : newPlayers[nextPlayerIndex];

  // Kontrola imunity (Imunita neplatí, pokud hráč cílí sám na sebe)
  if (targetPlayer && targetPlayer.id !== activePlayer.id && targetPlayer.status.immune) {
    console.log(`Efekt ${effectId} zrušen: Hráč ${targetPlayer.name} má Absolutní imunitu!`);
    if (activePlayer.status.notifications) {
       activePlayer.status.notifications.push(`Tvůj útok na hráče ${targetPlayer.name} selhal kvůli imunitě!`);
    }
    return newPlayers;
  }

  switch (effectId) {
    case "EFF_001": // +: Bonus k lízání
      activePlayer.status.extraDraw = (activePlayer.status.extraDraw || 0) + 1;
      break;

    case "EFF_002": // Karta pi: Moje R se stává pi
      activePlayer.targetR = "π";
      activePlayer.status.mathModifiers.push("PI_TARGET");
      break;

    case "EFF_003": // Odstranění operátoru všem oponentům
      newPlayers.forEach((p: Player) => {
        if (p.id !== activePlayer.id) {
          const opIndex = p.hand.findIndex((c: GameCard) => cardsDatabase[c.symbol]?.type === 'operator');
          if (opIndex !== -1) {
            p.hand.splice(opIndex, 1);
            p.status.notifications.push(`Hráč ${activePlayer.name} ti zničil operátor v ruce!`);
          }
        }
      });
      break;

    case "EFF_004": // Absolutní imunita
      activePlayer.status.immune = true;
      break;

    case "EFF_006": // X: Výměna karty na stole za kartu z ruky
      if (targetPlayer && targetCardId && playedCard) {
        let stolenCard: GameCard | null = null;
        
        const swapInBoard = (cards: GameCard[]): GameCard[] => {
          return cards.map(c => {
            if (c.id === targetCardId) {
              stolenCard = { ...c, exponent: null }; // Ukradneme základ bez exponentu
              return { ...playedCard, exponent: c.exponent }; // Nahradíme základ, exponent zůstává
            }
            if (c.exponent) {
                const result = swapInBoard([c.exponent]);
                c.exponent = result.length > 0 ? result[0] : null;
            }
            return c;
          });
        };
        
        targetPlayer.board = swapInBoard(targetPlayer.board);
        if (stolenCard) {
          activePlayer.hand.push(stolenCard);
          targetPlayer.status.notifications.push(`Hráč ${activePlayer.name} ti vyměnil kartu na tabuli za jinou!`);
        }
      }
      break;

    case "EFF_007": // Smazání čísel a operátorů z ruky oponenta
      if (targetPlayer) {
        const originalLength = targetPlayer.hand.length;
        targetPlayer.hand = targetPlayer.hand.filter((c: GameCard) => {
          const type = cardsDatabase[c.symbol]?.type;
          return type !== 'number' && type !== 'operator';
        });
        if (targetPlayer.hand.length < originalLength) {
           targetPlayer.status.notifications.push(`Hráč ${activePlayer.name} ti spálil čísla a operátory v ruce!`);
        }
      }
      break;

    case "EFF_008": // *: Velký bonus k lízání
      activePlayer.status.extraDraw = (activePlayer.status.extraDraw || 0) + 2;
      break;

    case "EFF_010": // Krádež náhodné karty z ruky
      if (targetPlayer && targetPlayer.hand.length > 0) {
        const randomIndex = Math.floor(Math.random() * targetPlayer.hand.length);
        const [stolen] = targetPlayer.hand.splice(randomIndex, 1);
        activePlayer.hand.push(stolen);
        
        // PŘIDÁNO: Notifikace
        targetPlayer.status.notifications.push(`🥷 Hráč ${activePlayer.name} ti ukradl kartu z ruky!`);
      }
      break;

    case "EFF_011": // Zmrazení
      if (targetPlayer) {
        targetPlayer.status.frozen = true;
        targetPlayer.status.notifications.push(`❄️ Hráč ${activePlayer.name} tě zmrazil! Vynecháváš tah.`);
      }
      break;

    case "EFF_013": // Zablokování operací
      if (targetPlayer) {
        targetPlayer.status.operationLock = true;
        targetPlayer.status.notifications.push(`🔒 Hráč ${activePlayer.name} ti zablokoval používání operátorů!`);
      }
      break;

    case "EFF_014": // /: Krádež karty ze stolu oponenta do ruky
      if (targetPlayer && targetCardId) {
        const stealFromBoard = (cards: GameCard[]): GameCard[] => {
          return cards.filter(c => {
            if (c.id === targetCardId) {
              activePlayer.hand.push({ ...c, exponent: null });
              return false;
            }
            if (c.exponent) {
                const result = stealFromBoard([c.exponent]);
                c.exponent = result.length > 0 ? result[0] : null;
            }
            return true;
          });
        };
        targetPlayer.board = stealFromBoard(targetPlayer.board);
        targetPlayer.status.notifications.push(`🥷 Hráč ${activePlayer.name} ti ukradl kartu přímo z tabule!`);
      }
      break;

    case "EFF_020": // mod: Moje R se změní na zbytek po dělení (příklad)
      if (typeof activePlayer.targetR === 'number') {
        activePlayer.targetR = activePlayer.targetR % 10;
      }
      break;

    case "EFF_025": // Derivace: Odstranění exponentů u X na stole soupeřů
      newPlayers.forEach((p: Player) => {
        if (p.id !== activePlayer.id) {
          let destroyed = false;
          const destroyXExponents = (cards: GameCard[]): GameCard[] => {
            return cards.map(c => {
              if (c.symbol === 'x' && c.exponent) {
                 destroyed = true;
                 return { ...c, exponent: null };
              }
              if (c.exponent) {
                const result = destroyXExponents([c.exponent]);
                c.exponent = result.length > 0 ? result[0] : null;
              }
              return c;
            });
          };
          p.board = destroyXExponents(p.board);
          if (destroyed) {
             p.status.notifications.push(`📉 Hráč ${activePlayer.name} ti zderivoval X a zničil jeho exponent!`);
          }
        }
      });
      break;
    
    case "EFF_026": // int: Úplně nové náhodné R pro oponenta (nebo sebe)
      if (targetPlayer) {
        targetPlayer.targetR = generatePersonalTargetR(currentDifficulty);
        targetPlayer.status.notifications.push(`⚠️ Hráč ${activePlayer.name} ti kompletně změnil cíl R! Nový cíl je: ${targetPlayer.targetR}`);
      }
      break;

    case "EFF_027": // Sumace: Dvojitý tah
      activePlayer.status.extraTurn = true;
      break;

    case "EFF_028": // Prohození stolu (Board swap)
      if (targetPlayer) {
        const tempBoard = activePlayer.board;
        activePlayer.board = targetPlayer.board;
        targetPlayer.board = tempBoard;
        targetPlayer.status.notifications.push(`🔄 Hráč ${activePlayer.name} si s tebou prohodil celou tabuli!`);
      }
      break;

    case "EFF_031": // Očištění (Clear all negative status)
      activePlayer.status.frozen = false;
      activePlayer.status.operationLock = false;
      activePlayer.status.mustPlayOperation = false;
      activePlayer.status.noDrawNextTurn = false;
      activePlayer.status.drawReduction = 0;
      activePlayer.status.playLimit = null;
      break;

    case "EFF_033": // Odstranění poslední karty ze stolu oponenta
      if (targetPlayer && targetPlayer.board.length > 0) {
        targetPlayer.board.pop();
        targetPlayer.status.notifications.push(`Hráč ${activePlayer.name} ti smazal poslední kartu z tabule!`);
      }
      break;

    case "EFF_035": // Nekonečné tahy (Limit off)
      activePlayer.status.infinitePlays = true;
      break;

    case "EFF_036": // cotg: Inverze symbolu (např. x -> -x)
      if (targetPlayer && targetCardId) {
        const invertCard = (cards: GameCard[]): GameCard[] => {
          return cards.map(c => {
            if (c.id === targetCardId) {
              if (c.symbol.startsWith('-')) c.symbol = c.symbol.substring(1);
              else c.symbol = '-' + c.symbol;
            }
            if (c.exponent) {
                const result = invertCard([c.exponent]);
                c.exponent = result.length > 0 ? result[0] : null;
            }
            return c;
          });
        };
        targetPlayer.board = invertCard(targetPlayer.board);
        targetPlayer.status.notifications.push(`Hráč ${activePlayer.name} ti invertoval znaménko na tabuli!`);
      }
      break;

    case "EFF_042": // Globální zmrazení všech oponentů
      newPlayers.forEach((p: Player) => {
        if (p.id !== activePlayer.id) {
           p.status.frozen = true;
           p.status.notifications.push(`❄️ Hráč ${activePlayer.name} plošně zmrazil všechny soupeře! Vynecháváš tah.`);
        }
      });
      break;

    case "EFF_045": // det: Totální vymazání karty ze všech ploch (Board)
      if (targetCardId) {
        newPlayers.forEach((p: Player) => {
          const destroyCard = (cards: GameCard[]): GameCard[] => {
            return cards.filter(c => {
              if (c.id === targetCardId) return false;
              if (c.exponent) {
                const result = destroyCard([c.exponent]);
                c.exponent = result.length > 0 ? result[0] : null;
              }
              return true;
            });
          };
          const oldLength = JSON.stringify(p.board).length;
          p.board = destroyCard(p.board);
          if (JSON.stringify(p.board).length < oldLength && p.id !== activePlayer.id) {
             p.status.notifications.push(`Hráč ${activePlayer.name} použil Determinant a kompletně ti vymazal cíl z tabule!`);
          }
        });
      }
      break;

    default:
      console.log(`Logika pro efekt '${effectId}' je spravována v App.tsx nebo není definována.`);
  }

  return newPlayers;
};