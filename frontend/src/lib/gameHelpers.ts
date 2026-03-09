import type { GameCard } from './effects';

// 1. CHYBĚJÍCÍ DEFINICE OBTÍŽNOSTI
export type DifficultyMode = 'ZŠ' | 'SŠ' | 'VŠ';

// 2. GENEROVÁNÍ CÍLE (R)
export function generatePersonalTargetR(difficulty: DifficultyMode): string {
  // Pomocné funkce pro náhodný výběr
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  if (difficulty === 'ZŠ') {
    const category = randInt(1, 4); // 4 kategorie pro ZŠ
    switch (category) {
      case 1: return `${randInt(1, 9)}`;                   // 1. jednociferné celé číslo
      case 2: return `${randInt(10, 99)}`;                 // 2. dvouciferné celé číslo
      case 3: return `${randInt(100, 999)}`;               // 3. trojciferné celé číslo
      case 4: return `${randInt(1, 9)}x`;                  // 4. jednociferné celé číslo a X
    }
  }

  if (difficulty === 'SŠ') {
    const category = randInt(1, 7); // 7 kategorií pro SŠ
    switch (category) {
      case 1: return `${randInt(10, 99)}`;                 // 1. dvouciferné celé číslo
      case 2: return `${randInt(100, 999)}`;               // 2. trojciferné celé číslo
      case 3: return `${randInt(1, 9)}x`;                  // 3. jednociferné celé číslo a X
      case 4: return `${randInt(10, 99)}x`;                // 4. dvouciferné celé číslo a X
      case 5: // 5. lib. kombinace čísel a symbolu
        return pick(['2π', 'e^2', 'sqrt(2)', 'ln(10)', 'π/2', '10π']); 
      case 6: // 6. lib. kombinace čísel, symbolu a X
        return pick(['πx', 'e^x', 'sin(x)', 'cos(x)', 'tg(x)', 'sqrt(x)', '2sin(x)']);
      case 7: // 7. Zkoušejte cokoliv (matematické standardy)
        return pick(['x^2-1', 'sin(x)^2+cos(x)^2', '2^x', '(x+1)^2', 'x/2 + π']);
    }
  }

  if (difficulty === 'VŠ') {
    const category = randInt(1, 5); // 5 kategorií pro VŠ
    switch (category) {
      case 1: return `${randInt(10, 99)}`;                 // 1. dvouciferné celé číslo
      case 2: return `${randInt(10, 99)}x`;                // 2. dvouciferné celé číslo a X
      case 3: // 3. lib. kombinace čísel a symbolu
        return pick(['ln(2)', 'sqrt(π)', 'e^π', 'sin(π/4)', 'ln(e^2)']); 
      case 4: // 4. lib. kombinace čísel, symbolu a X
        return pick(['x*e^x', 'sin(x)/x', 'ln(x^2)', 'x^x', 'sqrt(x^2+1)']);
      case 5: // 5. lib. kombinace čísla a mocniny X
        return `${randInt(2, 99)}x^${randInt(2, 5)}`;      // např. 15x^3, 42x^2
    }
  }

  return "0"; // Fallback
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
  const operations = ['+', '-', '*', '/', '^', '√', '∫', '∑', 'lim', 'sin', 'cos', 'tan', 'ln', 'log', 'mod'];
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
  if (!isNaN(Number(symbol))) return 'border-slate-400';
  if (['+', '-', '*', '/', '(', ')'].includes(symbol)) return 'border-blue-500';
  if (['x', 'π', 'e', 'n'].includes(symbol)) return 'border-emerald-500';
  if (['∫', '∑', 'lim', 'd/dx'].includes(symbol)) return 'border-amber-500';
  if (['sin', 'cos', 'tg', 'cotg', 'log', 'ln', 'sqrt', 'mod'].includes(symbol)) return 'border-purple-500';
  return 'border-slate-500';
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

