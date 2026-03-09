import type { GameCard } from './effects';

// 1. CHYBĚJÍCÍ DEFINICE OBTÍŽNOSTI
export type DifficultyMode = 'ZŠ' | 'SŠ' | 'VŠ';

// 2. GENEROVÁNÍ CÍLE (R)
export function generatePersonalTargetR(difficulty: DifficultyMode): string {
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const pickVar = () => pick(['x', 'y']);
  const pickConstant = () => pick(['π', 'e']);

  if (difficulty === 'ZŠ') {
    const category = randInt(1, 4);
    switch (category) {
      case 1: return `${randInt(1, 9)}`;                           // jednociferné číslo
      case 2: return `${randInt(10, 99)}`;                         // dvouciferné číslo
      case 3: return `${randInt(100, 999)}`;                       // trojciferné číslo
      case 4: return `${randInt(1, 9)}${pickVar()}`;               // jednociferné číslo a X/Y
    }
  }

  if (difficulty === 'SŠ') {
    const category = randInt(1, 6);
    switch (category) {
      case 1: return `${randInt(10, 99)}`;                         // dvouciferné číslo
      case 2: return `${randInt(100, 999)}`;                       // trojciferné číslo
      case 3: return `${randInt(1, 9)}${pickVar()}`;               // jednociferné číslo a X/Y
      case 4: return `${randInt(10, 99)}${pickVar()}`;             // dvouciferné číslo a X/Y
      case 5: {
        // kombinace čísla a konstanty
        const num = randInt(1, 20);
        const constant = pickConstant();
        return `${num}${constant}`;
      }
      case 6: {
        // kombinace čísla, konstanty a X/Y
        const num = randInt(1, 10);
        const constant = pickConstant();
        const variable = pickVar();
        return `${num}${constant}${variable}`;
      }
    }
  }

  if (difficulty === 'VŠ') {
    const category = randInt(1, 5);
    switch (category) {
      case 1: return `${randInt(10, 99)}`;                         // dvouciferné číslo
      case 2: return `${randInt(10, 99)}${pickVar()}`;             // dvouciferné číslo a X/Y
      case 3: {
        // kombinace čísla a konstanty
        const type = randInt(1, 3);
        if (type === 1) {
          // číslo * konstanta (např 8e, 2π)
          return `${randInt(1, 20)}${pickConstant()}`;
        } else if (type === 2) {
          // jen konstanta
          return pickConstant();
        } else {
          // konstanta * konstanta (π*e)
          const c1 = pickConstant();
          let c2 = pickConstant();
          while (c2 === c1) c2 = pickConstant();
          return `${c1}${c2}`;
        }
      }
      case 4: {
        // kombinace čísla, konstanty a X/Y
        const type = randInt(1, 4);
        const variable = pickVar();
        if (type === 1) {
          // číslo * konstanta * X
          return `${randInt(1, 10)}${pickConstant()}${variable}`;
        } else if (type === 2) {
          // konstanta * X
          return `${pickConstant()}${variable}`;
        } else if (type === 3) {
          // číslo * X
          return `${randInt(1, 20)}${variable}`;
        } else {
          // konstanta * konstanta * X
          const c1 = pickConstant();
          let c2 = pickConstant();
          while (c2 === c1) c2 = pickConstant();
          return `${c1}${c2}${variable}`;
        }
      }
      case 5: {
        // kombinace čísla a mocniny X
        const num = randInt(1, 20);
        const variable = pickVar();
        const power = randInt(2, 5);
        return `${num}${variable}^${power}`;
      }
    }
  }

  return "0";
}

// 3. PŘEVOD PLOCHY NA MATEMATICKÝ STRING PRO BACKEND
export function parseBoardToMathString(board: GameCard[]): string {
  if (!board || board.length === 0) return "";

  // Pomocná mapa pro SymPy transformace
  const symbolMap: Record<string, string> = {
    'π': 'pi',
    'e': 'E',
    'tg': 'tan',
    'cotg': '1/tan',
    'ln': 'log', // SymPy log(x) je přirozený logaritmus
    '√': 'sqrt',
    'mod': '%'
  };

  let result = "";

  for (let i = 0; i < board.length; i++) {
    const card = board[i];
    let sym = symbolMap[card.symbol] || card.symbol;

    // 1. ZPRACOVÁNÍ PREFIXOVÝCH FUNKCÍ (Integrál, Suma, atd.)
    if (['∫', '∑', 'lim'].includes(card.symbol)) {
      // Tady je trik: integrál "vysaje" jen to, co je v jeho dosahu
      // Pro jednoduchost teď bereme vše napravo, ale bez 'break'
      // Pokud chceš, aby integrál končil, doporučuji přidat kartu "dx" nebo ")"
      const rest = board.slice(i + 1);
      const inner = parseBoardToMathString(rest) || "1";

      if (card.symbol === '∫' && card.integralBounds) {
        result += `Integral(${inner}, (x, ${card.integralBounds.lower}, ${card.integralBounds.upper}))`;
      } else if (card.symbol === '∑' && card.integralBounds) {
        result += `Sum(${inner}, (n, ${card.integralBounds.lower}, ${card.integralBounds.upper}))`;
      }
      
      // DŮLEŽITÉ: Po prefixové funkci už zbytek v tomto cyklu nezpracováváme,
      // protože je "uvnitř" té funkce.
      return result; 
    }

    // 2. ZPRACOVÁNÍ MOCNIN (Recursive)
    if (card.exponent) {
      const base = (sym.length > 1 || !/^[0-9xπe]$/.test(sym)) ? `(${sym})` : sym;
      const expStr = parseBoardToMathString([card.exponent]);
      sym = `(${base})**(${expStr})`; // Používáme Python **
    }

    result += sym;
  }

  return result;
}


// 4. POMOCNÉ FUNKCE PRO UI
export function hasOperation(board: GameCard[]): boolean {
  // Všechny operace s efekty: +, -, *, /, a^b, sqrt, mod, n!, d/dx, int, ∑, log, sin, cos, tg, cotg, nCk, ∏, lim, det
  const operations = [
    '+', '-', '*', '/', 'a^b', 'sqrt', 'mod', 'n!', 'd/dx', 'int',
    '∑', 'log', 'sin', 'cos', 'tg', 'cotg', 'nCk', '∏', 'lim', 'det',
    '∫', // alternativní symbol pro integrál
  ];
  return board.some(card => operations.includes(card.symbol) || card.exponent);
}

export function getTargetName(targetCode?: string): string {
  switch (targetCode) {
    case 'SELF': return 'Na sebe';
    case 'OPPONENT': return 'Na soupeře';
    case 'ANY': return 'Na kohokoliv';
    case 'BOARD': return 'Na plochu';
    case 'GLOBAL': return 'Všem';
    default: return 'Pasivní';
  }
}

export function getBorderColor(symbol: string): string {
  // Čísla: modré
  if (!isNaN(Number(symbol)) || ['π', 'e'].includes(symbol)) return 'border-blue-500';
  
  // Proměnné: šedé
  if (['x', 'y', 'n'].includes(symbol)) return 'border-slate-400';
  
  // Syntaxe (závorky, rovná se): černé
  if (['(', ')', '='].includes(symbol)) return 'border-black';
  
  // Operace: oranžové
  const operators = [
    '+', '-', '*', '/', 'a^b', 'sqrt', 'mod', 'n!', 
    'd/dx', 'int', '∑', 'log', 'ln', 'sin', 'cos', 'tg', 'cotg', 
    'nCk', '∏', 'lim', 'det'
  ];
  if (operators.includes(symbol)) return 'border-orange-500';
  
  // Fallback
  return 'border-slate-400';
}

// 5. GENEROVÁNÍ BALÍČKU (Pokud ji máš vyřešenou jinak, nahraď svou původní)
import { cardsDatabase } from '../data/cardsDB';
export function generateFilteredDeck(difficulty: DifficultyMode): GameCard[] {
  const deck: GameCard[] = [];
  
  // Definice vyloučených karet podle obtížností
  // ZŠ: Jen základní operace (+, -, *, /), čísla, proměnné (x, y)
  // SŠ: ZŠ + mocniny, odmocniny,log, gon. fce, faktoriál, kombinace
  // VŠ: Všechny operace včetně derivací, integrálů, sum, produktů, limitů, determinantů
  const difficultyFilters: Record<DifficultyMode, string[]> = {
    // ZŠ vyloučí: vysokoškolský obsah + pokročilé SŠ operace
    'ZŠ': [
      'π', 'e', 'mod', 'n!', 
      'd/dx', 'int', '∑', 'log', 'sin', 'cos', 'tg', 'cotg', 
      'nCk', '∏', 'lim', 'det'
    ],
    // SŠ vyloučí: pouze vysokoškolský obsah
    'SŠ': [
      'd/dx', 'int', '∑', '∏', 'lim', 'det'
    ],
    // VŠ: bez vyloučení
    'VŠ': []
  };

  const excludedCards = difficultyFilters[difficulty];
  
  Object.keys(cardsDatabase).forEach(symbol => {
    if (excludedCards.includes(symbol)) return;
    
    const cardData = cardsDatabase[symbol];
    // Přidáme počet kopií podle count v databázi
    for (let i = 0; i < cardData.count; i++) {
      deck.push({ id: `deck-${symbol}-${i + 1}`, symbol });
    }
  });

  // Zamíchání balíčku (Fisher-Yates shuffle)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

