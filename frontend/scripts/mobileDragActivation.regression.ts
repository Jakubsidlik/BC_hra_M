import {
  DEFAULT_TOUCH_DELAY,
  DEFAULT_TOUCH_TOLERANCE,
  MOBILE_TOUCH_DRAG_DISTANCE,
  getTouchActivationConstraint,
  meetsDistanceConstraint,
} from '../src/lib/dragActivation';

const fail = (message: string): never => {
  throw new Error(message);
};

const expectEqual = <T>(actual: T, expected: T, context: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${context}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
};

const expectTrue = (value: boolean, context: string) => {
  if (!value) fail(context);
};

const expectFalse = (value: boolean, context: string) => {
  if (value) fail(context);
};

const testPhoneUsesDistanceConstraint = () => {
  const constraint = getTouchActivationConstraint('phone');
  expectEqual(constraint, { distance: MOBILE_TOUCH_DRAG_DISTANCE }, 'Phone should use distance-based touch drag activation.');
};

const testTabletAndDesktopKeepLegacyConstraint = () => {
  const expected = { delay: DEFAULT_TOUCH_DELAY, tolerance: DEFAULT_TOUCH_TOLERANCE };
  expectEqual(getTouchActivationConstraint('tablet'), expected, 'Tablet should keep delay+tolerance touch activation.');
  expectEqual(getTouchActivationConstraint('desktop'), expected, 'Desktop should keep delay+tolerance touch activation.');
};

const testPhoneDoesNotActivateOnTapOrSmallMove = () => {
  expectFalse(meetsDistanceConstraint(0, MOBILE_TOUCH_DRAG_DISTANCE), 'Tap without movement must not activate mobile drag.');
  expectFalse(meetsDistanceConstraint(5, MOBILE_TOUCH_DRAG_DISTANCE), 'Small move must not activate mobile drag.');
  expectFalse(meetsDistanceConstraint(13, MOBILE_TOUCH_DRAG_DISTANCE), 'Hover-like movement must not activate mobile drag below threshold.');
};

const testPhoneActivatesOnRealDrag = () => {
  expectTrue(meetsDistanceConstraint(14, MOBILE_TOUCH_DRAG_DISTANCE), 'Movement at threshold should activate mobile drag.');
  expectTrue(meetsDistanceConstraint(18, MOBILE_TOUCH_DRAG_DISTANCE), 'Movement above threshold should activate mobile drag.');
};

const run = () => {
  testPhoneUsesDistanceConstraint();
  testTabletAndDesktopKeepLegacyConstraint();
  testPhoneDoesNotActivateOnTapOrSmallMove();
  testPhoneActivatesOnRealDrag();
  console.log('Mobile drag activation regression checks passed.');
};

run();
