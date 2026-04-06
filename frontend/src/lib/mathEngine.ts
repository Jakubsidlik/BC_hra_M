import nerdamer from 'nerdamer';
import 'nerdamer/Calculus';
import { create, all } from 'mathjs';

const math = create(all, {});

type NerdamerExpr = {
    text: () => string;
    evaluate: () => NerdamerExpr;
    expand: () => NerdamerExpr;
};

const errorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
};

/**
 * Převede specifický "SymPy" zápis z useGameEngine.ts na formát pro Nerdamer.
 */
function translateToNerdamer(expr: string): string {
    let result = expr;

    // 1. Python mocniny -> standardní stříška
    result = result.replace(/\*\*/g, '^');

    // 2. SymPy formáty funkcí (vygenerovaných z parseBoardToMathString)
    // ln(x) -> log(x, 3)
    result = result.replace(/ln\(([^()]+)\)/g, 'log($1,3)');

    // log2(x) -> log(x, 2)
    result = result.replace(/log2\(([^()]+)\)/g, 'log($1,2)');

    // log3(x) -> log(x, 3)
    result = result.replace(/log3\(([^()]+)\)/g, 'log($1,3)');

    // log10(x) -> log(x, 10)
    result = result.replace(/log10\(([^()]+)\)/g, 'log($1,10)');

    // Integral(inner, (var, lower, upper)) -> defint(inner, lower, upper, var)
    result = result.replace(/Integral\((.*?),\s*\((.*?),\s*(.*?),\s*(.*?)\)\)/g, 'defint($1, $3, $4, $2)');

    // Sum(inner, (var, lower, upper)) -> sum(inner, var, lower, upper)
    result = result.replace(/Sum\((.*?),\s*\((.*?),\s*(.*?),\s*(.*?)\)\)/g, 'sum($1, $2, $3, $4)');

    // Product(inner, (var, lower, upper)) -> product(inner, var, lower, upper)
    result = result.replace(/Product\((.*?),\s*\((.*?),\s*(.*?),\s*(.*?)\)\)/g, 'product($1, $2, $3, $4)');

    // Derivative(inner, var, order) -> diff(inner, var, order)
    result = result.replace(/Derivative\((.*?),\s*(.*?),\s*(.*?)\)/g, 'diff($1, $2, $3)');

    // Limit(inner, var, target) -> limit(inner, var, target)
    result = result.replace(/Limit\((.*?),\s*(.*?),\s*(.*?)\)/g, 'limit($1, $2, $3)');

    // Math.js n! už je pokryto, ale nerdamer potřebuje factorial(n) pro n!
    // Nerdamer ale nativně '!' chápe jako faktoriál.

    return result;
}

/**
 * Hlavní evaluační funkce, která nahrazuje volání backendu.
 */
export function evaluateExpression(expression: string, target_r: string, modifiers: string[]) {
    try {
        // 1. Převedeme Python SymPy syntaxi (pokud tam je) na Nerdamer syntaxi
        const cleanedL = translateToNerdamer(expression);
        const cleanedR = translateToNerdamer(target_r);

        // 2. Vytvoříme symbolické výrazy pomocí Nerdamer
        let L: NerdamerExpr;
        let R: NerdamerExpr;

        try {
            L = nerdamer(cleanedL) as unknown as NerdamerExpr;
        } catch (e: unknown) {
            throw new Error(`Chyba syntaxe ve výrazu L. Nechybí někde závorka? (${errorMessage(e)})`);
        }

        try {
            R = nerdamer(cleanedR) as unknown as NerdamerExpr;
        } catch (e: unknown) {
            throw new Error(`Chyba syntaxe ve výrazu R. (${errorMessage(e)})`);
        }

        let specialMsg = "";

        // 3. Aplikace modifikátorů
        if (modifiers.includes("ABS_VALUE")) {
            L = nerdamer(`abs(${L.text()})`);
            specialMsg += " Aplikována absolutní hodnota. ";
        }

        if (modifiers.includes("NEW_R")) {
            const newVal = Math.floor(Math.random() * 49) + 2; // Rand int 2 - 50
            R = nerdamer(newVal.toString());
            specialMsg += `Karta změnila výsledek! Nový cíl R je ${newVal}. `;
        }

        if (modifiers.includes("MOD_R")) {
            // Nerdamer nemá vestavěné modulo operátory s proměnnými snadno rozlišitelné kromě funkce
            // Ale můžeme vyhodnotit numericky R a udělat modulo 10
            try {
                const rValStr = R.evaluate().text();
                const rValNum = Number(rValStr);
                if (!isNaN(rValNum)) {
                    R = nerdamer((rValNum % 10).toString());
                    specialMsg += " Modulo zredukovalo cíl! ";
                } else {
                    // Pokud nejde vyhodnotit (např. obsahuje x), použijeme string zápis
                    R = nerdamer(`(${R.text()})%10`);
                    specialMsg += " Modulo aplikováno na cíl! ";
                }
            } catch {
                R = nerdamer(`(${R.text()})%10`);
                specialMsg += " Modulo aplikováno na cíl! ";
            }
        }

        if (modifiers.includes("PI_R")) {
            R = nerdamer(`(${R.text()})*pi`);
            specialMsg += " Do rovnice vstoupilo π! ";
        }

        // 4. Porovnání.
        // Provedeme zjednodušení L - R a zkontrolujeme, zda se rovná 0
        let isMatch = false;

        try {
            // 4a. Analytické symbolické porovnání pomocí nerdamer
            const diff = nerdamer(`(${L.text()})-(${R.text()})`);
            const simplifiedDiff = diff.expand();
            if (simplifiedDiff.text() === '0') {
                isMatch = true;
            } else {
                // Zkusíme numerické vyhodnocení, kdyby např. 1 - 1 = 0.
                const evaluatedL = L.evaluate().text();
                const evaluatedR = R.evaluate().text();
                if (evaluatedL === evaluatedR) {
                    isMatch = true;
                } else if (!isNaN(Number(evaluatedL)) && !isNaN(Number(evaluatedR))) {
                    if (Math.abs(Number(evaluatedL) - Number(evaluatedR)) < 1e-12) {
                        isMatch = true;
                    }
                }
            }
        } catch {
            // 4b. Numerický fallback přes mathjs, pokud nerdamer selže při složitějších operacích
            try {
                const valL = math.evaluate(L.text());
                const valR = math.evaluate(R.text());
                if (Math.abs(valL - valR) < 1e-12) {
                    isMatch = true;
                }
            } catch {
                isMatch = false;
            }
        }

        return {
            success: true,
            is_match: isMatch,
            simplified: L.text(),
            new_r: R.text(),
            message: specialMsg.trim()
        };
    } catch (error: unknown) {
        // Zachytí ZeroDivisionError atp. (v JS to často vrací Infinity, ale mathjs nebo nerdamer může hodit error)
        return {
            success: false,
            error: errorMessage(error) || "Fatální chyba v lokálním enginu."
        };
    }
}

export function evaluateExpressionValue(expression: string, modifiers: string[] = []): number | null {
    try {
        const cleaned = translateToNerdamer(expression);
        let L = nerdamer(cleaned) as unknown as NerdamerExpr;

        if (modifiers.includes("ABS_VALUE")) {
            L = nerdamer(`abs(${L.text()})`) as unknown as NerdamerExpr;
        }

        const evaluated = L.evaluate().text();
        const directNumber = Number(evaluated);
        if (Number.isFinite(directNumber)) return directNumber;

        const fallback = math.evaluate(evaluated);
        if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
        return null;
    } catch {
        return null;
    }
}
