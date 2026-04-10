import type { GameCard } from '../src/lib/effects';
import { mergeDeckAfterPreview, splitDeckForPreview } from '../src/lib/deckPreview';

const fail = (message: string): never => {
  throw new Error(message);
};

const expectEqual = <T>(actual: T, expected: T, context: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${context}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
};

const makeCard = (id: string, symbol: string): GameCard => ({ id, symbol });

const symbols = (cards: GameCard[]) => cards.map((c) => c.symbol);

const testSplitDeckPreviewSegments = () => {
  const deck = [
    makeCard('1', 'A'),
    makeCard('2', 'B'),
    makeCard('3', 'C'),
    makeCard('4', 'D'),
    makeCard('5', 'E'),
  ];

  const { top, rest } = splitDeckForPreview(deck);
  expectEqual(symbols(top), ['A', 'B', 'C'], 'Deck preview should expose first three cards.');
  expectEqual(symbols(rest), ['D', 'E'], 'Deck preview rest should contain remaining cards.');
};

const testMergeDeckAfterPreview = () => {
  const deck = [
    makeCard('1', 'A'),
    makeCard('2', 'B'),
    makeCard('3', 'C'),
    makeCard('4', 'D'),
    makeCard('5', 'E'),
  ];

  const { top, rest } = splitDeckForPreview(deck);
  const reorderedTop = [top[2], top[0], top[1]];
  const merged = mergeDeckAfterPreview(reorderedTop, rest);

  expectEqual(symbols(merged), ['C', 'A', 'B', 'D', 'E'], 'Merged deck should keep reordered top and untouched rest.');
};

const testReopenDialogUsesCurrentDeckTop = () => {
  const firstDeck = [
    makeCard('1', 'A'),
    makeCard('2', 'B'),
    makeCard('3', 'C'),
    makeCard('4', 'D'),
  ];
  const secondDeck = [
    makeCard('5', 'W'),
    makeCard('6', 'X'),
    makeCard('7', 'Y'),
    makeCard('8', 'Z'),
  ];

  const firstTop = splitDeckForPreview(firstDeck).top;
  expectEqual(symbols(firstTop), ['A', 'B', 'C'], 'First dialog open should show first deck top cards.');

  const secondTop = splitDeckForPreview(secondDeck).top;
  expectEqual(symbols(secondTop), ['W', 'X', 'Y'], 'Reopened dialog should show current deck top cards, not stale previous values.');
};

const run = () => {
  testSplitDeckPreviewSegments();
  testMergeDeckAfterPreview();
  testReopenDialogUsesCurrentDeckTop();
  console.log('Deck preview regression checks passed.');
};

run();
