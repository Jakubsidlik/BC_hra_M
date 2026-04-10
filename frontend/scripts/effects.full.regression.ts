import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import { applyEffectLogic, type GameCard, type Player } from '../src/lib/effects';
import { resolveTurnStartDraw } from '../src/lib/turnStartDraw';

type CardsYaml = Record<string, {
  effects?: {
    optionA?: { id?: string; description?: string };
    optionB?: { id?: string; description?: string };
  };
}>;

type EffectResult = {
  players: Player[];
  metadata?: {
    turnOrderReversed?: boolean;
    deckPreviewTriggered?: boolean;
    moduloOperationTriggered?: boolean;
    handSwapDirection?: 1 | -1;
  };
};

type EffectDefinition = {
  id: string;
  descriptions: string[];
};

const EXPECTED_EFFECT_IDS = [
  'EFF_001',
  'EFF_002',
  'EFF_003',
  'EFF_004',
  'EFF_005',
  'EFF_006',
  'EFF_007',
  'EFF_008',
  'EFF_009',
  'EFF_010',
  'EFF_011',
  'EFF_012',
  'EFF_013',
  'EFF_014',
  'EFF_015',
  'EFF_016',
  'EFF_019',
  'EFF_020',
  'EFF_021',
  'EFF_022',
  'EFF_023',
  'EFF_029',
] as const;

type ExpectedEffectId = (typeof EXPECTED_EFFECT_IDS)[number];

const DESCRIPTION_KEYWORDS: Record<ExpectedEffectId, string[]> = {
  EFF_001: ['dobran', '1', 'kart'],
  EFF_002: ['vymen', 'kart', 'oponent'],
  EFF_003: ['nahr', 'cil', 'r'],
  EFF_004: ['odhod', 'cislic'],
  EFF_005: ['odhod', 'operac'],
  EFF_006: ['musi', 'operac'],
  EFF_007: ['odstran', 'kart', 'ruk'],
  EFF_008: ['zdvoj', 'dobir'],
  EFF_009: ['nahled', '3', 'prerovn'],
  EFF_010: ['preskakuje', 'tah'],
  EFF_011: ['odhoz', 'obsah', 'ruk'],
  EFF_012: ['mod', 'r'],
  EFF_013: ['dobir', '1', 'mene'],
  EFF_014: ['libovolny', 'pocet', 'karet'],
  EFF_015: ['predaji', 'po', 'smeru'],
  EFF_016: ['predaji', 'proti', 'smeru'],
  EFF_019: ['prohoz', 'cifer'],
  EFF_020: ['zrus', 'vsech', 'efekt'],
  EFF_021: ['v', 'pristim', 'tahu', '1', 'mene'],
  EFF_022: ['pristim', 'tahu', 'jako', '0'],
  EFF_023: ['dober', '3', '1', '2'],
  EFF_029: ['ihned', '3', 'karty'],
};

const fail = (message: string): never => {
  throw new Error(message);
};

const expectEqual = <T>(actual: T, expected: T, context: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${context}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
};

const expectTrue = (value: boolean, context: string) => {
  if (!value) {
    fail(context);
  }
};

const makeCard = (id: string, symbol: string, extra: Partial<GameCard> = {}): GameCard => ({
  id,
  symbol,
  ...extra,
});

const makeStatus = (): Player['status'] => ({
  mathModifiers: [],
  extraTurn: false,
  extraDraw: 0,
  drawReduction: 0,
  factorialDrawPenalty: 0,
  noDrawNextTurn: false,
  frozen: false,
  immune: false,
  playLimit: null,
  infinitePlays: false,
  mustPlayOperation: false,
  operationLock: false,
  numberLock: false,
  exposedHand: false,
  absoluteValue: false,
  playAnyAsZeroNextTurn: false,
  playAnyAsZeroReady: false,
  notifications: [],
});

const makePlayer = (
  id: number,
  name: string,
  hand: GameCard[] = [],
  board: GameCard[] = [],
  targetR: number | string = '10',
): Player => ({
  id,
  name,
  hand,
  board,
  syntax: [],
  theme: 'test',
  targetR,
  status: makeStatus(),
});

const getPlayersFixture = (): Player[] => [
  makePlayer(0, 'A', [makeCard('a0', '1'), makeCard('a1', '+')], [makeCard('ab0', '7')], '10'),
  makePlayer(1, 'B', [makeCard('b0', '2'), makeCard('b1', '*')], [makeCard('bb0', 'x')], '20'),
  makePlayer(2, 'C', [makeCard('c0', '3'), makeCard('c1', '-')], [makeCard('cb0', 'e')], '30'),
];

const normalizeText = (value: string): string => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
);

const readEffectsFromYaml = (): EffectDefinition[] => {
  const yamlPath = path.resolve(process.cwd(), 'src/data/cards.yaml');
  const raw = fs.readFileSync(yamlPath, 'utf8');
  const parsed = yaml.load(raw) as CardsYaml;

  const map = new Map<string, Set<string>>();

  Object.values(parsed).forEach((card) => {
    const entries = [card.effects?.optionA, card.effects?.optionB].filter(Boolean) as Array<{ id?: string; description?: string }>;
    entries.forEach((entry) => {
      if (!entry.id) return;
      if (!map.has(entry.id)) map.set(entry.id, new Set<string>());
      if (entry.description) {
        map.get(entry.id)!.add(entry.description);
      }
    });
  });

  return [...map.entries()]
    .map(([id, descriptions]) => ({
      id,
      descriptions: [...descriptions],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

const toEffectResult = (result: ReturnType<typeof applyEffectLogic>): EffectResult => {
  if (Array.isArray(result)) {
    return { players: result };
  }
  return {
    players: result.players,
    metadata: result.metadata,
  };
};

const withMockedRandom = <T>(value: number, fn: () => T): T => {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
};

const runBehaviorChecks = (): void => {
  // EFF_001
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_001', players, 0));
    expectEqual(result.players[0].status.extraDraw, 1, 'EFF_001 should add +1 extra draw to active player.');
  }

  // EFF_002
  {
    const players = getPlayersFixture();
    players[0].board = [makeCard('a-card', '1')];
    players[1].board = [makeCard('b-card', 'x')];

    const result = toEffectResult(applyEffectLogic('EFF_002', players, 0, 1, 'b-card', undefined, 'ZŠ', 'a-card'));

    expectEqual(result.players[0].board[0].symbol, 'x', 'EFF_002 should move opponent selected card to active board.');
    expectEqual(result.players[1].board[0].symbol, '1', 'EFF_002 should move active selected card to opponent board.');
  }

  // EFF_003
  {
    const players = getPlayersFixture();
    players[1].targetR = '__old__';
    const result = toEffectResult(applyEffectLogic('EFF_003', players, 0, 1));

    expectTrue(result.players[1].targetR !== '__old__', 'EFF_003 should replace target R with newly generated value.');
    expectTrue(
      result.players[1].status.notifications.some((n) => n.includes('změnil cíl R')),
      'EFF_003 should notify target player about changed R.',
    );
  }

  // EFF_004
  {
    const players = getPlayersFixture();
    players[1].hand = [makeCard('n1', '3'), makeCard('op1', '+'), makeCard('n2', '5')];

    const result = toEffectResult(applyEffectLogic('EFF_004', players, 0, 1));
    expectEqual(result.players[1].hand.map((c) => c.symbol), ['+'], 'EFF_004 should remove all numbers from target hand.');
  }

  // EFF_005
  {
    const players = getPlayersFixture();
    players[1].hand = [makeCard('n1', '3'), makeCard('op1', '+'), makeCard('op2', '*')];

    const result = toEffectResult(applyEffectLogic('EFF_005', players, 0, 1));
    expectEqual(result.players[1].hand.map((c) => c.symbol), ['3'], 'EFF_005 should remove all operators from target hand.');
  }

  // EFF_006
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_006', players, 0, 1));
    expectEqual(result.players[1].status.mustPlayOperation, true, 'EFF_006 should set mustPlayOperation on target player.');
  }

  // EFF_007
  {
    const players = getPlayersFixture();
    players[1].hand = [makeCard('h1', '1'), makeCard('h2', '2'), makeCard('h3', '3')];

    const result = withMockedRandom(0, () => toEffectResult(applyEffectLogic('EFF_007', players, 0, 1)));
    expectEqual(result.players[1].hand.map((c) => c.symbol), ['2', '3'], 'EFF_007 should remove one random card from target hand.');
  }

  // EFF_008
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_008', players, 0));
    expectEqual(result.players[0].status.extraDraw, 2, 'EFF_008 should add +2 extra draw to active player.');
  }

  // EFF_009
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_009', players, 0));
    expectEqual(result.metadata?.deckPreviewTriggered, true, 'EFF_009 should trigger deck preview metadata.');
  }

  // EFF_010
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_010', players, 0, 1));
    expectEqual(result.players[1].status.frozen, true, 'EFF_010 should freeze target player.');
  }

  // EFF_011
  {
    const players = getPlayersFixture();
    players[1].hand = [makeCard('h1', '1'), makeCard('h2', '2'), makeCard('h3', '3')];

    const result = toEffectResult(applyEffectLogic('EFF_011', players, 0, 1));
    expectEqual(result.players[1].hand.length, 0, 'EFF_011 should clear target hand.');
    expectEqual(result.players[1].status.extraDraw, 3, 'EFF_011 should grant draw amount equal to discarded hand size.');
  }

  // EFF_012
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_012', players, 0, 1));
    expectEqual(result.metadata?.moduloOperationTriggered, true, 'EFF_012 should trigger modulo dialog metadata.');
  }

  // EFF_013
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_013', players, 0, 1));

    expectEqual(result.players[1].status.factorialDrawPenalty, 1, 'EFF_013 should set factorial draw penalty to 1.');

    const turnOutcome = resolveTurnStartDraw(result.players[1].status);
    expectEqual(turnOutcome.totalToDraw, 0, 'EFF_013 should reduce first next draw to zero with default base draw 1.');
  }

  // EFF_014
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_014', players, 0));
    expectEqual(result.players[0].status.infinitePlays, true, 'EFF_014 should allow unlimited plays for active player.');
  }

  // EFF_015
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_015', players, 0));
    expectEqual(result.metadata?.handSwapDirection, 1, 'EFF_015 should request clockwise hand swap.');
  }

  // EFF_016
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_016', players, 0));
    expectEqual(result.metadata?.handSwapDirection, -1, 'EFF_016 should request counter-clockwise hand swap.');
  }

  // EFF_019
  {
    const players = getPlayersFixture();
    players[1].targetR = 123;
    const result = toEffectResult(applyEffectLogic('EFF_019', players, 0, 1));
    expectEqual(result.players[1].targetR, 321, 'EFF_019 should reverse target numeric R digits.');
  }

  // EFF_020
  {
    const players = getPlayersFixture();
    players.forEach((p) => {
      p.status.frozen = true;
      p.status.operationLock = true;
      p.status.numberLock = true;
      p.status.mustPlayOperation = true;
      p.status.playLimit = 1;
      p.status.infinitePlays = true;
      p.status.extraDraw = 3;
      p.status.drawReduction = 2;
      p.status.immune = true;
      p.status.extraTurn = true;
      p.status.playAnyAsZeroNextTurn = true;
      p.status.playAnyAsZeroReady = true;
    });

    const result = toEffectResult(applyEffectLogic('EFF_020', players, 0));

    result.players.forEach((p, index) => {
      expectEqual(p.status.frozen, false, `EFF_020 should clear frozen flag for player ${index}.`);
      expectEqual(p.status.operationLock, false, `EFF_020 should clear operationLock for player ${index}.`);
      expectEqual(p.status.numberLock, false, `EFF_020 should clear numberLock for player ${index}.`);
      expectEqual(p.status.mustPlayOperation, false, `EFF_020 should clear mustPlayOperation for player ${index}.`);
    });
  }

  // EFF_021
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_021', players, 0));

    expectEqual(result.players[0].status.drawReduction, 0, 'EFF_021 should not reduce active player draw.');
    expectEqual(result.players[1].status.drawReduction, 1, 'EFF_021 should reduce opponent #1 draw by 1.');
    expectEqual(result.players[2].status.drawReduction, 1, 'EFF_021 should reduce opponent #2 draw by 1.');
  }

  // EFF_022
  {
    const players = getPlayersFixture();
    const result = toEffectResult(applyEffectLogic('EFF_022', players, 0));
    expectEqual(result.players[0].status.playAnyAsZeroNextTurn, true, 'EFF_022 should enable play-any-card-as-zero for next turn.');
  }

  // EFF_023
  {
    const players = getPlayersFixture();
    const before = JSON.stringify(players);
    const result = toEffectResult(applyEffectLogic('EFF_023', players, 0));
    const after = JSON.stringify(result.players);

    expectEqual(after, before, 'EFF_023 should keep state unchanged in applyEffectLogic (handled by UI flow).');
  }

  // EFF_029
  {
    const engineSourcePath = path.resolve(process.cwd(), 'src/hooks/useGameEngine.ts');
    const source = fs.readFileSync(engineSourcePath, 'utf8');

    expectTrue(
      source.includes("if (activeId === 'EFF_029')") && source.includes('performDraw(3, currentPlayerIndex)'),
      'EFF_029 should be handled in useGameEngine as immediate draw of 3 cards.',
    );
  }
};

const validateDescriptionsAndCoverage = (effectsFromYaml: EffectDefinition[]) => {
  const actualIds = effectsFromYaml.map((e) => e.id).sort();
  const expectedIds = [...EXPECTED_EFFECT_IDS].sort();

  expectEqual(actualIds, expectedIds, 'cards.yaml effect IDs must match complete expected in-game set.');

  effectsFromYaml.forEach((effect) => {
    const id = effect.id as ExpectedEffectId;
    const keywords = DESCRIPTION_KEYWORDS[id];
    if (!keywords) {
      fail(`Missing description keyword rule for ${effect.id}`);
    }

    const normalizedDescriptions = effect.descriptions.map(normalizeText);
    expectTrue(normalizedDescriptions.length > 0, `Effect ${effect.id} should have at least one description in cards.yaml.`);

    normalizedDescriptions.forEach((desc, index) => {
      keywords.forEach((keyword) => {
        expectTrue(
          desc.includes(normalizeText(keyword)),
          `Description ${index + 1} for ${effect.id} should contain keyword "${keyword}".\nDescription: ${effect.descriptions[index]}`,
        );
      });
    });
  });
};

const validateUiMediatedEffectHooks = () => {
  const engineSourcePath = path.resolve(process.cwd(), 'src/hooks/useGameEngine.ts');
  const source = fs.readFileSync(engineSourcePath, 'utf8');

  expectTrue(
    source.includes("if (activeId === 'EFF_023')") && source.includes('setMinigameMode({ effectId: activeId, cards: drawnCards })'),
    'EFF_023 should be routed to minigame flow in useGameEngine.',
  );

  expectTrue(
    source.includes('metadata?.deckPreviewTriggered') && source.includes('setDeckPreviewMode({ originalDeck: deck })'),
    'EFF_009 metadata should trigger deck preview UI flow in useGameEngine.',
  );

  expectTrue(
    source.includes('metadata?.moduloOperationTriggered') && source.includes('setModuloMode({ activePlayerIndex: currentPlayerIndex, targetPlayerId })'),
    'EFF_012 metadata should trigger modulo UI flow in useGameEngine.',
  );

  expectTrue(
    source.includes("if (activeId === 'EFF_029')") && source.includes('performDraw(3, currentPlayerIndex)'),
    'EFF_029 should be handled as immediate draw flow in useGameEngine.',
  );
};

const run = () => {
  const effectsFromYaml = readEffectsFromYaml();
  validateDescriptionsAndCoverage(effectsFromYaml);
  runBehaviorChecks();
  validateUiMediatedEffectHooks();

  console.log(`Full effects regression checks passed for ${effectsFromYaml.length} in-game effect IDs.`);
};

run();
