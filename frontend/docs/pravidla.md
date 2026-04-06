# Pravidla hry: Math4fun

> **Upozornění:** Tento herní systém respektuje zavedená matematická pravidla, definice, věty, logické důsledky a veškeré axiomatické systémy. Mechanika hry neumožňuje subjektivní interpretaci; vyžaduje se konstrukce výrazu v souladu s formální logikou.

---

## 1. Představení
Math4fun je karetní herní systém zaměřený na skladbu matematických výrazů pro **2–8 hráčů**. Hra vyžaduje numerickou přesnost, strategické plánování tahů oponentů a práci s efekty karet.

## 2. Cíl hry
Cílem je konstrukce formálně správné rovnosti **L = R**.
- **L (tabule):** hráčem vytvořený řetězec hodnot, operací, závorek a proměnných
- **R (výsledek):** cílová hodnota určená na začátku hry dle obtížnosti

## 2A. Herní mód: Společný cíl
V módu **Společný cíl** mají všichni hráči stejnou cílovou hodnotu **R**, ale každý hráč má vlastní odpočet tahů podle obtížnosti:

- **ZŠ: 20 tahů**
- **SŠ: 30 tahů**
- **VŠ: 30 tahů**

- Odpočet se odečítá samostatně každému hráči při ukončení jeho kola.
- Pokud je hráčův tah přeskočen efektem karty, započítá se to také jako uplynulý tah.
- Jakmile všichni hráči vyčerpají své tahy, hra se vyhodnotí podle vzdálenosti jejich výrazu od společného cíle R.
- Vyhrává hráč (nebo více hráčů při remíze) s nejmenší odchylkou.

## 2B. Obtížnosti a generování R

### Klasický režim
- **ZŠ:** R je číslo z intervalu `-99..99`, nebo člen `x..99x` / `y..99y`.
- **SŠ:** R je z množiny `-99..999`, `-99x..99x`, `-99y..99y`, `-99e..99e`, `-99π..99π`.
- **VŠ:** stejné jako SŠ. Pokud je zamčená VŠ karta `∏`, cílové R se losuje jako složené číslo podle pravidel sekvenčního produktu.

### Režim Společný cíl
- **ZŠ:** společné R je `0..99`.
- **SŠ:** společné R je z množiny `-99..99`, `-99x..99x`, `-99y..99y`, `-99e..99e`, `-99π..99π`.
- **VŠ:** stejné jako SŠ. Pokud je společná VŠ karta `∏`, společné R je složené číslo. Všichni hráči sdílí stejnou zamčenou VŠ kartu.

## 3. Příprava hry
1. Každý hráč obdrží fixní sadu: **3 páry závorek** `()`, `[]`, `{}` a kartu `=`.
2. Tyto fixní karty netvoří součást dobíracího balíčku.
3. Hráči zvolí obtížnost (ZŠ, SŠ, VŠ) a určí cílovou hodnotu **R**.
4. Zamíchá se hlavní balíček a každý hráč si dobere **5 karet**.
5. Zahajující hráč začne hru dobráním **šesté karty**.

## 4. Průběh hry
Hráči se střídají po směru hodinových ručiček. Ve svém tahu hráč využije jednu z akcí:

- **Přidání:** vložit novou kartu z ruky do výrazu na tabuli
- **Odebrání:** vzít jednu kartu z výrazu do odhazovacího balíčku či zpět do ruky
- **Reset:** vyhodit celý výraz na tabuli do odhazovacího balíčku
- **Q.E.D.:** prohlásit, že rovnost `L = R` platí, a zahájit ověření

Hráč má během svého tahu právo přeskládat již vyložené karty ve svém výrazu. Toto přeskládání se nepočítá jako tah.

## 5. Ověření Q.E.D. a konec hry
Pokud hráč prohlásí Q.E.D., následuje kontrola:

- **Oponentský posudek:** první soupeř po levici i pravici provede kontrolu výpočtu
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
- **Hodnoty (142 ks):** `0–9` (90 ks), `π` (5 ks), `e` (5 ks), `x` (10 ks), `y` (10 ks), goniometrické funkce (22 ks)
- **Operace ZŠ (96 ks):** `+` (20 ks), `-` (20 ks), `*` (20 ks), `:` (20 ks), `^` (8 ks), `√` (8 ks)
- **Operace SŠ (40 ks):** `log2/log3/log10` (6 ks), `!` (4 ks), kombinace (4 ks), `| |` (6 ks), velikost vektoru (4 ks), modulo (6 ks), `det` (4 ks), skalární součin (6 ks)
- **Operace VŠ (30 ks):** derivace (6 ks), `∫` (6 ks), `∑` (6 ks), `∏` (6 ks), limita (6 ks)
- **Fixní karty (56 ks):** `=` (8 ks), karta goniometrické tabulky (1 ks), levé závorky (24 ks), pravé závorky (24 ks)

**Celkem hra obsahuje 365 karet.**
