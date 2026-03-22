# Pravidla hry: Math4fun

> **Upozornění:** Tento herní systém respektuje zavedená matematická pravidla, definice, věty, logické důsledky a veškeré axiomatické systémy. Mechanika hry neumožňuje subjektivní interpretaci; vyžaduje se konstrukce výrazu v souladu s formální logikou.

---

## 1. Představení
Math4fun je karetní herní systém zaměřený na skladbu matematických výrazů pro 2–8 hráčů. Hráči z karet staví levou stranu rovnice (L) a snaží se ji dostat na předepsaný cíl (R).

## 2. Cíl hry
Cílem hry je konstrukce formálně správné rovnosti **L = R**.
- **L (Levá strana):** Řetězec čísel, proměnných a operátorů skládáný na tabuli.
- **R (Pravá strana):** Cílová hodnota vygenerovaná na začátku hry podle obtížnosti.

## 3. Typy karet a operace
- **Čísla a konstanty:** 0 až 9, π, e
- **Proměnné:** x, y
- **Aritmetické operátory ZŠ:** Součet (+), Rozdíl (-), Součin (*), Podíl (:)
- **Pokročilé funkce SŠ:** Mocnina (a^b), Odmocnina, Logaritmy, Faktoriál (n!), Goniometrie (sin, cos, tg, cotg), Kombinatorika.
- **Analytické operátory VŠ:** Derivace, Integrál, Diskrétní sumace, Sekvenční produkt, Limita, Determinant.

> **Poznámka:** Některé karty mají herní efekty (bonusy, blokace, výměny). Efekty VŠ karet "Integrál", "Derivace", "Sumace" a "Sekvenční produkt" jsou v běžných módech vypnuté a slouží jen jako operátory.

## 4. Vizuál a Ikony (Efekty)
*Barva okraje karty: Modrá = číslo, Oranžová = operace, Černá = závorka, Šedá = proměnná.*

Během hry rozlišujeme následující typy cílů pro efekty:
- 👤 **Hlava:** Platí pro hráče samotného.
- ➔👤 **Postava:** Cílí na následujícího hráče.
- ✨👤 **Zářící Postava:** Cílí na libovolného hráče podle vaší volby.
- 👥 **Více postav:** Platí pro všechny kromě aktivního hráče.

## 5. Příprava hry
1. Každý hráč obdrží do základu 3 páry závorek `()`, `[]`, `{}` a 1 operátor ekvivalence `=`.
2. Určí se hodnota **R** dle zvolené obtížnosti (ZŠ, SŠ, VŠ).
3. Každý si dobere 5 počátečních karet.
4. Zahajující hráč začíná dobráním své šesté karty.
5. *V režimu VŠ dostane každý hráč navíc na tabuli jednu speciální kartu (Integrál/Derivaci/atd.), která nejde odhodit.*

## 6. Průběh tahu
Matematik má v každém kole možnost provést **jednu akci** (pokud efekt právě vyložené karty neříká jinak):

- **Přidání:** Vložit kartu z ruky do tabule (L) a postupně poskládat výraz.
- **Odebrání / Výměna:** Odebrat vlastní kartu z tabule do odhozu *nebo* přeskládat stávající pořadí na tabuli.
- **Restart:** Vyhodit z tabule celý výraz L a začít v příštím kole znovu s čistým štítem.

Další podmínky:
- Na konci tahu musí mít hráč v ruce **maximálně 5 karet**, jinak přechází do režimu odhazování nadbytečných karet.
- Karty, co mají obsažený speciální efekt, vždy po vyložení nabídnou volbu: buď "Aktivovat efekt" a kartu odhodit, *nebo* kartu položit a navázat na plochu.

## 7. Závorky, exponenty a speciální sloty
1. Závorky se na desku umísťují ve dvou krocích: nejdřív levá, potom pravá. Uvnitř musí být alespoň jedno číslo nebo proměnná.
2. Některé karty automaticky vyžadují zadání **exponentu** (např. *a^b* nebo *odmocnina*). Exponent lze tvořit pouze číslem nebo proměnnou.
3. Speciální vysokoškolské karty mají tzv. sloty (okénka pro doplnění mezí integrálů aj.). Do okének lze vkládat pouze číselné hodnoty.

## 8. Ukončení a vyhlášení Q.E.D.
Když se hráči na levé straně rovnice podaří sestavit výraz s hodnotou stejnou jako je cíl vpravo (L = R), prohlásí **Q.E.D.** (přes tlačítko ve hře).

- ✅ **Správné řešení:** Pokud se matematická hodnota shoduje, hráč se stává vítězem a hra končí.
- ❌ **Chybný důkaz:** Pokud se objeví matematická chyba a výraz se nerovná cíli, hráč je penalizován. Musí odstranit všechny karty ze své plochy L do odhozu a hra pokračuje.

---

### Krátký přehled efektů jednotlivých karet

**Čísla a symboly:**
*   `0-9` - Dobrání 1 karty navíc v příštím tahu
*   `π` - Výměna 1 karty z tvé plochy L za vybranou kartu z L oponenta
*   `e` - Okamžité nahrazení cíle R libovolného hráče novým losem.
*   `y` / `x` - Následující hráč odhodí všechny číslice (`y`) / operace (`x`) z ruky.

**Základní operace:**
*   `+` - Následující hráč musí v příštím tahu použít operaci.
*   `-` - Odebere náhodnou kartu z ruky vybraného oponenta.
*   `*` - V příštím tahu dobíráš o 2 karty navíc.
*   `/` - Vidíš 3 vrchní karty balíčku a přerovnáš jejich pořadí.

**Pokročilé efekty:**
*   `a^b` - Následující hráč přeskakuje tah.
*   `sqrt` - Vybraný oponent odhodí celou ruku a dobere stejný počet nových karet.
*   `mod` - Cíl R cílového hráče se změní na zbytek po dělení číslem, které vyberete z ruky.
*   `n!` - Omezení: Následující hráč smí vyložit max. 1 kartu v příštím tahu.
*   `det` - Zruší všechny aktivní efekty u všech hráčů pro toto kolo.
*   `log` - V tomto tahu může aktivní hráč vyložit teoreticky nekonečno karet.
*   `nCk` - Prohodí cifry v cílové hodnotě R oponenta.

**Goniometrie (Ztráty a posuny):**
*   `sin / cos / tg / cotg` : Podle úhlu u goniometrie dochází k předání si ruky s celým stolem (po směru u hodnot typu `0, π/2...` nebo proti směru). Nebo nutí všechny oponenty ztratit dobrání 1 karty (úhly typu `π/6, π/4`).
