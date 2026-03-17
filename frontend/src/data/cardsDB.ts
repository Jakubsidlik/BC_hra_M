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
  slots?: string[]; // <-- 0-2 navazující sloty pro kontext
  effects?: {
    optionA?: EffectDetails;
    optionB?: EffectDetails;
  };
}

// Odkaz na databázi načtenou přímo z YAML souboru v době kompilace/běhu přes Vite
import rawCardsDatabase from './cards.yaml';
export const cardsDatabase: Record<string, CardData> = rawCardsDatabase as Record<string, CardData>;