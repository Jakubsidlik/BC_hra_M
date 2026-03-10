"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyEffectLogic = void 0;
var cardsDB_1 = require("../data/cardsDB");
var gameHelpers_1 = require("./gameHelpers");
// Inicializace statusu, aby se předešlo undefined chybám
var ensureStatus = function (player) {
    if (!player.status) {
        player.status = {
            extraDraw: 0,
            drawReduction: 0,
            immune: false,
            frozen: false,
            operationLock: false,
            numberLock: false,
            mustPlayOperation: false,
            playLimit: null,
            infinitePlays: false,
            exposedHand: false,
            noDrawNextTurn: false,
            absoluteValue: false,
            mathModifiers: [],
            extraTurn: false,
            notifications: [] // PŘIDÁNO
        };
    }
    else if (!player.status.notifications) {
        player.status.notifications = []; // Pojistka pro starší stavy
    }
};
var applyEffectLogic = function (effectId, currentState, currentPlayerIndex, selectedTargetId, targetCardId, playedCard, currentDifficulty // PŘIDÁNO: Potřebujeme vědět obtížnost pro efekty měnící R
) {
    if (currentDifficulty === void 0) { currentDifficulty = 'ZŠ'; }
    // Hluboká kopie stavu
    var newPlayers = JSON.parse(JSON.stringify(currentState));
    var activePlayer = newPlayers[currentPlayerIndex];
    newPlayers.forEach(ensureStatus);
    // Určení cílového hráče (pokud není vybrán, bere se následující)
    var nextPlayerIndex = (currentPlayerIndex + 1) % newPlayers.length;
    var targetPlayer = selectedTargetId !== undefined
        ? newPlayers.find(function (p) { return p.id === selectedTargetId; })
        : newPlayers[nextPlayerIndex];
    // Kontrola imunity — platí jen pro EFF_014 (derivace) a EFF_015 (integrál)
    var immuneEffects = ['EFF_014', 'EFF_015'];
    if (targetPlayer && targetPlayer.id !== activePlayer.id && targetPlayer.status.immune && immuneEffects.includes(effectId)) {
        console.log("Efekt ".concat(effectId, " zru\u0161en: Hr\u00E1\u010D ").concat(targetPlayer.name, " m\u00E1 imunitu!"));
        if (activePlayer.status.notifications) {
            activePlayer.status.notifications.push("Tv\u016Fj \u00FAtok na hr\u00E1\u010De ".concat(targetPlayer.name, " selhal kv\u016Fli imunit\u011B!"));
        }
        return newPlayers;
    }
    switch (effectId) {
        // --- EFEKTY EFF_001 až EFF_025 (Podle karty.csv) ---
        case "EFF_001": // Dobrání 1 karty navíc (0-9, π)
            activePlayer.status.extraDraw = (activePlayer.status.extraDraw || 0) + 1;
            break;
        case "EFF_002": // π: Výměna 1 karty z vlastního L za kartu z L oponenta
            if (targetPlayer && targetCardId && playedCard) {
                var swappedCard_1 = null;
                var findAndSwap_1 = function (cards) {
                    return cards.map(function (c) {
                        if (c.id === targetCardId) {
                            swappedCard_1 = __assign({}, c);
                            return __assign(__assign({}, playedCard), { exponent: c.exponent });
                        }
                        if (c.exponent) {
                            var result = findAndSwap_1([c.exponent]);
                            c.exponent = result.length > 0 ? result[0] : null;
                        }
                        return c;
                    });
                };
                targetPlayer.board = findAndSwap_1(targetPlayer.board);
                if (swappedCard_1) {
                    activePlayer.hand.push(swappedCard_1);
                    targetPlayer.status.notifications.push("\uD83D\uDD04 Hr\u00E1\u010D ".concat(activePlayer.name, " si vym\u011Bnil kartu z tv\u00E9 plochy!"));
                }
            }
            break;
        case "EFF_003": // e: Imunita proti efektům int a d/dx
            activePlayer.status.immune = true;
            break;
        case "EFF_004": // y: Následující hráč musí odhodit všechny číslice
            if (targetPlayer) {
                var originalLength = targetPlayer.hand.length;
                targetPlayer.hand = targetPlayer.hand.filter(function (c) {
                    var _a;
                    var type = (_a = cardsDB_1.cardsDatabase[c.symbol]) === null || _a === void 0 ? void 0 : _a.type;
                    return type !== 'number';
                });
                if (targetPlayer.hand.length < originalLength) {
                    targetPlayer.status.notifications.push("\uD83D\uDD25 Hr\u00E1\u010D ".concat(activePlayer.name, " ti sp\u00E1lil v\u0161echny \u010D\u00EDslice z ruky!"));
                }
            }
            break;
        case "EFF_005": // x: Následující hráč musí odhodit všechny operace
            if (targetPlayer) {
                var originalLength = targetPlayer.hand.length;
                targetPlayer.hand = targetPlayer.hand.filter(function (c) {
                    var _a;
                    var type = (_a = cardsDB_1.cardsDatabase[c.symbol]) === null || _a === void 0 ? void 0 : _a.type;
                    return type !== 'operator';
                });
                if (targetPlayer.hand.length < originalLength) {
                    targetPlayer.status.notifications.push("\uD83D\uDD25 Hr\u00E1\u010D ".concat(activePlayer.name, " ti sp\u00E1lil v\u0161echny operace z ruky!"));
                }
            }
            break;
        case "EFF_006": // +: Následující hráč MUSÍ v příštím tahu použít operaci
            if (targetPlayer) {
                targetPlayer.status.mustPlayOperation = true;
                targetPlayer.status.notifications.push("\u26A0\uFE0F Hr\u00E1\u010D ".concat(activePlayer.name, " ti na\u0159\u00EDdil: Mus\u00ED\u0161 hr\u00E1t operaci!"));
            }
            break;
        case "EFF_007": // -: Odstranění 1 libovolné karty z ruky zvoleného oponenta
            if (targetPlayer && targetPlayer.hand.length > 0) {
                var randomIndex = Math.floor(Math.random() * targetPlayer.hand.length);
                var removed = targetPlayer.hand.splice(randomIndex, 1)[0];
                targetPlayer.status.notifications.push("\uD83D\uDCA5 Hr\u00E1\u010D ".concat(activePlayer.name, " ti sp\u00E1lil kartu z ruky: ").concat(removed.symbol));
            }
            break;
        case "EFF_008": // *: Zdvojnásobení počtu dobíraných karet v PŘÍŠTÍM tahu
            activePlayer.status.extraDraw = (activePlayer.status.extraDraw || 0) + 2;
            break;
        case "EFF_009": // /: Náhled na 3 vrchní karty balíčku a jejich přerovnání
            // Signalizace, že je potřeba UI dialog v App.tsx
            return {
                players: newPlayers,
                metadata: { deckPreviewTriggered: true }
            };
        case "EFF_010": // a^b: Následující hráč přeskakuje svůj tah
            if (targetPlayer) {
                targetPlayer.status.frozen = true;
                targetPlayer.status.notifications.push("\u23ED\uFE0F Hr\u00E1\u010D ".concat(activePlayer.name, " ti zakazuje dal\u0161\u00ED tah!"));
            }
            break;
        case "EFF_011": // sqrt: Odhození celého obsahu ruky a dobrání nových karet
            if (targetPlayer) {
                var count = targetPlayer.hand.length;
                targetPlayer.hand = [];
                targetPlayer.status.extraDraw = (targetPlayer.status.extraDraw || 0) + count;
                targetPlayer.status.notifications.push("\uD83D\uDD04 Hr\u00E1\u010D ".concat(activePlayer.name, " ti nut\u00ED obnovit celou ruku!"));
            }
            break;
        case "EFF_012": // mod: Hodnota R = R mod (lib. číslo z ruky)
            // Signalizace, že je potřeba UI dialog pro výběr čísla z ruky
            return {
                players: newPlayers,
                metadata: { moduloOperationTriggered: true }
            };
        case "EFF_013": // n!: Následující hráč nesmí vyložit více než 1 kartu v příštím tahu
            if (targetPlayer) {
                targetPlayer.status.playLimit = 1;
                targetPlayer.status.notifications.push("\uD83D\uDEAB Hr\u00E1\u010D ".concat(activePlayer.name, " ti omezil hran\u00ED na 1 kartu!"));
            }
            break;
        case "EFF_014": // d/dx: Odstranění všech konstant a proměnných z L oponenta
            if (targetPlayer) {
                var constantSymbols_1 = ['π', 'e', 'x', 'y'];
                var removed_1 = false;
                var removeConstants_1 = function (cards) {
                    return cards.filter(function (c) {
                        if (constantSymbols_1.includes(c.symbol)) {
                            removed_1 = true;
                            return false;
                        }
                        if (c.exponent) {
                            var result = removeConstants_1([c.exponent]);
                            c.exponent = result.length > 0 ? result[0] : null;
                        }
                        return true;
                    });
                };
                targetPlayer.board = removeConstants_1(targetPlayer.board);
                if (removed_1) {
                    targetPlayer.status.notifications.push("\uD83D\uDCC9 Hr\u00E1\u010D ".concat(activePlayer.name, " ti derivoval - v\u0161echny konstanty zmizely!"));
                }
            }
            break;
        case "EFF_015": // int: Okamžité nahrazení cíle R libovolného hráče novým losem
            if (targetPlayer) {
                targetPlayer.targetR = (0, gameHelpers_1.generatePersonalTargetR)(currentDifficulty);
                targetPlayer.status.notifications.push("\u26A0\uFE0F Hr\u00E1\u010D ".concat(activePlayer.name, " ti kompletn\u011B zm\u011Bnil c\u00EDl R na: ").concat(targetPlayer.targetR));
            }
            break;
        case "EFF_016": // ∑: Žádný hráč nemůže celé kolo hrát operace (včetně aktivního hráče)
            newPlayers.forEach(function (p) {
                p.status.operationLock = true;
            });
            newPlayers[currentPlayerIndex].status.notifications.push("\uD83D\uDD10 Z\u00E1kaz operac\u00ED pro v\u0161echny na p\u0159\u00ED\u0161t\u00ED kolo!");
            break;
        case "EFF_017": // log: Můžeš hrát libovolný počet karet
            activePlayer.status.infinitePlays = true;
            break;
        case "EFF_018": // sin: Všichni si předají karty po směru (clockwise)
            var tempHands1 = newPlayers.map(function (p) { return __spreadArray([], p.hand, true); });
            for (var i = 0; i < newPlayers.length; i++) {
                var nextIndex = (i + 1) % newPlayers.length;
                newPlayers[nextIndex].hand = tempHands1[i];
            }
            newPlayers.forEach(function (p) {
                if (p.id !== activePlayer.id) {
                    p.status.notifications.push("\uD83D\uDD04 V\u0161ichni si vym\u011Bnili karty po sm\u011Bru!");
                }
            });
            break;
        case "EFF_019": // cos: Všichni si předají karty proti směru (counter-clockwise)
            var tempHands2 = newPlayers.map(function (p) { return __spreadArray([], p.hand, true); });
            for (var i = 0; i < newPlayers.length; i++) {
                var prevIndex = (i - 1 + newPlayers.length) % newPlayers.length;
                newPlayers[prevIndex].hand = tempHands2[i];
            }
            newPlayers.forEach(function (p) {
                if (p.id !== activePlayer.id) {
                    p.status.notifications.push("\uD83D\uDD04 V\u0161ichni si vym\u011Bnili karty proti sm\u011Bru!");
                }
            });
            break;
        case "EFF_020": // tg: Všichni si předají karty po směru
            var tempHands3 = newPlayers.map(function (p) { return __spreadArray([], p.hand, true); });
            for (var i = 0; i < newPlayers.length; i++) {
                var nextIndex = (i + 1) % newPlayers.length;
                newPlayers[nextIndex].hand = tempHands3[i];
            }
            newPlayers.forEach(function (p) {
                if (p.id !== activePlayer.id) {
                    p.status.notifications.push("\uD83D\uDD04 V\u0161ichni si vym\u011Bnili karty po sm\u011Bru!");
                }
            });
            break;
        case "EFF_021": // cotg: Všichni si předají karty proti směru
            var tempHands4 = newPlayers.map(function (p) { return __spreadArray([], p.hand, true); });
            for (var i = 0; i < newPlayers.length; i++) {
                var prevIndex = (i - 1 + newPlayers.length) % newPlayers.length;
                newPlayers[prevIndex].hand = tempHands4[i];
            }
            newPlayers.forEach(function (p) {
                if (p.id !== activePlayer.id) {
                    p.status.notifications.push("\uD83D\uDD04 V\u0161ichni si vym\u011Bnili karty proti sm\u011Bru!");
                }
            });
            break;
        case "EFF_022": // nCk: Prohození cifer v R cílového oponenta
            if (targetPlayer && typeof targetPlayer.targetR === 'number') {
                var digits = targetPlayer.targetR.toString().split('');
                digits.reverse();
                targetPlayer.targetR = parseInt(digits.join(''), 10);
                targetPlayer.status.notifications.push("\uD83D\uDD00 Hr\u00E1\u010D ".concat(activePlayer.name, " ti prohodil cifry c\u00EDle R!"));
            }
            break;
        case "EFF_023": // ∏: Žádný hráč nemůže celé kolo hrát čísla (včetně aktivního hráče)
            newPlayers.forEach(function (p) {
                p.status.numberLock = true;
            });
            newPlayers[currentPlayerIndex].status.notifications.push("\uD83D\uDD10 Z\u00E1kaz \u010D\u00EDsel pro v\u0161echny na p\u0159\u00ED\u0161t\u00ED kolo!");
            break;
        case "EFF_024": // lim: Zrušení všech aktivních efektů u všech hráčů
            newPlayers.forEach(function (p) {
                p.status.frozen = false;
                p.status.operationLock = false;
                p.status.mustPlayOperation = false;
                p.status.playLimit = null;
            });
            newPlayers.forEach(function (p) {
                if (p.id !== activePlayer.id) {
                    p.status.notifications.push("\uD83D\uDCA5 Hr\u00E1\u010D ".concat(activePlayer.name, " zru\u0161il v\u0161echny efekty!"));
                }
            });
            break;
        case "EFF_025": // det: Změní pořadí tahů na opačné
            newPlayers.reverse();
            newPlayers.forEach(function (p) {
                if (p.id !== activePlayer.id) {
                    p.status.notifications.push("\uD83D\uDD04 Hr\u00E1\u010D ".concat(activePlayer.name, " oto\u010Dil po\u0159ad\u00ED tah\u016F!"));
                }
            });
            return {
                players: newPlayers,
                metadata: { turnOrderReversed: true }
            };
        default:
            console.log("Logika pro efekt '".concat(effectId, "' je spravov\u00E1na v App.tsx nebo nen\u00ED definov\u00E1na."));
    }
    return newPlayers;
};
exports.applyEffectLogic = applyEffectLogic;
