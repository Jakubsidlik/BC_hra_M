import type { GameCard } from './effects';
import { cardsDatabase } from '../data/cardsDB';

export type SpecialSlotKey = 'lower' | 'upper' | 'order' | 'single' | 'ul' | 'ur' | 'll' | 'lr' | 'a' | 'b';

export interface SpecialSlotConfig {
  key: SpecialSlotKey;
  label: string;
}


const SLOT_LABELS: Record<SpecialSlotKey, string> = {
  upper: 'Horní slot',
  lower: 'Dolní slot',
  order: 'Řád',
  single: 'Slot',
  ul: 'Horní levý',
  ur: 'Horní pravý',
  ll: 'Dolní levý',
  lr: 'Dolní pravý',
  a: 'Hodnota a',
  b: 'Hodnota b',
};

export function getSpecialSlots(symbol: string): SpecialSlotConfig[] {
  const slots = cardsDatabase[symbol]?.slots ?? [];
  return slots.map(key => ({ key: key as SpecialSlotKey, label: SLOT_LABELS[key as SpecialSlotKey] || 'Slot' }));
}

export function createSlotCards(symbol: string): Record<string, GameCard | null> | undefined {
  const slots = getSpecialSlots(symbol);
  if (slots.length === 0) return undefined;
  return slots.reduce<Record<string, GameCard | null>>((acc, slot) => {
    acc[slot.key] = null;
    return acc;
  }, {});
}

export function getSlotCardValue(card: GameCard, key: SpecialSlotKey): GameCard | null {
  return card.slotCards?.[key] ?? null;
}

// 1. CHYBĚJÍCÍ DEFINICE OBTÍŽNOSTI
export type DifficultyMode = 'ZŠ' | 'SŠ' | 'VŠ';

// 2. GENEROVÁNÍ CÍLE (R)
export function generatePersonalTargetR(difficulty: DifficultyMode): string {
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const gcd = (a: number, b: number): number => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const temp = y;
      y = x % y;
      x = temp;
    }
    return x;
  };
  const formatTerm = (coefficient: number, symbol: string): string => {
    if (coefficient === 1) return symbol;
    if (coefficient === -1) return `-${symbol}`;
    return `${coefficient}${symbol}`;
  };

  if (difficulty === 'ZŠ') {
    // ZŠ: -99..99 a členy -9x..9x / -9y..9y (bez nulového koeficientu)
    if (Math.random() < 0.5) {
      return `${randInt(-99, 99)}`;
    }
    const symbol = pick(['x', 'y']);
    let coefficient = 0;
    while (coefficient === 0) {
      coefficient = randInt(-9, 9);
    }
    return formatTerm(coefficient, symbol);
  }

  if (difficulty === 'SŠ') {
    // SŠ: -99..99, -99x..99x, -99y..99y, -99e..99e, -99π..99π,
    // plus speciální cíle se sqrt(2) a zlomky v základním tvaru.
    const reducedFractions: string[] = [];
    for (let numerator = 1; numerator <= 9; numerator += 1) {
      for (let denominator = 2; denominator <= 9; denominator += 1) {
        if (gcd(numerator, denominator) === 1) {
          reducedFractions.push(`${numerator}/${denominator}`);
        }
      }
    }

    const category = pick(['number', 'x', 'y', 'e', 'π', 'sqrt-special', 'fraction']);
    if (category === 'sqrt-special') {
      return pick(['sqrt(2)', '2*sqrt(2)', 'sqrt(2)/3', 'sqrt(2)/4']);
    }

    if (category === 'fraction') {
      return pick(reducedFractions);
    }

    if (category === 'number') {
      return `${randInt(-99, 99)}`;
    }

    let coefficient = 0;
    while (coefficient === 0) {
      coefficient = randInt(-99, 99);
    }
    return formatTerm(coefficient, category);
  }

  if (difficulty === 'VŠ') {
    // VŠ: -99..99, -99x..99x, -99y..99y, -99e..99e, -99π..99π
    const category = pick(['number', 'x', 'y', 'e', 'π']);
    if (category === 'number') {
      return `${randInt(-99, 99)}`;
    }

    let coefficient = 0;
    while (coefficient === 0) {
      coefficient = randInt(-99, 99);
    }
    return formatTerm(coefficient, category);
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
    'log3': 'log3',
    'log2': 'log2',
    'log': 'log10',
    '√': 'sqrt',
    'mod': '%'
  };

  const getSlotExpression = (card: GameCard, keys: string[], fallback: string): string => {
    const slotCard = keys
      .map(key => card.slotCards?.[key])
      .find((value): value is GameCard => !!value);
    return slotCard ? parseBoardToMathString([slotCard]) : fallback;
  };

  const resultParts: string[] = [];
  const closeBrackets = new Set([')', ']', '}']);
  const matchingOpen: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{',
  };

  for (let i = 0; i < board.length; i++) {
    const card = board[i];
    if (card.absoluteBoundary === 'left') {
      let depth = 0;
      let rightIndex = -1;
      for (let j = i + 1; j < board.length; j++) {
        const candidate = board[j];
        if (candidate.absoluteBoundary === 'left') {
          depth += 1;
          continue;
        }
        if (candidate.absoluteBoundary === 'right') {
          if (depth === 0) {
            rightIndex = j;
            break;
          }
          depth -= 1;
        }
      }

      if (rightIndex === -1) {
        continue;
      }

      const inner = parseBoardToMathString(board.slice(i + 1, rightIndex)) || '0';
      resultParts.push(`Abs(${inner})`);
      i = rightIndex;
      continue;
    }

    if (card.absoluteBoundary === 'right') {
      continue;
    }

    let sym = symbolMap[card.symbol] || card.symbol;

    if (i > 0) {
      const prevCard = board[i - 1];
      const prevIsDigitOrVar = prevCard.symbol.match(/^[0-9]$/) || ['x', 'y', 'π', 'e'].includes(prevCard.symbol);
      const currIsDigitOrVar = card.symbol.match(/^[0-9]$/) || ['x', 'y', 'π', 'e'].includes(card.symbol);
      const prevIsCloseBracket = [')', ']', '}'].includes(prevCard.symbol);
      const currIsOpenBracket = ['(', '[', '{'].includes(card.symbol);
      const functionPrefixes = ['sin', 'cos', 'tg', 'cotg', 'log', 'log2', 'log3', 'sqrt', 'int', '∑', '∏', 'lim', 'd/dx'];
      const trigPrefixes = ['sin', 'cos', 'tg', 'cotg'];
      const currIsFunction = functionPrefixes.some(pf => card.symbol === pf || card.symbol.startsWith(pf + '('));
      const prevIsTrigFunction = trigPrefixes.some(pf => prevCard.symbol === pf || prevCard.symbol.startsWith(pf + '('));
      const currIsTrigFunction = trigPrefixes.some(pf => card.symbol === pf || card.symbol.startsWith(pf + '('));

      // Pravidla pro implicitní násobení:
      // 1) Číslo/Proměnná -> Otevírací závorka  (např. "5(")
      // 2) Číslo/Proměnná -> Funkce             (např. "2sin")
      // 3) Uzavírací závorka -> Otevírací závorka (např. ")(")
      // 4) Uzavírací závorka -> Číslo/Proměnná  (např. ")5")
      // 5) Uzavírací závorka -> Funkce          (např. ")sin")
      if (
        (prevIsDigitOrVar && currIsOpenBracket) ||
        (prevIsDigitOrVar && currIsFunction) ||
        (prevIsTrigFunction && currIsDigitOrVar) ||
        (prevIsTrigFunction && currIsOpenBracket) ||
        (prevIsTrigFunction && currIsTrigFunction) ||
        (prevIsCloseBracket && currIsOpenBracket) ||
        (prevIsCloseBracket && currIsDigitOrVar) ||
        (prevIsCloseBracket && currIsFunction)
      ) {
        resultParts.push("*");
      }
    }

    if (card.symbol === 'a^b') {
      const exponentCard = card.slotCards?.single;
      const exponentStr = exponentCard ? parseBoardToMathString([exponentCard]) : '1';
      if (resultParts.length === 0) {
        continue;
      }

      const lastPart = resultParts[resultParts.length - 1];
      if (closeBrackets.has(lastPart)) {
        const expectedOpen = matchingOpen[lastPart];
        let balance = 0;
        let openIndex = -1;
        for (let j = resultParts.length - 1; j >= 0; j--) {
          const part = resultParts[j];
          if (part === lastPart) {
            balance += 1;
          } else if (part === expectedOpen) {
            balance -= 1;
            if (balance === 0) {
              openIndex = j;
              break;
            }
          }
        }

        if (openIndex >= 0) {
          const baseExpr = resultParts.slice(openIndex).join('');
          resultParts.splice(openIndex, resultParts.length - openIndex, `(${baseExpr})**(${exponentStr})`);
        }
      } else {
        const baseExpr = resultParts.pop() ?? '1';
        resultParts.push(`(${baseExpr})**(${exponentStr})`);
      }
      continue;
    }

    if (card.symbol === 'vektor') {
      const a = getSlotExpression(card, ['a', 'upper', 'lower'], '0');
      const b = getSlotExpression(card, ['b', 'lower', 'upper'], '0');
      resultParts.push(`sqrt((${a})**2 + (${b})**2)`);
      continue;
    }

    if (card.symbol === 'skalar') {
      const a = getSlotExpression(card, ['a', 'upper', 'lower'], '0');
      const b = getSlotExpression(card, ['b', 'lower', 'upper'], '0');
      resultParts.push(`((${a})*(${a})) + ((${b})*(${b}))`);
      continue;
    }

    // Specifické překlady pro SymPy u goniometrie (radian pouze, případně starý "deg, rad" zápis)
    // Zachycuje vzor např. "sin(π/4)" nebo "sin(45°, π/4)" a použije radián
    const goniometryMatch = sym.match(/^(sin|cos|tg|cotg)\((.*)\)$/);
    if (goniometryMatch) {
      const func = goniometryMatch[1] === 'tg' ? 'tan' :
                   goniometryMatch[1] === 'cotg' ? 'cot' :
                   goniometryMatch[1];
      let radian = goniometryMatch[2];
      if (radian.includes(',')) {
        const parts = radian.split(',');
        radian = parts[parts.length - 1].trim();
      }
      radian = radian.replace(/π/g, 'pi');
      sym = `${func}(${radian})`;
    } else {
      // Původní fallback překlady
      sym = sym.replace(/^tg\(/, 'tan(');
      sym = sym.replace(/^cotg\(/, 'cot(');
      sym = sym.replace(/π/g, 'pi');
    }

    // 1. ZPRACOVÁNÍ PREFIXOVÝCH FUNKCÍ (Integrál, Suma, atd.)
    if (['int', '∑', '∏', 'lim', 'd/dx'].includes(card.symbol)) {
      // Tady je trik: integrál "vysaje" jen to, co je v jeho dosahu
      // Pro jednoduchost teď bereme vše napravo, ale bez 'break'
      // Pokud chceš, aby integrál končil, doporučuji přidat kartu "dx" nebo ")"
      let rest = board.slice(i + 1);
      if (card.symbol === 'int') {
        const endIdx = rest.findIndex(nextCard => nextCard.afterDxDy);
        if (endIdx >= 0) rest = rest.slice(0, endIdx);
      }
      const inner = parseBoardToMathString(rest) || "1";

      if (card.symbol === 'int') {
        const variable = card.integralVariable === 'y' ? 'y' : 'x';
        const lower = card.slotCards?.lower ? parseBoardToMathString([card.slotCards.lower]) : '0';
        const upper = card.slotCards?.upper ? parseBoardToMathString([card.slotCards.upper]) : '1';
        resultParts.push(`Integral(${inner}, (${variable}, ${lower}, ${upper}))`);
      } else if (card.symbol === '∑') {
        const variable = card.seriesVariable === 'y' ? 'y' : 'x';
        const lower = card.slotCards?.lower ? parseBoardToMathString([card.slotCards.lower]) : '1';
        const upper = card.slotCards?.upper ? parseBoardToMathString([card.slotCards.upper]) : '1';
        resultParts.push(`Sum(${inner}, (${variable}, ${lower}, ${upper}))`);
      } else if (card.symbol === '∏') {
        const variable = card.seriesVariable === 'y' ? 'y' : 'x';
        const lower = card.slotCards?.lower ? parseBoardToMathString([card.slotCards.lower]) : '1';
        const upper = card.slotCards?.upper ? parseBoardToMathString([card.slotCards.upper]) : '1';
        resultParts.push(`Product(${inner}, (${variable}, ${lower}, ${upper}))`);
      } else if (card.symbol === 'd/dx') {
        const variable = card.derivativeVariable === 'y' ? 'y' : 'x';
        const order = card.slotCards?.order ? parseBoardToMathString([card.slotCards.order]) : '1';
        resultParts.push(`Derivative(${inner}, ${variable}, ${order})`);
      } else if (card.symbol === 'lim') {
        const variable = card.limitVariable === 'y' ? 'y' : 'x';
        const target = card.slotCards?.single ? parseBoardToMathString([card.slotCards.single]) : '0';
        resultParts.push(`Limit(${inner}, ${variable}, ${target})`);
      }
      
      // DŮLEŽITÉ: Po prefixové funkci už zbytek v tomto cyklu nezpracováváme,
      // protože je "uvnitř" té funkce.
      return resultParts.join(''); 
    }

    // 2. ZPRACOVÁNÍ MOCNIN (Recursive)
    if (card.exponent) {
      const base = (sym.length > 1 || !/^[0-9xπe]$/.test(sym)) ? `(${sym})` : sym;
      const expStr = parseBoardToMathString([card.exponent]);
      sym = `(${base})**(${expStr})`; // Používáme Python **
    }

    resultParts.push(sym);
  }

  return resultParts.join('');
}


// 4. POMOCNÉ FUNKCE PRO UI
export function hasOperation(board: GameCard[]): boolean {
  // Všechny operace s efekty: +, -, *, /, a^b, sqrt, mod, n!, d/dx, int, ∑, log, nCk, ∏, lim, det
  // Goniometrické funkce jako sin, cos, tg, cotg už se sem neřadí, pohlíží se na ně jako na entity vyhodnotitelné samostatně/čísla.
  const operations = [
    '+', '-', '*', '/', 'a^b', 'sqrt', 'abs', 'skalar', 'mod', 'n!', 'd/dx', 'int',
    '∑', 'log', 'log2', 'log3', 'nCk', '∏', 'lim', 'det',
    '∫', // alternativní symbol pro integrál
  ];
  const hasExplicitOp = board.some(card => operations.includes(card.symbol) || card.exponent);
  if (hasExplicitOp) return true;

  // Detekce implicitního násobení
  for (let i = 1; i < board.length; i++) {
    const prevCard = board[i - 1];
    const card = board[i];
    
    const prevIsDigitOrVar = prevCard.symbol.match(/^[0-9]$/) || ['x', 'y', 'vektor', 'π', 'e'].includes(prevCard.symbol);
    const currIsDigitOrVar = card.symbol.match(/^[0-9]$/) || ['x', 'y', 'vektor', 'π', 'e'].includes(card.symbol);
    const prevIsCloseBracket = [')', ']', '}'].includes(prevCard.symbol);
    const currIsOpenBracket = ['(', '[', '{'].includes(card.symbol);
    const functionPrefixes = ['sin', 'cos', 'tg', 'cotg', 'log', 'log2', 'log3', 'sqrt', 'abs', 'int', '∑', '∏', 'lim', 'd/dx'];
    const currIsFunction = functionPrefixes.some(pf => card.symbol === pf || card.symbol.startsWith(pf + '('));

    if (
      (prevIsDigitOrVar && currIsOpenBracket) ||
      (prevIsDigitOrVar && currIsFunction) ||
      (prevIsCloseBracket && currIsOpenBracket) ||
      (prevIsCloseBracket && currIsDigitOrVar) ||
      (prevIsCloseBracket && currIsFunction)
    ) {
      return true;
    }
  }

  return false;
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
  if (!isNaN(Number(symbol)) || ['π', 'e'].includes(symbol) || ['sin', 'cos', 'tg', 'cotg'].some(pf => symbol.startsWith(pf + '('))) return 'border-blue-500';
  
  // Proměnné: šedé
  if (['x', 'y', 'n', 'vektor'].includes(symbol)) return 'border-slate-400';
  
  // Syntaxe (závorky, rovná se): černé
  if (['(', ')', '[', ']', '{', '}', '=', 'dxdy', 'zada'].includes(symbol)) return 'border-black';
  
  // Operace: oranžové
  const operators = [
    '+', '-', '*', '/', 'a^b', 'sqrt', 'abs', 'skalar', 'mod', 'n!', 
    'd/dx', 'int', '∑', 'log', 'log2', 'log3', 
    'nCk', '∏', 'lim', 'det'
  ];
  if (symbol === '|') return 'border-orange-500';
  if (operators.includes(symbol)) return 'border-orange-500';
  
  // Fallback
  return 'border-slate-400';
}

// 5. GENEROVÁNÍ BALÍČKU (Pokud ji máš vyřešenou jinak, nahraď svou původní)
export function generateFilteredDeck(difficulty: DifficultyMode): GameCard[] {
  const deck: GameCard[] = [];
  const vsSpecialOperators = ['d/dx', 'int', '∑', '∏', 'lim'];
  
  // Definice vyloučených karet podle obtížností
  // ZŠ: Jen základní operace (+, -, *, /), čísla, proměnné (x, y)
  // SŠ: ZŠ + mocniny, odmocniny,log, gon. fce, faktoriál, kombinace
  // VŠ: Všechny operace včetně derivací, integrálů, sum, produktů, limitů, determinantů
  const difficultyFilters: Record<DifficultyMode, string[]> = {
    // ZŠ vyloučí: vysokoškolský obsah + pokročilé SŠ operace
    'ZŠ': [
      'π', 'e', 'mod', 'n!', 
        'd/dx', 'int', '∑', 'log2', 'log', 'log3', 'sin', 'cos', 'tg', 'cotg', 
      'nCk', '∏', 'lim', 'det', 'skalar', 'vektor', 'abs'
    ],
    // SŠ vyloučí: vysokoškolský obsah + modulo
    'SŠ': [
      'd/dx', 'int', '∑', '∏', 'lim', 'det', 'mod'
    ],
    // VŠ: bez vyloučení
    'VŠ': []
  };

  const excludedCards = [...new Set([...difficultyFilters[difficulty], ...vsSpecialOperators])];
  
  Object.keys(cardsDatabase).forEach(symbol => {
    // Vyloučení pokud sedí přesně NEBO pokud je to funkce s úhlovým parametrem (např. 'sin(0)' a ex je 'sin')
    const isExcluded = excludedCards.some(ex => symbol === ex || symbol.startsWith(ex + '('));
    if (isExcluded) return;
    
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

