import { applyEffectLogic, type GameCard, type Player } from '../src/lib/effects';
import { resolveTurnStartDraw } from '../src/lib/turnStartDraw';

const fail = (message: string): never => {
  throw new Error(message);
};

const expectEqual = <T>(actual: T, expected: T, context: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${context}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
};

const makeCard = (id: string, symbol: string): GameCard => ({ id, symbol });

const makePlayer = (id: number, name: string): Player => ({
  id,
  name,
  hand: [makeCard(`${name}-0`, `${name}1`)],
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

const toPlayers = (result: ReturnType<typeof applyEffectLogic>): Player[] => {
  if (Array.isArray(result)) {
    return result;
  }
  return result.players;
};

const testEff021TurnStartFlow = () => {
  const players = [makePlayer(0, 'A'), makePlayer(1, 'B'), makePlayer(2, 'C')];
  const effectedPlayers = toPlayers(applyEffectLogic('EFF_021', players, 0));

  const activeOutcome = resolveTurnStartDraw(effectedPlayers[0].status);
  const opp1Outcome = resolveTurnStartDraw(effectedPlayers[1].status);
  const opp2Outcome = resolveTurnStartDraw(effectedPlayers[2].status);

  expectEqual(activeOutcome.totalToDraw, 1, 'Active player should keep normal draw after EFF_021.');
  expectEqual(opp1Outcome.totalToDraw, 0, 'Opponent #1 should draw 0 cards after EFF_021.');
  expectEqual(opp2Outcome.totalToDraw, 0, 'Opponent #2 should draw 0 cards after EFF_021.');

  expectEqual(opp1Outcome.nextStatus.drawReduction, 0, 'Opponent #1 drawReduction should reset at turn start.');
  expectEqual(opp2Outcome.nextStatus.drawReduction, 0, 'Opponent #2 drawReduction should reset at turn start.');
};

const testTurnStartMath = () => {
  const boosted = resolveTurnStartDraw({
    extraDraw: 2,
    drawReduction: 1,
    notifications: ['x'],
    playLimit: 1,
    infinitePlays: true,
    operationLock: true,
    numberLock: true,
  });

  expectEqual(boosted.baseDrawCount, 2, 'Base draw should be 1 + extraDraw - drawReduction.');
  expectEqual(boosted.totalToDraw, 2, 'Total draw should match base draw when no factorial penalty exists.');
  expectEqual(boosted.nextStatus.extraDraw, 0, 'extraDraw should reset at turn start.');
  expectEqual(boosted.nextStatus.drawReduction, 0, 'drawReduction should reset at turn start.');
  expectEqual(boosted.nextStatus.playLimit, null, 'playLimit should reset at turn start.');
  expectEqual(boosted.nextStatus.infinitePlays, false, 'infinitePlays should reset at turn start.');
  expectEqual(boosted.nextStatus.notifications, [], 'notifications should be cleared at turn start.');
};

const testFactorialPenaltyProgression = () => {
  const blocked = resolveTurnStartDraw({ factorialDrawPenalty: 1 });
  expectEqual(blocked.totalToDraw, 0, 'factorialDrawPenalty=1 should block the default single draw.');
  expectEqual(blocked.nextStatus.factorialDrawPenalty, 0, 'factorial penalty should clear after reducing draw to zero.');

  const progressing = resolveTurnStartDraw({ extraDraw: 2, factorialDrawPenalty: 1 });
  expectEqual(progressing.totalToDraw, 2, 'factorial penalty should reduce draw from 3 to 2.');
  expectEqual(progressing.nextStatus.factorialDrawPenalty, 2, 'factorial penalty should increase by 1 while draw remains above zero.');
};

const run = () => {
  testEff021TurnStartFlow();
  testTurnStartMath();
  testFactorialPenaltyProgression();
  console.log('Turn-start draw regression checks passed.');
};

run();
