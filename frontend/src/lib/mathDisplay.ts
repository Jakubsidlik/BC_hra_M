export const formatTargetForDisplay = (value: string | number): string => {
  const raw = String(value ?? '');

  // Keep internal sqrt(...) representation in logic, but render as √... in UI.
  const withRoot = raw.replace(/sqrt\(\s*([^()]+?)\s*\)/g, '√$1');

  // Internal multiplier form (e.g. 5*sqrt(2)) should be displayed as 5√2.
  return withRoot.replace(/(-?\d+)\s*\*\s*√/g, '$1√');
};
