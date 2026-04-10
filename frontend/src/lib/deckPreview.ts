import type { GameCard } from './effects';

export const DECK_PREVIEW_VISIBLE_COUNT = 3;

export const splitDeckForPreview = (deck: GameCard[]) => ({
  top: deck.slice(0, DECK_PREVIEW_VISIBLE_COUNT),
  rest: deck.slice(DECK_PREVIEW_VISIBLE_COUNT),
});

export const mergeDeckAfterPreview = (reorderedTop: GameCard[], rest: GameCard[]) => [
  ...reorderedTop,
  ...rest,
];
