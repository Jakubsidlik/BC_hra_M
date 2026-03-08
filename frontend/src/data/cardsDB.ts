export type TargetType = 'SELF' | 'OPPONENT' | 'ANY' | 'ALL';
export type CardType = 'number' | 'operator' | 'variable' | 'function' | 'syntax';

export interface EffectDetails {
  id: string;
  name: string;
  description: string;
  target: TargetType;
}

export interface CardData {
  symbol: string;
  type: CardType;
  count: number;
  image: string; // <-- PŘIDÁNA VLASTNOST PRO OBRÁZEK
  hasEffect?: boolean;
  effects?: {
    optionA?: EffectDetails;
    optionB?: EffectDetails;
  };
}

// DATABÁZE VŠECH KARET VE HŘE
export const cardsDatabase: Record<string, CardData> = {
  // --- ČÍSLA (Obyčejné karty bez efektů) ---
  '0': { symbol: '0', type: 'number', count: 6, image: '/cards/0.svg' },
  '1': { symbol: '1', type: 'number', count: 8, image: '/cards/1.svg' },
  '2': { symbol: '2', type: 'number', count: 8, image: '/cards/2.svg' },
  '3': { symbol: '3', type: 'number', count: 6, image: '/cards/3.svg' },
  '4': { symbol: '4', type: 'number', count: 6, image: '/cards/4.svg' },
  '5': { symbol: '5', type: 'number', count: 6, image: '/cards/5.svg' },
  '6': { symbol: '6', type: 'number', count: 4, image: '/cards/6.svg' },
  '7': { symbol: '7', type: 'number', count: 4, image: '/cards/7.svg' },
  '8': { symbol: '8', type: 'number', count: 4, image: '/cards/8.svg' },
  '9': { symbol: '9', type: 'number', count: 4, image: '/cards/9.svg' },

  // --- ZÁKLADNÍ OPERÁTORY ---
  '+': { symbol: '+', type: 'operator', count: 10, image: '/cards/plus.svg' },
  '-': { symbol: '-', type: 'operator', count: 10, image: '/cards/minus.svg' },
  '*': { symbol: '*', type: 'operator', count: 8, image: '/cards/multiply.svg' },
  '/': { 
    symbol: '/', 
    type: 'operator', 
    count: 4, 
    image: '/cards/divide.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_014', name: 'Krádež ze stolu', description: 'Vezmi oponentovi kartu ze stolu do své ruky.', target: 'OPPONENT' }
    }
  },

  // --- KONSTANTY A PROMĚNNÉ ---
  'π': { 
    symbol: 'π', 
    type: 'number', 
    count: 3, 
    image: '/cards/pi.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_002', name: 'Náhrada R', description: 'Upravuje backendový výpočet cíle R.', target: 'SELF' }
    }
  },
  'e': { symbol: 'e', type: 'number', count: 3, image: '/cards/e.svg' },
  'x': { 
    symbol: 'x', 
    type: 'variable', 
    count: 5, 
    image: '/cards/x.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_006', name: 'Výměna X', description: 'Vyměň tuto kartu za libovolnou kartu na stole oponenta.', target: 'OPPONENT' }
    }
  },
  'y': { symbol: 'y', type: 'variable', count: 5, image: '/cards/y.svg' },

  // --- POKROČILÉ MATEMATICKÉ FUNKCE A EFEKTY ---
  'dx': { 
    symbol: 'dx', 
    type: 'function', 
    count: 3, 
    image: '/cards/dx.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_025', name: 'Derivace', description: 'Odstraní všechny exponenty ze stolu zvoleného soupeře.', target: 'OPPONENT' },
      optionB: { id: 'EFF_031', name: 'Očištění', description: 'Zbaví tě všech negativních stavů (zmrazení, zámek).', target: 'SELF' }
    }
  },
  'int': {  
    symbol: 'int', 
    type: 'function', 
    count: 3, 
    image: '/cards/int.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_026', name: 'Změna osudu', description: 'Změní cílové číslo R pro všechny hráče.', target: 'ALL' }
    }
  },
  '∑': {  
    symbol: '∑', 
    type: 'function', 
    count: 3, 
    image: '/cards/sum.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_027', name: 'Sumace', description: 'Získáš dvojitý tah (hraješ znovu).', target: 'SELF' }
    }
  },
  'mod': { 
    symbol: 'mod', 
    type: 'function', 
    count: 3, 
    image: '/cards/mod.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_020', name: 'Změna R', description: 'Modifikuje výpočet cíle v backendu.', target: 'SELF' }
    }
  },
  'det': { 
    symbol: 'det', 
    type: 'function', 
    count: 3, 
    image: '/cards/det.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_045', name: 'Vyškrtnutí', description: 'Zničí jednu konkrétní kartu kdekoli na stole.', target: 'ANY' }
    }
  },
  'cotg': { 
    symbol: 'cotg', 
    type: 'function', 
    count: 2, 
    image: '/cards/cotg.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_036', name: 'Inverze', description: 'Obrátí znaménko vybrané kartě na stole (+ na - a naopak).', target: 'ANY' }
    }
  },
  'lim': { 
    symbol: 'lim', 
    type: 'function', 
    count: 2,
    image: '/cards/lim.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_015', name: 'Vize budoucnosti', description: 'Podívej se na 3 vrchní karty balíčku a 1 si vezmi.', target: 'SELF' }
    }
  },
  '∏': { 
    symbol: '∏', 
    type: 'function', 
    count: 2,
    image: '/cards/prod.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_038', name: 'Volba osudu', description: 'Lízni 3 karty, 1 si nech a 2 zahoď na hřbitov.', target: 'SELF' }
    }
  },
  'sin': { 
    symbol: 'sin', 
    type: 'function', 
    count: 2,
    image: '/cards/sin.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_017', name: 'Rekurze (Hřbitov)', description: 'Vezmi si 1 libovolnou kartu ze hřbitova.', target: 'SELF' }
    }
  },
  'cos': { 
    symbol: 'cos', 
    type: 'function', 
    count: 2,
    image: '/cards/cos.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_011', name: 'Zmrazení', description: 'Vybraný hráč příští tah vynechá.', target: 'OPPONENT' }
    }
  },
  'tg': { 
    symbol: 'tg', 
    type: 'function', 
    count: 2,
    image: '/cards/tg.svg'
    // Tangens ponechán jako čistá herní mechanika bez kouzla
  },

  // --- SYNTAXE (Závorky nenecháváme v balíčku, hráči je mají od začátku) ---
  '(': { symbol: '(', type: 'syntax', count: 0, image: '/cards/bracket-left.svg' },
  ')': { symbol: ')', type: 'syntax', count: 0, image: '/cards/bracket-right.svg' }
};