import { evaluateExpression } from '../src/lib/mathEngine';

type Wrapper = {
  name: string;
  wrap: (value: string) => string;
};

type Case = {
  expression: string;
  target: string;
  expected: boolean;
  source: string;
};

// Fraction notation built from available card symbols:
// digits 0-9, operator '/', and syntax bracket pairs (), [], {}.
const wrappers: Wrapper[] = [
  { name: 'none', wrap: (value) => value },
  { name: 'round', wrap: (value) => `(${value})` },
  { name: 'square', wrap: (value) => `[${value}]` },
  { name: 'curly', wrap: (value) => `{${value}}` },
];

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
};

const reduceFraction = (numerator: number, denominator: number): [number, number] => {
  const d = gcd(numerator, denominator);
  return [numerator / d, denominator / d];
};

const makeFraction = (numerator: string, denominator: string): string => `${numerator}/${denominator}`;

const pushWholeFractionNotationCases = (
  cases: Case[],
  canonical: string,
  sourcePrefix: string
) => {
  for (const outerWrapper of wrappers) {
    const variant = outerWrapper.wrap(canonical);
    cases.push({
      expression: variant,
      target: canonical,
      expected: true,
      source: `${sourcePrefix}:expr-whole-${outerWrapper.name}`,
    });
    cases.push({
      expression: canonical,
      target: variant,
      expected: true,
      source: `${sourcePrefix}:target-whole-${outerWrapper.name}`,
    });
  }
};

const buildSingleDigitNotationCases = (): Case[] => {
  const cases: Case[] = [];

  for (let numerator = 0; numerator <= 9; numerator += 1) {
    for (let denominator = 1; denominator <= 9; denominator += 1) {
      const canonical = `${numerator}/${denominator}`;

      for (const numeratorWrapper of wrappers) {
        for (const denominatorWrapper of wrappers) {
          const inner = makeFraction(
            numeratorWrapper.wrap(String(numerator)),
            denominatorWrapper.wrap(String(denominator))
          );

          for (const outerWrapper of wrappers) {
            const variant = outerWrapper.wrap(inner);

            // Variant notation in expression side.
            cases.push({
              expression: variant,
              target: canonical,
              expected: true,
              source: `expr-notation:${numeratorWrapper.name}/${denominatorWrapper.name}/${outerWrapper.name}`,
            });

            // Variant notation in target side.
            cases.push({
              expression: canonical,
              target: variant,
              expected: true,
              source: `target-notation:${numeratorWrapper.name}/${denominatorWrapper.name}/${outerWrapper.name}`,
            });
          }
        }
      }

      // Fraction equivalence to reduced form for every digit pair.
      const [reducedN, reducedD] = reduceFraction(numerator, denominator);
      cases.push({
        expression: `${numerator}/${denominator}`,
        target: `${reducedN}/${reducedD}`,
        expected: true,
        source: 'single-digit:reduction-equivalence',
      });

      // Signed forms built from available '-' and bracket cards.
      if (numerator !== 0) {
        cases.push({
          expression: `-${numerator}/${denominator}`,
          target: `-${numerator}/${denominator}`,
          expected: true,
          source: 'single-digit:signed-leading-minus',
        });
        cases.push({
          expression: `${numerator}/(-${denominator})`,
          target: `-${numerator}/${denominator}`,
          expected: true,
          source: 'single-digit:signed-negative-denominator',
        });
        cases.push({
          expression: `(-${numerator})/(-${denominator})`,
          target: `${numerator}/${denominator}`,
          expected: true,
          source: 'single-digit:signed-double-negative',
        });
      }
    }
  }

  return cases;
};

const buildMultiDigitCases = (): Case[] => {
  const cases: Case[] = [];

  for (let numerator = 10; numerator <= 99; numerator += 1) {
    for (let denominator = 10; denominator <= 99; denominator += 1) {
      const canonical = `${numerator}/${denominator}`;

      // Every 2-digit by 2-digit fraction reducibility check.
      const [reducedN, reducedD] = reduceFraction(numerator, denominator);
      cases.push({
        expression: canonical,
        target: `${reducedN}/${reducedD}`,
        expected: true,
        source: 'multi-digit:reduction-equivalence',
      });

      // Bracket notation around whole fraction for all 2-digit pairs.
      pushWholeFractionNotationCases(cases, canonical, 'multi-digit:whole-notation');

      // Common signed forms for all 2-digit pairs.
      cases.push({
        expression: `-${numerator}/${denominator}`,
        target: `-${numerator}/${denominator}`,
        expected: true,
        source: 'multi-digit:signed-leading-minus',
      });
      cases.push({
        expression: `${numerator}/(-${denominator})`,
        target: `-${numerator}/${denominator}`,
        expected: true,
        source: 'multi-digit:signed-negative-denominator',
      });
      cases.push({
        expression: `(-${numerator})/(-${denominator})`,
        target: `${numerator}/${denominator}`,
        expected: true,
        source: 'multi-digit:signed-double-negative',
      });
    }
  }

  return cases;
};

const buildSqrtFractionCases = (): Case[] => {
  const cases: Case[] = [];

  for (let denominator = 2; denominator <= 9; denominator += 1) {
    const canonical = `sqrt(2)/${denominator}`;
    const variants = [
      `sqrt(2)/${denominator}`,
      `(sqrt(2))/${denominator}`,
      `sqrt((2))/${denominator}`,
      `(sqrt((2)))/(${denominator})`,
      `[sqrt(2)]/${denominator}`,
      `{sqrt(2)}/${denominator}`,
      `[{sqrt(2)}/${denominator}]`,
      `{(sqrt(2))/(${denominator})}`,
    ];

    for (const variant of variants) {
      cases.push({
        expression: variant,
        target: canonical,
        expected: true,
        source: 'sqrt-fraction:notation-expression',
      });
      cases.push({
        expression: canonical,
        target: variant,
        expected: true,
        source: 'sqrt-fraction:notation-target',
      });
    }

    cases.push({
      expression: `sqrt(8)/${denominator}`,
      target: `2*sqrt(2)/${denominator}`,
      expected: true,
      source: 'sqrt-fraction:equivalence-sqrt8',
    });

    cases.push({
      expression: `(2*sqrt(2))/${2 * denominator}`,
      target: `sqrt(2)/${denominator}`,
      expected: true,
      source: 'sqrt-fraction:equivalence-scaled',
    });
  }

  return cases;
};

const cases = [
  ...buildSingleDigitNotationCases(),
  ...buildMultiDigitCases(),
  ...buildSqrtFractionCases(),
];

let failures = 0;
const failureMessages: string[] = [];

for (const [index, testCase] of cases.entries()) {
  const result = evaluateExpression(testCase.expression, testCase.target, []);
  const ok = Boolean(result.success && result.is_match === testCase.expected);

  if (!ok) {
    failures += 1;
    if (failureMessages.length < 30) {
      failureMessages.push(
        [
          `FAIL #${index + 1} [${testCase.source}]`,
          `  expr: ${testCase.expression}`,
          `  target: ${testCase.target}`,
          `  success: ${String(result.success)}`,
          `  is_match: ${String((result as { is_match?: boolean }).is_match)}`,
          `  error: ${String((result as { error?: string }).error ?? '')}`,
        ].join('\n')
      );
    }
  }
}

if (failures > 0) {
  console.error(`Fraction regression failed: ${failures}/${cases.length} cases failed.`);
  for (const message of failureMessages) {
    console.error(message);
  }
  process.exitCode = 1;
} else {
  console.log(`Fraction regression passed: ${cases.length} cases validated.`);
}
