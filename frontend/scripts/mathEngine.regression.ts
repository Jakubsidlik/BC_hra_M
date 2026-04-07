import { evaluateExpression } from '../src/lib/mathEngine';

type Case = {
  expression: string;
  target: string;
  expected: boolean;
};

const cases: Case[] = [
  {
    expression: '[9*6-(3+2)]x',
    target: '49x',
    expected: true,
  },
  {
    expression: '{9*6-(3+2)}x',
    target: '49x',
    expected: true,
  },
  {
    expression: '(9*6-(3+2))x',
    target: '49x',
    expected: true,
  },
];

let hasFailure = false;

for (const testCase of cases) {
  const result = evaluateExpression(testCase.expression, testCase.target, []);
  const ok = Boolean(result.success && result.is_match === testCase.expected);

  if (!ok) {
    hasFailure = true;
    console.error(
      [
        `FAIL: ${testCase.expression} = ${testCase.target}`,
        `  success: ${String(result.success)}`,
        `  is_match: ${String((result as { is_match?: boolean }).is_match)}`,
        `  error: ${String((result as { error?: string }).error ?? '')}`,
      ].join('\n')
    );
  } else {
    console.log(`PASS: ${testCase.expression} = ${testCase.target}`);
  }
}

if (hasFailure) {
  process.exitCode = 1;
} else {
  console.log('All mathEngine regression cases passed.');
}
