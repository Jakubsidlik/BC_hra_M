# Pravidla hry: Math4fun

> **Upozornění:** Tento herní systém respektuje zavedená matematická pravidla, definice, věty, logické důsledky a veškeré axiomatické systémy. Mechanika hry neumožňuje subjektivní interpretaci; vyžaduje se konstrukce výrazu v souladu s formální logikou. Ověřování běží lokálně přes Nerdamer s numerickým fallbackem v Math.js.

---

## 1. Představení
Math4fun je karetní herní systém zaměřený na skladbu matematických výrazů pro **2-8 hráčů**. Hráči z lokálních karet staví levou stranu rovnice **L** a snaží se ji logicky dotáhnout na předepsaný cíl **R**.

## 2. Cíl hry
Cílem je konstrukce formálně správné rovnosti **L = R**.

- **L:** levá strana, řetězec čísel, proměnných a operátorů skládaný na vaší tabuli.
- **R:** pravá strana, cílová hodnota vygenerovaná na začátku hry podle obtížnosti.

## 3. Typy karet a operace

- **Čísla a konstanty:** 0 až 9, π, e
- **Proměnné:** x, y

### Balíčky podle obtížnosti
- **ZŠ balíček:** základní operace (+, -, *, /, a^b, sqrt), čísla 0-9 a proměnné x/y. Konstanty π a e se v ZŠ nevyskytují.
- **SŠ balíček:** rozšíření ZŠ o pokročilé operace (logaritmy, goniometrii, kombinace, determinant, skalar/vektor, absolutní hodnota) a konstanty π/e.
- **VŠ a Vlastní:** VŠ navíc pracuje se zamčenou kartou jedné analytické operace (d/dx, int, ∑, ∏, lim). Vlastní obtížnost umožní ručně vybrat karty i jejich počty.

## 4. Příprava hry
1. Každý obdrží 3 páry závorek ((), [], {}) a 1 operátor ekvivalence (=).
2. Zvolí se režim (Klasický / Společný cíl) a obtížnost (Tutoriál, ZŠ, SŠ, VŠ, Vlastní).
3. Určí se cílová hodnota R podle zvoleného režimu a obtížnosti.
4. Hráči si doberou 5 počátečních karet ze společného balíčku.
5. Zahajující hráč začíná dobráním šesté karty na začátku tahu.

## 5. Průběh tahu a akce
Matematik může v jednom kole z ruky vyložit maximálně 2 karty: 1 kartu čísla/proměnné/hodnoty a 1 kartu operace.

### Co je počítáno jako tah
- Vyložení karty z ruky do tabule (max 1 hodnota/proměnná + 1 operace za tah).
- Vložení karty z ruky do slotu/okénka (počítá se stejně jako vyložení do tabule).
- Odhoz jedné karty z tabule do odhozu (včetně vnořených karet).
- Reset tabule: vyhození celého výrazu do odhozu (max 1 odhoz/reset akce z tabule za tah).

### Co není počítáno jako tah
- Položení páru závorek se nepočítá do limitu 1 hodnota + 1 operace (stále platí max 1 pár závorek za tah).
- Přeskládání už vyložených karet uvnitř vlastní tabule.
- Odhazování z ruky po stisku Ukončit tah pro splnění limitu max 5 karet.

### Důležitá pravidla pořadí akcí
- Pokud nejdřív vyložíš kartu z ruky, už v tom tahu nemůžeš provést odhoz/reset z tabule.
- Pokud nejdřív provedeš odhoz/reset z tabule, už v tom tahu nemůžeš vykládat z ruky.
- Přetažení jedné závorky z aktivního páru do odhozu nebo zpět do prostoru závorek vrátí celý pár do sady závorek v pořadí ()[].
- Po stisku tlačítka Ukončit tah se aktivuje režim odhazování z ruky; předat tah lze až s maximálně 5 kartami v ruce.
- Efektové karty nabídnou volbu aktivovat efekt (a kartu odhodit), nebo kartu pasivně položit na tabuli.

## 6. Závorky a implicitní násobení
- **Závorky:** umísťují se ve 2 krocích: nejdřív levá, potom pravá.
- **Limit závorek:** v jednom tahu lze uzavřít maximálně 1 pár závorek.
- **Implicitní násobení:** pokud položíte číslo a proměnnou bez znaménka (např. 2 a x), tabule automaticky znásobkuje 2*x.

## 7. Logika okének (slotů)
Okénka (např. meze u integrálů, mocnitelé apod.) přijímají **čísla, proměnné i základní operátory (+, -, *, /)**. Do slotu lze vložit více karet a vytvořit složitější formuli.

## 8. Ukončení a Q.E.D.
- Při formální rovnosti stiskni tlačítko **Q.E.D.**
- **Správné řešení:** engine (Nerdamer + Math.js fallback) potvrdí shodu L s R a hráč vítězí.
- **Chybný důkaz:** hráčovo L se liší, tabule je pohlcena odpadem a hráč ztrácí dosavadní pokrok.

## 9. Herní režimy

### Klasický režim
Každý hráč má vlastní cíl R. Vyhrává ten, kdo první prokáže rovnost L = R pomocí Q.E.D.

### Režim Společný cíl
Všichni hráči sdílí stejné R. Každý hráč má vlastní odpočet tahů (výchozí 20). Po vyčerpání všech odpočtů vyhrává nejmenší odchylka od společného cíle.

## 10. Obtížnosti podle režimu

### Klasický režim
- **Tutoriál:** krátká ukázková hra s pevným cílem R = 11 a řízenými kroky.
- **ZŠ:** výsledek je číslo z intervalu -99..99, nebo člen -9x..9x / -9y..9y (bez 0x a 0y).
- **SŠ:** výsledek je z množiny -99..99, -99x..99x, -99y..99y, -9e..9e, -9π..9π; navíc může být sqrt(2), 2sqrt(2) až 9sqrt(2), sqrt(2)/3, sqrt(2)/4 a obecný zlomek a/b v základním tvaru (a = 1..9, b = 2..9), případně (a/b)π.
- **VŠ:** výsledek je z množiny -99..99, -99x..99x, -99y..99y, -99e..99e, -99π..99π.
- **Vlastní:** výsledky i karty se řídí tím, co si hráč navolí v konfiguraci. Pokud je vybraná jedna VŠ zamčená karta (int, d/dx, ∑, ∏, lim), dostanou ji všichni; pokud je jich vybraných více, každý hráč dostane náhodně jednu z nich.

### Režim Společný cíl
- **ZŠ:** společný výsledek je -99..99, -9x..9x, -9y..9y (bez 0x a 0y).
- **SŠ:** společný výsledek je -99..99, -99x..99x, -99y..99y, -9e..9e, -9π..9π; navíc může být sqrt(2), 2sqrt(2) až 9sqrt(2), sqrt(2)/3, sqrt(2)/4 a obecný zlomek a/b v základním tvaru (a = 1..9, b = 2..9), případně (a/b)π.
- **VŠ:** společný výsledek je z množiny -99..99, -99x..99x, -99y..99y, -99e..99e, -99π..99π.
- **Vlastní:** společný cíl i zamčené VŠ karty se řídí vlastní konfigurací. Lze nastavit vlastní počet tahů na hráče; při této volbě zůstává odpočtová lišta kol po celou hru zelená.

## 11. Efekty karet
Přehled efektů je ve hře generovaný přímo z databáze karet. U každého efektu hra uvádí název, popis, nosné karty a celkové zastoupení v balíčku.

