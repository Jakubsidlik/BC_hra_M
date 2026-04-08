export type TurnStartStatus = {
  extraDraw?: number;
  drawReduction?: number;
  factorialDrawPenalty?: number;
  playAnyAsZeroNextTurn?: boolean;
  playAnyAsZeroReady?: boolean;
  notifications?: string[];
  operationLock?: boolean;
  numberLock?: boolean;
  playLimit?: number | null;
  infinitePlays?: boolean;
};

export type TurnStartDrawOutcome = {
  totalToDraw: number;
  baseDrawCount: number;
  factorialPenalty: number;
  nextStatus: TurnStartStatus;
};

export const resolveTurnStartDraw = (status: TurnStartStatus | undefined): TurnStartDrawOutcome => {
  const currentStatus: TurnStartStatus = { ...(status || {}) };
  const factorialPenalty = currentStatus.factorialDrawPenalty || 0;
  const baseDrawCount = Math.max(0, 1 + (currentStatus.extraDraw || 0) - (currentStatus.drawReduction || 0));
  const totalToDraw = Math.max(0, baseDrawCount - factorialPenalty);

  if (currentStatus.playAnyAsZeroNextTurn) {
    currentStatus.playAnyAsZeroReady = true;
    currentStatus.playAnyAsZeroNextTurn = false;
  }

  if (factorialPenalty > 0) {
    if (totalToDraw <= 0) {
      currentStatus.factorialDrawPenalty = 0;
    } else {
      currentStatus.factorialDrawPenalty = factorialPenalty + 1;
    }
  }

  currentStatus.extraDraw = 0;
  currentStatus.drawReduction = 0;
  currentStatus.notifications = [];
  currentStatus.operationLock = false;
  currentStatus.numberLock = false;
  currentStatus.playLimit = null;
  currentStatus.infinitePlays = false;

  return {
    totalToDraw,
    baseDrawCount,
    factorialPenalty,
    nextStatus: currentStatus,
  };
};
