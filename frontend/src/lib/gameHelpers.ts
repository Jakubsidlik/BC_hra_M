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
  const pickVar = () => pick(['x', 'y']);
  const pickConstant = () => pick(['π', 'e']);
  const withNegativeChance = (value: string) => {
    if (value === '0') return value;
    return Math.random() < 0.2 ? `-${value}` : value;
  };

  if (difficulty === 'ZŠ') {
    const category = randInt(1, 4);
    switch (category) {
      case 1: return withNegativeChance(`${randInt(1, 9)}`);                           // jednociferné číslo
      case 2: return withNegativeChance(`${randInt(10, 99)}`);                         // dvouciferné číslo
      case 3: return withNegativeChance(`${randInt(100, 999)}`);                       // trojciferné číslo
      case 4: return withNegativeChance(`${randInt(1, 9)}${pickVar()}`);               // jednociferné číslo a X/Y
    }
  }

  if (difficulty === 'SŠ') {
    const category = randInt(1, 6);
    switch (category) {
      case 1: return withNegativeChance(`${randInt(10, 99)}`);                         // dvouciferné číslo
      case 2: return withNegativeChance(`${randInt(100, 999)}`);                       // trojciferné číslo
      case 3: return withNegativeChance(`${randInt(1, 9)}${pickVar()}`);               // jednociferné číslo a X/Y
      case 4: return withNegativeChance(`${randInt(10, 99)}${pickVar()}`);             // dvouciferné číslo a X/Y
      case 5: {
        // kombinace čísla a konstanty
        const num = randInt(1, 20);
        const constant = pickConstant();
        return withNegativeChance(`${num}${constant}`);
      }
      case 6: {
        // kombinace čísla, konstanty a X/Y
        const num = randInt(1, 10);
        const constant = pickConstant();
        const variable = pickVar();
        return withNegativeChance(`${num}${constant}${variable}`);
      }
    }
  }

  if (difficulty === 'VŠ') {
    const category = randInt(1, 4);
    switch (category) {
      case 1: return `${randInt(10, 99)}`;                                              // dvouciferné číslo
      case 2: return `${randInt(10, 99)}${pickVar()}`;                                  // dvouciferné číslo a X/Y
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
    'ln': 'log3',
    'log': 'log2',
    'log10': 'log10',
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
      const functionPrefixes = ['sin', 'cos', 'tg', 'cotg', 'log', 'log10', 'ln', 'sqrt', 'int', '∑', '∏', 'lim', 'd/dx'];
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
    '∑', 'log', 'log10', 'ln', 'nCk', '∏', 'lim', 'det',
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
    const functionPrefixes = ['sin', 'cos', 'tg', 'cotg', 'log', 'log10', 'ln', 'sqrt', 'abs', 'int', '∑', '∏', 'lim', 'd/dx'];
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
    'd/dx', 'int', '∑', 'log', 'log10', 'ln', 
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
      'd/dx', 'int', '∑', 'log', 'log10', 'ln', 'sin', 'cos', 'tg', 'cotg', 
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

