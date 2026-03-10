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
  canHaveExponent?: boolean; // <-- VLASTNOST PRO PODPORU EXPONENTŮ
  effects?: {
    optionA?: EffectDetails;
    optionB?: EffectDetails;
  };
}

// DATABÁZE VŠECH KARET VE HŘE (Mapování podle karty.csv)
export const cardsDatabase: Record<string, CardData> = {
  // --- ČÍSLA (EFF_001: Dobrání 1 karty navíc) ---
  '0': { symbol: '0', type: 'number', count: 10, image: '/cards/0.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },
  '1': { symbol: '1', type: 'number', count: 10, image: '/cards/1.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },
  '2': { symbol: '2', type: 'number', count: 10, image: '/cards/2.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },
  '3': { symbol: '3', type: 'number', count: 10, image: '/cards/3.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },
  '4': { symbol: '4', type: 'number', count: 10, image: '/cards/4.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },
  '5': { symbol: '5', type: 'number', count: 10, image: '/cards/5.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },
  '6': { symbol: '6', type: 'number', count: 10, image: '/cards/6.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },
  '7': { symbol: '7', type: 'number', count: 10, image: '/cards/7.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },
  '8': { symbol: '8', type: 'number', count: 10, image: '/cards/8.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },
  '9': { symbol: '9', type: 'number', count: 10, image: '/cards/9.svg', hasEffect: true, effects: { optionA: { id: 'EFF_001', name: 'Bonus karty', description: 'Dobrání 1 karty navíc v příštím tahu.', target: 'SELF' } } },

  // --- KONSTANTY A PROMĚNNÉ ---
  'π': { 
    symbol: 'π', 
    type: 'number', 
    count: 5, 
    image: '/cards/pi.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_002', name: 'Výměna L', description: 'Možnost výměny 1 karty z vlastního řetězce L za kartu z L oponenta.', target: 'OPPONENT' }
    }
  },
  'e': { 
    symbol: 'e', 
    type: 'number', 
    count: 5, 
    image: '/cards/e.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_003', name: 'Imunita', description: 'Imunita proti efektům karet Integrál a Derivace.', target: 'SELF' }
    }
  },
  'y': { 
    symbol: 'y', 
    type: 'variable', 
    count: 10, 
    image: '/cards/y.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_004', name: 'Zničení čísel', description: 'Následující hráč musí z ruky odhodit všechny číslice.', target: 'OPPONENT' }
    }
  },
  'x': { 
    symbol: 'x', 
    type: 'variable', 
    count: 10, 
    image: '/cards/x.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_005', name: 'Zničení operací', description: 'Následující hráč musí z ruky odhodit všechny operace.', target: 'OPPONENT' }
    }
  },

  // --- ZÁKLADNÍ OPERÁTORY ---
  '+': { 
    symbol: '+', 
    type: 'operator', 
    count: 15, 
    image: '/cards/plus.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_006', name: 'Povinná operace', description: 'Následující hráč musí v příštím tahu použít libovolnou operaci.', target: 'OPPONENT' }
    }
  },
  '-': { 
    symbol: '-', 
    type: 'operator', 
    count: 15, 
    image: '/cards/minus.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_007', name: 'Odstranění karty', description: 'Odstranění 1 libovolné karty z ruky zvoleného oponenta.', target: 'OPPONENT' }
    }
  },
  '*': { 
    symbol: '*', 
    type: 'operator', 
    count: 15, 
    image: '/cards/multiply.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_008', name: 'Zdvojnásobení', description: 'Zdvojnásobení počtu dobíraných karet v příštím tahu.', target: 'SELF' }
    }
  },
  '/': { 
    symbol: '/', 
    type: 'operator', 
    count: 15, 
    image: '/cards/divide.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_009', name: 'Náhled balíčku', description: 'Náhled na 3 vrchní karty balíčku a jejich libovolné přerovnání.', target: 'SELF' }
    }
  },

  // --- POKROČILÉ OPERÁTORY ---
  'a^b': {
    symbol: 'a^b',
    type: 'operator',
    count: 4,
    image: '/cards/power.svg',
    canHaveExponent: true,
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_010', name: 'Přeskočení tahu', description: 'Následující hráč přeskakuje svůj tah.', target: 'OPPONENT' }
    }
  },
  'sqrt': {
    symbol: 'sqrt',
    type: 'operator',
    count: 4,
    image: '/cards/sqrt.svg',
    canHaveExponent: true,
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_011', name: 'Obnovení ruky', description: 'Odhození celého obsahu ruky a dobrání nových karet.', target: 'OPPONENT' }
    }
  },
  'mod': { 
    symbol: 'mod', 
    type: 'operator', 
    count: 4, 
    image: '/cards/mod.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_012', name: 'Modulo R', description: 'Hodnota R zvoleného hráče se mění na R mod (libovolné číslo z ruky).', target: 'OPPONENT' }
    }
  },
  'n!': {
    symbol: 'n!',
    type: 'operator',
    count: 2,
    image: '/cards/factorial.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_013', name: 'Omezení hraní', description: 'Následující hráč nesmí v příštím tahu vyložit více než 1 kartu.', target: 'OPPONENT' }
    }
  },
  'd/dx': {
    symbol: 'd/dx',
    type: 'operator',
    count: 3,
    image: '/cards/derivative.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_014', name: 'Derivace', description: 'Odstranění všech konstant a proměnných z L zvoleného hráče.', target: 'OPPONENT' }
    }
  },
  'int': {  
    symbol: 'int', 
    type: 'operator', 
    count: 3, 
    image: '/cards/integral.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_015', name: 'Integrál', description: 'Okamžité nahrazení celého cíle R libovolného hráče novým losem.', target: 'OPPONENT' }
    }
  },
  '∑': {  
    symbol: '∑', 
    type: 'operator', 
    count: 4, 
    image: '/cards/sum.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_016', name: 'Zákaz operací', description: 'Žádný z hráčů nesmí celé další kolo použít kartu operace.', target: 'ALL' }
    }
  },
  'log': {
    symbol: 'log',
    type: 'operator',
    count: 2,
    image: '/cards/log.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_017', name: 'Neomezené hraní', description: 'Můžeš tento tah hrát libovolný počet karet.', target: 'SELF' }
    }
  },
  'sin': { 
    symbol: 'sin', 
    type: 'operator', 
    count: 3,
    image: '/cards/sin.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_018', name: 'Předání po', description: 'Všichni hráči si předají karty v ruce po směru.', target: 'ALL' }
    }
  },
  'cos': { 
    symbol: 'cos', 
    type: 'operator', 
    count: 3,
    image: '/cards/cos.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_019', name: 'Předání proti', description: 'Všichni hráči si předají karty v ruce proti směru.', target: 'ALL' }
    }
  },
  'tg': { 
    symbol: 'tg', 
    type: 'operator', 
    count: 2,
    image: '/cards/tg.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_020', name: 'Předání po (tg)', description: 'Všichni hráči si předají karty v ruce po směru.', target: 'ALL' }
    }
  },
  'cotg': { 
    symbol: 'cotg', 
    type: 'operator', 
    count: 2, 
    image: '/cards/cotg.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_021', name: 'Předání proti (cotg)', description: 'Všichni hráči si předají karty v ruce proti směru.', target: 'ALL' }
    }
  },
  'nCk': {
    symbol: 'nCk',
    type: 'operator',
    count: 4,
    image: '/cards/combination.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_022', name: 'Prohození cifer', description: 'Prohození cifer v R cílového oponenta.', target: 'OPPONENT' }
    }
  },
  '∏': { 
    symbol: '∏', 
    type: 'operator', 
    count: 2,
    image: '/cards/product.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_023', name: 'Zákaz čísel', description: 'Žádný z hráčů nesmí celé další kolo použít kartu čísla.', target: 'ALL' }
    }
  },
  'lim': { 
    symbol: 'lim', 
    type: 'operator', 
    count: 2,
    image: '/cards/limit.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_024', name: 'Zrušení efektů', description: 'Zrušení všech aktivních efektů vyložených karet u všech hráčů.', target: 'ALL' }
    }
  },
  'det': { 
    symbol: 'det', 
    type: 'operator', 
    count: 2, 
    image: '/cards/determinant.svg',
    hasEffect: true,
    effects: {
      optionA: { id: 'EFF_025', name: 'Otočení pořadí', description: 'Změní pořadí tahů hráčů na opačné.', target: 'ALL' }
    }
  },

  // --- SYNTAXE (Závorky nenecháváme v balíčku, hráči je mají od začátku) ---
  '(': { symbol: '(', type: 'syntax', count: 0, image: '/cards/bracket-left.svg' },
  ')': { symbol: ')', type: 'syntax', count: 0, image: '/cards/bracket-right.svg' },
  '=': { symbol: '=', type: 'syntax', count: 0, image: '/cards/equals.svg' }
};