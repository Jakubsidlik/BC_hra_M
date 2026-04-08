import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import { applyEffectLogic, type GameCard, type Player } from '../src/lib/effects';

type CardsYaml = Record<string, { effects?: { optionA?: { id?: string } } }>;

const TRIG_CARD_RE = /^(sin|cos|tg|cotg)\(/;

const EXPECTED_GROUPS: Record<string, string[]> = {
  EFF_015: ['sin(2π)', 'sin(π/2)', 'sin(π)', 'sin(3π/2)'],
  EFF_016: ['cos(2π)', 'cos(π/2)', 'cos(π)', 'cos(3π/2)'],
  EFF_029: ['tg(π)', 'tg(π/4)', 'cotg(π/4)', 'cotg(π/2)'],
  EFF_021: [
    'sin(π/6)', 'sin(π/4)', 'sin(π/3)',
    'cos(π/6)', 'cos(π/4)', 'cos(π/3)',
    'tg(π/6)', 'tg(π/3)',
    'cotg(π/6)', 'cotg(π/3)',
  ],
};

const sortValues = (values: string[]) => [...values].sort((a, b) => a.localeCompare(b));

const fail = (message: string): never => {
  throw new Error(message);
};

const expectEqual = <T>(actual: T, expected: T, context: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${context}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
};

const makeCard = (id: string, symbol: string): GameCard => ({ id, symbol });

const makePlayer = (id: number, name: string, handSymbols: string[]): Player => ({
  id,
  name,
  hand: handSymbols.map((symbol, idx) => makeCard(`${name}-${idx}`, symbol)),
  board: [],
  syntax: [],
  theme: 'test',
  targetR: 0,
  status: {
    mathModifiers: [],
    extraTurn: false,
    frozen: false,
    extraDraw: 0,
    drawReduction: 0,
    notifications: [],
  },
});

const makePlayers = (): Player[] => [
  makePlayer(0, 'A', ['A1', 'A2']),
  makePlayer(1, 'B', ['B1', 'B2']),
  makePlayer(2, 'C', ['C1', 'C2']),
];

const readTrigGroupsFromYaml = (): Record<string, string[]> => {
  const yamlPath = path.resolve(process.cwd(), 'src/data/cards.yaml');
  const raw = fs.readFileSync(yamlPath, 'utf8');
  const cards = yaml.load(raw) as CardsYaml;

  const grouped: Record<string, string[]> = {};
  Object.entries(cards)
    .filter(([cardName]) => TRIG_CARD_RE.test(cardName))
    .forEach(([cardName, cardData]) => {
      const effectIdCandidate = cardData.effects?.optionA?.id;
      if (typeof effectIdCandidate !== 'string' || effectIdCandidate.length === 0) {
        fail(`Card ${cardName} is missing optionA effect id.`);
        return;
      }
      const effectId = effectIdCandidate;
      grouped[effectId] = grouped[effectId] || [];
      grouped[effectId].push(cardName);
    });

  Object.keys(grouped).forEach(effectId => {
    grouped[effectId] = sortValues(grouped[effectId]);
  });

  return grouped;
};

const getEffectResult = (effectId: string, players: Player[]) => {
  const result = applyEffectLogic(effectId, players, 0);
  if (Array.isArray(result)) {
    return { players: result, metadata: undefined };
  }
  return { players: result.players, metadata: result.metadata };
};

const applySwapDirection = (players: Player[], direction: 1 | -1): string[][] => {
  const snapshot = players.map(player => player.hand.map(card => card.symbol));
  const count = players.length;
  return players.map((_, index) => {
    const sourceIndex = (index - direction + count) % count;
    return snapshot[sourceIndex];
  });
};

const testHandSwapEffects = () => {
  const clockwiseEffects = ['EFF_015', 'EFF_017'];
  const counterClockwiseEffects = ['EFF_016', 'EFF_018'];

  clockwiseEffects.forEach(effectId => {
    const players = makePlayers();
    const { metadata } = getEffectResult(effectId, players);
    expectEqual(metadata?.handSwapDirection, 1, `${effectId} should set clockwise hand swap.`);

    const rotated = applySwapDirection(players, 1);
    expectEqual(rotated, [['C1', 'C2'], ['A1', 'A2'], ['B1', 'B2']], `${effectId} clockwise rotation mismatch.`);
  });

  counterClockwiseEffects.forEach(effectId => {
    const players = makePlayers();
    const { metadata } = getEffectResult(effectId, players);
    expectEqual(metadata?.handSwapDirection, -1, `${effectId} should set counter-clockwise hand swap.`);

    const rotated = applySwapDirection(players, -1);
    expectEqual(rotated, [['B1', 'B2'], ['C1', 'C2'], ['A1', 'A2']], `${effectId} counter-clockwise rotation mismatch.`);
  });
};

const testDrawReductionEffect = () => {
  const players = makePlayers();
  const { players: updatedPlayers } = getEffectResult('EFF_021', players);

  const reductions = updatedPlayers.map(player => player.status.drawReduction || 0);
  expectEqual(reductions, [0, 1, 1], 'EFF_021 should reduce draw only for opponents.');

  const notifications = updatedPlayers.map(player => player.status.notifications.length);
  expectEqual(notifications, [0, 1, 1], 'EFF_021 should notify only opponents.');
};

const testTrigCardsMapping = () => {
  const grouped = readTrigGroupsFromYaml();

  const expectedIds = sortValues(Object.keys(EXPECTED_GROUPS));
  const actualIds = sortValues(Object.keys(grouped));
  expectEqual(actualIds, expectedIds, 'Trig cards should use only expected effect ids.');

  expectedIds.forEach(effectId => {
    expectEqual(grouped[effectId], sortValues(EXPECTED_GROUPS[effectId]), `Mismatch for ${effectId} trig card mapping.`);
  });
};

const run = () => {
  testTrigCardsMapping();
  testHandSwapEffects();
  testDrawReductionEffect();
  console.log('Trig effect regression checks passed.');
};

run();
