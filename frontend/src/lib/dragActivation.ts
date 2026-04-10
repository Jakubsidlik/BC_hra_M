import type { DeviceType } from '@/hooks/useDeviceType';

export type TouchActivationConstraint =
  | { distance: number }
  | { delay: number; tolerance: number };

export const MOBILE_TOUCH_DRAG_DISTANCE = 14;
export const DEFAULT_TOUCH_DELAY = 0;
export const DEFAULT_TOUCH_TOLERANCE = 2;

export const getTouchActivationConstraint = (deviceType: DeviceType): TouchActivationConstraint => {
  if (deviceType === 'phone') {
    return { distance: MOBILE_TOUCH_DRAG_DISTANCE };
  }

  return { delay: DEFAULT_TOUCH_DELAY, tolerance: DEFAULT_TOUCH_TOLERANCE };
};

export const meetsDistanceConstraint = (movementPx: number, distancePx: number): boolean => (
  movementPx >= distancePx
);
