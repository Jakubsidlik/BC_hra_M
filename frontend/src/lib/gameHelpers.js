"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePersonalTargetR = generatePersonalTargetR;
exports.parseBoardToMathString = parseBoardToMathString;
exports.hasOperation = hasOperation;
exports.getTargetName = getTargetName;
exports.getBorderColor = getBorderColor;
exports.generateFilteredDeck = generateFilteredDeck;
// 2. GENEROVÁNÍ CÍLE (R)
function generatePersonalTargetR(difficulty) {
    var randInt = function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };
    var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    var pickVar = function () { return pick(['x', 'y']); };
    var pickConstant = function () { return pick(['π', 'e']); };
    if (difficulty === 'ZŠ') {
        var category = randInt(1, 4);
        switch (category) {
            case 1: return "".concat(randInt(1, 9)); // jednociferné číslo
            case 2: return "".concat(randInt(10, 99)); // dvouciferné číslo
            case 3: return "".concat(randInt(100, 999)); // trojciferné číslo
            case 4: return "".concat(randInt(1, 9)).concat(pickVar()); // jednociferné číslo a X/Y
        }
    }
    if (difficulty === 'SŠ') {
        var category = randInt(1, 6);
        switch (category) {
            case 1: return "".concat(randInt(10, 99)); // dvouciferné číslo
            case 2: return "".concat(randInt(100, 999)); // trojciferné číslo
            case 3: return "".concat(randInt(1, 9)).concat(pickVar()); // jednociferné číslo a X/Y
            case 4: return "".concat(randInt(10, 99)).concat(pickVar()); // dvouciferné číslo a X/Y
            case 5: {
                // kombinace čísla a konstanty
                var num = randInt(1, 20);
                var constant = pickConstant();
                return "".concat(num).concat(constant);
            }
            case 6: {
                // kombinace čísla, konstanty a X/Y
                var num = randInt(1, 10);
                var constant = pickConstant();
                var variable = pickVar();
                return "".concat(num).concat(constant).concat(variable);
            }
        }
    }
    if (difficulty === 'VŠ') {
        var category = randInt(1, 5);
        switch (category) {
            case 1: return "".concat(randInt(10, 99)); // dvouciferné číslo
            case 2: return "".concat(randInt(10, 99)).concat(pickVar()); // dvouciferné číslo a X/Y
            case 3: {
                // kombinace čísla a konstanty
                var type = randInt(1, 3);
                if (type === 1) {
                    // číslo * konstanta (např 8e, 2π)
                    return "".concat(randInt(1, 20)).concat(pickConstant());
                }
                else if (type === 2) {
                    // jen konstanta
                    return pickConstant();
                }
                else {
                    // konstanta * konstanta (π*e)
                    var c1 = pickConstant();
                    var c2 = pickConstant();
                    while (c2 === c1)
                        c2 = pickConstant();
                    return "".concat(c1).concat(c2);
                }
            }
            case 4: {
                // kombinace čísla, konstanty a X/Y
                var type = randInt(1, 4);
                var variable = pickVar();
                if (type === 1) {
                    // číslo * konstanta * X
                    return "".concat(randInt(1, 10)).concat(pickConstant()).concat(variable);
                }
                else if (type === 2) {
                    // konstanta * X
                    return "".concat(pickConstant()).concat(variable);
                }
                else if (type === 3) {
                    // číslo * X
                    return "".concat(randInt(1, 20)).concat(variable);
                }
                else {
                    // konstanta * konstanta * X
                    var c1 = pickConstant();
                    var c2 = pickConstant();
                    while (c2 === c1)
                        c2 = pickConstant();
                    return "".concat(c1).concat(c2).concat(variable);
                }
            }
            case 5: {
                // kombinace čísla a mocniny X
                var num = randInt(1, 20);
                var variable = pickVar();
                var power = randInt(2, 5);
                return "".concat(num).concat(variable, "^").concat(power);
            }
        }
    }
    return "0";
}
// 3. PŘEVOD PLOCHY NA MATEMATICKÝ STRING PRO BACKEND
function parseBoardToMathString(board) {
    if (!board || board.length === 0)
        return "";
    // Pomocná mapa pro SymPy transformace
    var symbolMap = {
        'π': 'pi',
        'e': 'E',
        'tg': 'tan',
        'cotg': '1/tan',
        'ln': 'log', // SymPy log(x) je přirozený logaritmus
        '√': 'sqrt',
        'mod': '%'
    };
    var result = "";
    for (var i = 0; i < board.length; i++) {
        var card = board[i];
        var sym = symbolMap[card.symbol] || card.symbol;
        if (i > 0) {
            var prevCard = board[i - 1];
            var prevIsDigitOrVar = prevCard.symbol.match(/^[0-9]$/) || ['x', 'y', 'π', 'e'].includes(prevCard.symbol);
            var currIsDigitOrVar = card.symbol.match(/^[0-9]$/) || ['x', 'y', 'π', 'e'].includes(card.symbol);
            var prevIsCloseBracket = [')', ']', '}'].includes(prevCard.symbol);
            var currIsOpenBracket = ['(', '[', '{'].includes(card.symbol);
            var currIsFunction = ['sin', 'cos', 'tg', 'cotg', 'log', 'ln', 'sqrt', '∫', '∑', 'lim'].includes(card.symbol);
            // Pravidla pro implicitní násobení:
            // 1) Číslo/Proměnná -> Otevírací závorka  (např. "5(")
            // 2) Číslo/Proměnná -> Funkce             (např. "2sin")
            // 3) Uzavírací závorka -> Otevírací závorka (např. ")(")
            // 4) Uzavírací závorka -> Číslo/Proměnná  (např. ")5")
            // 5) Uzavírací závorka -> Funkce          (např. ")sin")
            if ((prevIsDigitOrVar && currIsOpenBracket) ||
                (prevIsDigitOrVar && currIsFunction) ||
                (prevIsCloseBracket && currIsOpenBracket) ||
                (prevIsCloseBracket && currIsDigitOrVar) ||
                (prevIsCloseBracket && currIsFunction)) {
                result += "*";
            }
        }
        // 1. ZPRACOVÁNÍ PREFIXOVÝCH FUNKCÍ (Integrál, Suma, atd.)
        if (['∫', '∑', 'lim'].includes(card.symbol)) {
            // Tady je trik: integrál "vysaje" jen to, co je v jeho dosahu
            // Pro jednoduchost teď bereme vše napravo, ale bez 'break'
            // Pokud chceš, aby integrál končil, doporučuji přidat kartu "dx" nebo ")"
            var rest = board.slice(i + 1);
            var inner = parseBoardToMathString(rest) || "1";
            if (card.symbol === '∫' && card.integralBounds) {
                result += "Integral(".concat(inner, ", (x, ").concat(card.integralBounds.lower, ", ").concat(card.integralBounds.upper, "))");
            }
            else if (card.symbol === '∑' && card.integralBounds) {
                result += "Sum(".concat(inner, ", (n, ").concat(card.integralBounds.lower, ", ").concat(card.integralBounds.upper, "))");
            }
            else if (card.symbol === 'lim') {
                result += "Limit(".concat(inner, ", x, 0)"); // Zjednodušená limita
            }
            // DŮLEŽITÉ: Po prefixové funkci už zbytek v tomto cyklu nezpracováváme,
            // protože je "uvnitř" té funkce.
            return result;
        }
        // 2. ZPRACOVÁNÍ MOCNIN (Recursive)
        if (card.exponent) {
            var base = (sym.length > 1 || !/^[0-9xπe]$/.test(sym)) ? "(".concat(sym, ")") : sym;
            var expStr = parseBoardToMathString([card.exponent]);
            sym = "(".concat(base, ")**(").concat(expStr, ")"); // Používáme Python **
        }
        result += sym;
    }
    return result;
}
// 4. POMOCNÉ FUNKCE PRO UI
function hasOperation(board) {
    // Všechny operace s efekty: +, -, *, /, a^b, sqrt, mod, n!, d/dx, int, ∑, log, sin, cos, tg, cotg, nCk, ∏, lim, det
    var operations = [
        '+', '-', '*', '/', 'a^b', 'sqrt', 'mod', 'n!', 'd/dx', 'int',
        '∑', 'log', 'ln', 'sin', 'cos', 'tg', 'cotg', 'nCk', '∏', 'lim', 'det',
        '∫', // alternativní symbol pro integrál
    ];
    var hasExplicitOp = board.some(function (card) { return operations.includes(card.symbol) || card.exponent; });
    if (hasExplicitOp)
        return true;
    // Detekce implicitního násobení
    for (var i = 1; i < board.length; i++) {
        var prevCard = board[i - 1];
        var card = board[i];
        var prevIsDigitOrVar = prevCard.symbol.match(/^[0-9]$/) || ['x', 'y', 'π', 'e'].includes(prevCard.symbol);
        var currIsDigitOrVar = card.symbol.match(/^[0-9]$/) || ['x', 'y', 'π', 'e'].includes(card.symbol);
        var prevIsCloseBracket = [')', ']', '}'].includes(prevCard.symbol);
        var currIsOpenBracket = ['(', '[', '{'].includes(card.symbol);
        var currIsFunction = ['sin', 'cos', 'tg', 'cotg', 'log', 'ln', 'sqrt', '∫', '∑', 'lim'].includes(card.symbol);
        if ((prevIsDigitOrVar && currIsOpenBracket) ||
            (prevIsDigitOrVar && currIsFunction) ||
            (prevIsCloseBracket && currIsOpenBracket) ||
            (prevIsCloseBracket && currIsDigitOrVar) ||
            (prevIsCloseBracket && currIsFunction)) {
            return true;
        }
    }
    return false;
}
function getTargetName(targetCode) {
    switch (targetCode) {
        case 'SELF': return 'Na sebe';
        case 'OPPONENT': return 'Na soupeře';
        case 'ANY': return 'Na kohokoliv';
        case 'BOARD': return 'Na plochu';
        case 'GLOBAL': return 'Všem';
        default: return 'Pasivní';
    }
}
function getBorderColor(symbol) {
    // Čísla: modré
    if (!isNaN(Number(symbol)) || ['π', 'e'].includes(symbol))
        return 'border-blue-500';
    // Proměnné: šedé
    if (['x', 'y', 'n'].includes(symbol))
        return 'border-slate-400';
    // Syntaxe (závorky, rovná se): černé
    if (['(', ')', '='].includes(symbol))
        return 'border-black';
    // Operace: oranžové
    var operators = [
        '+', '-', '*', '/', 'a^b', 'sqrt', 'mod', 'n!',
        'd/dx', 'int', '∑', 'log', 'ln', 'sin', 'cos', 'tg', 'cotg',
        'nCk', '∏', 'lim', 'det'
    ];
    if (operators.includes(symbol))
        return 'border-orange-500';
    // Fallback
    return 'border-slate-400';
}
// 5. GENEROVÁNÍ BALÍČKU (Pokud ji máš vyřešenou jinak, nahraď svou původní)
var cardsDB_1 = require("../data/cardsDB");
function generateFilteredDeck(difficulty) {
    var _a;
    var deck = [];
    // Definice vyloučených karet podle obtížností
    // ZŠ: Jen základní operace (+, -, *, /), čísla, proměnné (x, y)
    // SŠ: ZŠ + mocniny, odmocniny,log, gon. fce, faktoriál, kombinace
    // VŠ: Všechny operace včetně derivací, integrálů, sum, produktů, limitů, determinantů
    var difficultyFilters = {
        // ZŠ vyloučí: vysokoškolský obsah + pokročilé SŠ operace
        'ZŠ': [
            'π', 'e', 'mod', 'n!',
            'd/dx', 'int', '∑', 'log', 'sin', 'cos', 'tg', 'cotg',
            'nCk', '∏', 'lim', 'det'
        ],
        // SŠ vyloučí: pouze vysokoškolský obsah
        'SŠ': [
            'd/dx', 'int', '∑', '∏', 'lim', 'det'
        ],
        // VŠ: bez vyloučení
        'VŠ': []
    };
    var excludedCards = difficultyFilters[difficulty];
    Object.keys(cardsDB_1.cardsDatabase).forEach(function (symbol) {
        if (excludedCards.includes(symbol))
            return;
        var cardData = cardsDB_1.cardsDatabase[symbol];
        // Přidáme počet kopií podle count v databázi
        for (var i = 0; i < cardData.count; i++) {
            deck.push({ id: "deck-".concat(symbol, "-").concat(i + 1), symbol: symbol });
        }
    });
    // Zamíchání balíčku (Fisher-Yates shuffle)
    for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [deck[j], deck[i]], deck[i] = _a[0], deck[j] = _a[1];
    }
    return deck;
}
