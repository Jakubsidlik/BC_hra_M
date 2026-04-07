# Pravidla hry: Math4fun

> **Upozornění:** Tento herní systém respektuje zavedená matematická pravidla, definice, věty, logické důsledky a veškeré axiomatické systémy. Mechanika hry neumožňuje subjektivní interpretaci; vyžaduje se konstrukce výrazu v souladu s formální logikou. Ověřování probíhá lokálně přes Nerdamer (s numerickým fallbackem Math.js).

---

## 1. Představení
Math4fun je karetní herní systém zaměřený na skladbu matematických výrazů pro **2–8 hráčů**. Hra vyžaduje numerickou přesnost, strategické plánování tahů oponentů a práci s efekty karet.

## 2. Cíl hry
Cílem je konstrukce formálně správné rovnosti **L = R**.
- **L (tabule):** hráčem vytvořený řetězec hodnot, operací, závorek a proměnných
- **R (výsledek):** cílová hodnota určená na začátku hry dle obtížnosti

## 2A. Herní mód: Společný cíl
V módu **Společný cíl** mají všichni hráči stejnou cílovou hodnotu **R** a každý hráč má vlastní odpočet tahů:

- **Výchozí odpočet: 20 tahů na hráče**
- **Ve Vlastní obtížnosti lze nastavit vlastní počet tahů na hráče**

- Odpočet se odečítá samostatně každému hráči při ukončení jeho kola.
- Pokud je hráčův tah přeskočen efektem karty, započítá se to také jako uplynulý tah.
- Jakmile všichni hráči vyčerpají své tahy, hra se vyhodnotí podle vzdálenosti jejich výrazu od společného cíle R.
- Vyhrává hráč (nebo více hráčů při remíze) s nejmenší odchylkou.
- Pokud některý hráč kdykoliv přesně prokáže `L = R` přes Q.E.D., hra končí okamžitě jeho výhrou.

## 2C. Tutoriál
- Tutoriál je krátká řízená ukázková hra.
- Cíl je pevně nastavený na **R = 11**.
- Hra krokově vede práci s vyložením, odhazováním, závorkami i ověřením Q.E.D.

## 2B. Obtížnosti a generování R

### Klasický režim
- **Tutoriál:** řízená ukázková hra s pevným cílem `R = 11`.
- **ZŠ:** R je číslo z intervalu `-99..99`, nebo člen `-9x..9x` / `-9y..9y` (bez `0x` a `0y`).
- **SŠ:** R je z množiny `-99..999`, `-99x..99x`, `-99y..99y`, `-99e..99e`, `-99π..99π`.
- **VŠ:** stejné jako SŠ. Pokud je zamčená VŠ karta `∏`, cílové R se losuje jako složené číslo podle pravidel sekvenčního produktu.
- **Vlastní:** před volbou hráčů se otevře konfigurace balíčku. Hráč zvolí, které karty budou ve hře a kolik kopií každé karty bude v dobíracím balíčku. Bez výběru alespoň jedné karty nelze pokračovat.

### Režim Společný cíl
- **ZŠ:** společné R je `-99..99`, `-9x..9x`, `-9y..9y` (bez `0x` a `0y`).
- **SŠ:** společné R je z množiny `-99..99`, `-99x..99x`, `-99y..99y`, `-99e..99e`, `-99π..99π`.
- **VŠ:** stejné jako SŠ. Pokud je společná VŠ karta `∏`, společné R je složené číslo. Všichni hráči sdílí stejnou zamčenou VŠ kartu.
- **Vlastní:** společný cíl i zamčené VŠ karty vycházejí z vlastní konfigurace. Lze zapnout vlastní počet tahů na hráče; při této volbě zůstává odpočtová lišta kol po celou hru zelená.

### Chování VŠ zamčených karet ve Vlastní obtížnosti
- Pokud je v konfiguraci vybraná právě jedna VŠ zamčená karta (`int`, `d/dx`, `∑`, `∏`, `lim`), dostanou ji všichni hráči.
- Pokud jsou vybrané dvě nebo více těchto karet, každý hráč dostane náhodně jednu z vybraných karet.

## 3. Příprava hry
1. Každý hráč obdrží fixní sadu: **3 páry závorek** `()`, `[]`, `{}` a kartu `=`.
2. Tyto fixní karty netvoří součást dobíracího balíčku.
3. Hráči zvolí obtížnost (Tutoriál, ZŠ, SŠ, VŠ, Vlastní) a určí cílovou hodnotu **R**.
4. Zamíchá se hlavní balíček a každý hráč si dobere **5 karet**.
5. Zahajující hráč začne hru dobráním **šesté karty**.

## 4. Průběh hry
Hráči se střídají po směru hodinových ručiček. Tah hráče běží od začátku jeho kola do potvrzení **Ukončit tah** (včetně povinného odhazování z ruky na limit 5 karet, pokud je potřeba).

### 4.1 Co je počítáno jako tah
- Vyložení karty z ruky do tabule.
- Vložení karty z ruky do slotu/okénka (počítá se stejně jako vyložení do tabule).
- Odhodit kartu z tabule do odhozu (včetně všech vnořených dětí a slotů).
- Reset tabule: vyhodit celý výraz do odhozu.
- Ve svém tahu může hráč z ruky vyložit maximálně 2 karty: 1 hodnotu/proměnnou a 1 operaci.
- Ve stejném tahu nelze vyložit dvě karty ze stejné kategorie.
- Pokud hráč vyloží obě kategorie v jednom tahu, v příštím tahu dobírá o 1 kartu navíc (standardně 2 místo 1).
- Odhazovací/reset akci z tabule lze v jednom tahu provést maximálně 1x.

### 4.2 Co není počítáno jako tah
- Položení páru závorek se nepočítá do limitu vyložení 1 hodnota + 1 operace.
- V jednom tahu lze uzavřít maximálně 1 pár závorek.
- Přeskládání/přesunutí již vyložených karet uvnitř vlastní tabule (včetně přesunu do exponentu/slotu) se do limitu vyložení z ruky nepočítá.
- Odhazování z ruky po stisku **Ukončit tah** (pro snížení ruky na max 5 karet) není vyložení z ruky ani odhoz z tabule.

### 4.3 Důležité kombinace a pořadí
- Pokud hráč nejdřív vyloží kartu z ruky, už v tom tahu nemůže provést odhoz/reset z tabule.
- Pokud hráč nejdřív provede odhoz/reset z tabule, už v tom tahu nemůže vykládat z ruky.
- Když hráč přetáhne jednu závorku z aktivního páru z tabule do odhozu nebo zpět do prostoru závorek, vrátí se oba kusy páru do sady závorek.
- Vrácené závorky se seřadí ve fixním pořadí `()[]{}.`

### 4.4 Q.E.D.
- Hráč může spustit Q.E.D., pokud chce ověřit, že rovnost `L = R` platí.

## 5. Ověření Q.E.D. a konec hry
Pokud hráč prohlásí Q.E.D., následuje kontrola:

- **Kontrola enginem:** lokální matematický engine ověří, zda platí `L = R`
- **Správné řešení:** hráč je vítěz a hra končí
- **Chybný důkaz:** hráč odstraní všechny karty ze své tabule do odhazovacího balíčku a hra pokračuje

## 6. Uspořádání, omezení a syntax
- Každý výraz na tabuli musí obsahovat alespoň **jednu operaci**
- Výpočty probíhají v oboru **reálných čísel**
- Není potřeba karta násobení, pokud je vedle sebe hodnota a závorka nebo dvě závorky

## 7. Rozlišení karet
- **Hodnoty:** `0–9`, `π`, `e`, goniometrie (`sin`, `cos`, `tan`, `cotg`)
- **Proměnné:** `x`, `y`
- **Závorky:** `()`, `[]`, `{}`
- **Operace:** dle úrovně obtížnosti (ZŠ, SŠ, VŠ)

### Rozlišení cílů efektu
- **Na sebe** – platí pro hráče samotného
- **Následující hráč**
- **Libovolný hráč**
- **Všichni hráči / všichni soupeři** (dle popisu karty)

## 8. Konec tahu a odhazování
- Stisk tlačítka **Ukončit tah** vždy aktivuje režim odhazování / předání tahu.
- Hráč může odhazovat karty z ruky do odhazovacího balíčku.
- Tah lze předat až ve chvíli, kdy má hráč v ruce nejvýše **5 karet**.

## 9. Obsah balení
- **Hodnoty (152 ks):** `0–9` (100 ks), `π` (5 ks), `e` (5 ks), `x` (10 ks), `y` (10 ks), goniometrické funkce (22 ks)
- **Operace ZŠ (96 ks):** `+` (20 ks), `-` (20 ks), `*` (20 ks), `:` (20 ks), `^` (8 ks), `√` (8 ks)
- **Operace SŠ (40 ks):** `log2/log3/log10` (6 ks), `!` (4 ks), kombinace (4 ks), `| |` (6 ks), velikost vektoru (4 ks), modulo (6 ks), `det` (4 ks), skalární součin (6 ks)
- **Operace VŠ (30 ks):** derivace (6 ks), `∫` (6 ks), `∑` (6 ks), `∏` (6 ks), limita (6 ks)
- **Fixní karty (56 ks):** `=` (8 ks), karta goniometrické tabulky (1 ks), levé závorky (24 ks), pravé závorky (24 ks)

**Celkem hra obsahuje 375 karet.**
