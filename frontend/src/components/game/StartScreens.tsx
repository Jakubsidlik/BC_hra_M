import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cardsDatabase } from "@/data/cardsDB";

// Použití BASE_URL pro správné načítání na GitHub Pages
const BASE = import.meta.env.BASE_URL;

type RulesCardType = 'number' | 'operator' | 'variable' | 'function' | 'syntax';

type RulesEffectEntry = {
  id: string;
  name: string;
  description: string;
  count: number;
  carriers: Array<{ symbol: string; type: RulesCardType; count: number }>;
};

const computeEffectsCatalog = (): { totalCards: number; effects: RulesEffectEntry[] } => {
  let totalCards = 0;
  const effectMap = new Map<string, RulesEffectEntry>();

  Object.entries(cardsDatabase).forEach(([symbol, cardData]) => {
    if (cardData.count <= 0) return;
    totalCards += cardData.count;

    const effects = [cardData.effects?.optionA, cardData.effects?.optionB];
    const uniqueEffectsOnCard = new Set<string>();

    effects.forEach((effect) => {
      if (!effect) return;
      if (uniqueEffectsOnCard.has(effect.id)) return;
      uniqueEffectsOnCard.add(effect.id);

      const existing = effectMap.get(effect.id);
      if (existing) {
        existing.count += cardData.count;
        existing.carriers.push({
          symbol,
          type: cardData.type as RulesCardType,
          count: cardData.count,
        });
        return;
      }

      effectMap.set(effect.id, {
        id: effect.id,
        name: effect.name,
        description: effect.description,
        count: cardData.count,
        carriers: [
          {
            symbol,
            type: cardData.type as RulesCardType,
            count: cardData.count,
          },
        ],
      });
    });
  });

  const effects = Array.from(effectMap.values())
    .map((effect) => ({
      ...effect,
      carriers: [...effect.carriers].sort((a, b) => a.symbol.localeCompare(b.symbol, 'cs')),
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'cs', { numeric: true }));

  return { totalCards, effects };
};

const rulesEffectsCatalog = computeEffectsCatalog();

// --- HLAVNÍ MENU ---
export function MainMenu({ onPlay, onRules }: { onPlay: () => void, onRules: () => void }) {
  const { isInstalled, triggerInstall } = usePWAInstall();

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-8 border-16px border-amber-950/90 relative overflow-hidden bg-cover bg-center shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]"
      style={{ backgroundImage: `url('${BASE}tabule.svg')` }}
    >
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
        <h1 
          className="text-7xl md:text-9xl font-black italic text-slate-100 tracking-tighter mb-4 opacity-95 text-center" 
          style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.3), -1px -1px 2px rgba(255,255,255,0.2)' }}
        >
          Math4fun
        </h1>
        
        <div className="mb-16 w-full max-w-lg transform hover:rotate-1 transition-transform duration-700">
          <img 
            src={`${BASE}sumace_kridou.png`} 
            alt="Matematický zápis křídou na tabuli" 
            className="w-full h-auto drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] pointer-events-none"
          />
        </div>

        <div className="flex flex-col gap-6 w-full max-w-sm">
          <Button 
            size="lg" 
            className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-100 font-black text-3xl px-12 py-10 rounded-2xl border-4 border-emerald-400/50 hover:border-emerald-400 transition-all shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]" 
            onClick={onPlay}
          >
            HRÁT
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="bg-black/40 backdrop-blur-md text-slate-300 border-2 border-slate-500/50 hover:bg-slate-800 hover:border-slate-400 hover:text-white font-bold text-xl px-12 py-8 rounded-2xl transition-all" 
            onClick={onRules}
          >
            PRAVIDLA HRY
          </Button>
        </div>
      </div>

      <div className="fixed bottom-6 left-6 z-20 text-slate-400 font-semibold text-sm leading-none">
        VERZE: 5.9.1
      </div>

      {/* Tlačítko Zástupce vpravo dole */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          onClick={triggerInstall}
          disabled={isInstalled}
          className="bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm px-4 py-2 rounded-lg border border-slate-500/50 flex items-center gap-3 shadow-lg transition-all hover:shadow-xl disabled:opacity-70"
          title={isInstalled ? 'Aplikace je nainstalována' : 'Přidat na plochu zařízení'}
        >
          <span>{isInstalled ? 'Nainstalovno ✓' : 'Zástupce'}</span>
          <img
            src={`${BASE}icons/icon-192.png`}
            alt="Zástupce"
            className="w-6 h-6 object-contain rounded"
          />
        </Button>
      </div>
    </div>
  );
}

export function GameModeSelection({ onSelect, onBack }: { onSelect: (mode: 'CLASSIC' | 'SHARED_GOAL') => void, onBack: () => void }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 border-16px border-amber-950/90 relative overflow-hidden bg-cover bg-center shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]"
      style={{ backgroundImage: `url('${BASE}tabule.svg')` }}
    >
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
        <h2 className="text-5xl md:text-7xl font-black italic text-slate-100 mb-12 opacity-95 text-center">
          Vyber herní režim
        </h2>

        <div className="flex flex-col items-center gap-6 w-full max-w-3xl mb-16 md:gap-8">
          <Button
            size="lg"
            className="w-[68%] mx-auto bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-100 font-black text-2xl py-9 rounded-3xl border-4 border-emerald-400/50 hover:border-emerald-400 transition-all shadow-xl md:w-full md:text-4xl md:py-10"
            onClick={() => onSelect('CLASSIC')}
          >
            KLASICKÝ
          </Button>
          <Button
            size="lg"
            className="w-[68%] mx-auto bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-100 font-black text-2xl py-9 rounded-3xl border-4 border-emerald-400/50 hover:border-emerald-400 transition-all shadow-xl md:w-full md:text-4xl md:py-10"
            onClick={() => onSelect('SHARED_GOAL')}
          >
            SPOLEČNÝ CÍL
          </Button>
        </div>

        <Button
          variant="ghost"
          className="text-slate-400 hover:text-white text-xl font-bold"
          onClick={onBack}
        >
          ← ZPĚT DO MENU
        </Button>
      </div>
    </div>
  );
}

// --- VÝBĚR REŽIMU ---
export function DifficultySelection({ onSelect, onBack }: { onSelect: (mode: 'TUTORIAL' | 'ZŠ' | 'SŠ' | 'VŠ' | 'CUSTOM') => void, onBack: () => void }) {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-8 border-16px border-amber-950/90 relative overflow-hidden bg-cover bg-center shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]"
      style={{ backgroundImage: `url('${BASE}tabule.svg')` }}
    >
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
        <h2 className="text-5xl md:text-7xl font-black italic text-slate-100 mb-12 opacity-95 text-center">
          Vyber obtížnost
        </h2>

        <div className="flex flex-col items-center gap-6 w-full max-w-3xl mb-16 md:gap-8">
          <Button
            size="lg"
            className="w-[45%] mx-auto bg-emerald-600/15 hover:bg-emerald-600/35 text-emerald-100 font-black text-2xl py-7 rounded-3xl border-4 border-emerald-400/40 hover:border-emerald-400 transition-all shadow-xl md:w-full md:text-4xl md:py-10"
            onClick={() => onSelect('TUTORIAL')}
          >
            TUTORIÁL
          </Button>
          <Button
            size="lg"
            className="w-[45%] mx-auto bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-100 font-black text-[2.15rem] py-14 rounded-3xl border-4 border-emerald-400/50 hover:border-emerald-400 transition-all shadow-xl md:hidden"
            onClick={() => onSelect('ZŠ')}
          >
            ZŠ
          </Button>
          <Button
            size="lg"
            className="w-[45%] mx-auto bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-100 font-black text-[2.15rem] py-14 rounded-3xl border-4 border-emerald-400/50 hover:border-emerald-400 transition-all shadow-xl md:hidden"
            onClick={() => onSelect('SŠ')}
          >
            SŠ
          </Button>
          <Button
            size="lg"
            className="w-[45%] mx-auto bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-100 font-black text-[2.15rem] py-14 rounded-3xl border-4 border-emerald-400/50 hover:border-emerald-400 transition-all shadow-xl md:hidden"
            onClick={() => onSelect('VŠ')}
          >
            VŠ
          </Button>
          <Button
            size="lg"
            className="w-[45%] mx-auto bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-100 font-black text-2xl py-14 rounded-3xl border-4 border-emerald-400/50 hover:border-emerald-400 transition-all shadow-xl md:hidden"
            onClick={() => onSelect('CUSTOM')}
          >
            VLASTNÍ
          </Button>
          <div className="hidden md:flex flex-row justify-center gap-5 w-full">
            {(['ZŠ', 'SŠ', 'VŠ', 'CUSTOM'] as const).map((mode) => (
              <Button 
                key={mode}
                size="lg" 
                className="flex-1 font-black text-5xl py-20 rounded-3xl border-4 transition-all shadow-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-100 border-emerald-400/50 hover:border-emerald-400"
                onClick={() => onSelect(mode)}
              >
                {mode === 'CUSTOM' ? 'VLASTNÍ' : mode}
              </Button>
            ))}
          </div>
        </div>

        <Button 
          variant="ghost" 
          className="text-slate-400 hover:text-white text-xl font-bold"
          onClick={onBack}
        >
          ← ZPĚT DO MENU
        </Button>
      </div>
    </div>
  );
}

export function CustomDifficultySetupScreen({
  gameMode,
  cardSelection,
  cardCounts,
  sharedGoalTurnsEnabled,
  sharedGoalTurns,
  selectedCardCount,
  onToggleCard,
  onCountChange,
  onToggleSharedGoalTurns,
  onSharedGoalTurnsChange,
  onConfirm,
  onBack,
}: {
  gameMode: 'CLASSIC' | 'SHARED_GOAL';
  cardSelection: Record<string, boolean>;
  cardCounts: Record<string, number>;
  sharedGoalTurnsEnabled: boolean;
  sharedGoalTurns: number;
  selectedCardCount: number;
  onToggleCard: (symbol: string) => void;
  onCountChange: (symbol: string, count: number) => void;
  onToggleSharedGoalTurns: (enabled: boolean) => void;
  onSharedGoalTurnsChange: (turns: number) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const naturalNumberSymbols = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  const zsOperatorSymbols = new Set(['+', '-', '*', '/', 'a^b', 'sqrt']);
  const ssOperatorSymbols = new Set(['mod', 'n!', 'log2', 'log3', 'log', 'nCk', 'det', 'skalar', 'vektor']);
  const vsOperatorSymbols = new Set(['d/dx', 'int', '∑', '∏', 'lim']);
  const isGoniometrySymbol = (symbol: string) => /^(sin|cos|tg|cotg)\(/.test(symbol);

  const cardRows = Object.entries(cardsDatabase)
    .filter(([, data]) => data.count > 0 && data.type !== 'syntax')
    .sort((a, b) => a[0].localeCompare(b[0], 'cs'))
    .map(([symbol, data]) => ({
      symbol,
      label: symbol,
      type: data.type,
    }));

  const categoryDefinitions: Array<{
    key: 'number' | 'variable' | 'operator' | 'function';
    title: string;
    subcategories: Array<{
      key: string;
      title: string;
      filter: (row: { symbol: string; label: string; type: string }) => boolean;
    }>;
  }> = [
    {
      key: 'number',
      title: 'Hodnoty a konstanty',
      subcategories: [
        { key: 'natural', title: 'Přirozená čísla', filter: (row) => naturalNumberSymbols.has(row.symbol) },
        { key: 'constants', title: 'Konstanty', filter: (row) => row.symbol === 'π' || row.symbol === 'e' },
        { key: 'goniometry', title: 'Goniometrie', filter: (row) => isGoniometrySymbol(row.symbol) },
        {
          key: 'other-number',
          title: 'Další hodnoty',
          filter: (row) =>
            row.type === 'number' &&
            !naturalNumberSymbols.has(row.symbol) &&
            row.symbol !== 'π' &&
            row.symbol !== 'e' &&
            !isGoniometrySymbol(row.symbol),
        },
      ],
    },
    {
      key: 'variable',
      title: 'Proměnné',
      subcategories: [
        { key: 'variables', title: 'Proměnné', filter: (row) => row.type === 'variable' },
      ],
    },
    {
      key: 'operator',
      title: 'Operace',
      subcategories: [
        { key: 'zs-ops', title: 'ZŠ operace', filter: (row) => zsOperatorSymbols.has(row.symbol) },
        { key: 'ss-ops', title: 'SŠ operace', filter: (row) => ssOperatorSymbols.has(row.symbol) },
        { key: 'vs-ops', title: 'VŠ operace', filter: (row) => vsOperatorSymbols.has(row.symbol) },
        {
          key: 'other-ops',
          title: 'Další operace',
          filter: (row) =>
            row.type === 'operator' &&
            !zsOperatorSymbols.has(row.symbol) &&
            !ssOperatorSymbols.has(row.symbol) &&
            !vsOperatorSymbols.has(row.symbol),
        },
      ],
    },
    {
      key: 'function',
      title: 'Funkce',
      subcategories: [
        { key: 'functions', title: 'Funkce', filter: (row) => row.type === 'function' },
      ],
    },
  ];

  const categories = categoryDefinitions
    .map((category) => {
      const rows = cardRows.filter((row) => row.type === category.key);
      if (rows.length === 0) {
        return null;
      }

      const subcategories = category.subcategories
        .map((subcategory) => ({
          key: subcategory.key,
          title: subcategory.title,
          rows: rows.filter(subcategory.filter),
        }))
        .filter((subcategory) => subcategory.rows.length > 0);

      return {
        key: category.key,
        title: category.title,
        rows,
        subcategories,
      };
    })
    .filter((category): category is NonNullable<typeof category> => category !== null);

  const handleCategorySelectionChange = (symbols: string[], shouldSelect: boolean) => {
    symbols.forEach((symbol) => {
      const isSelected = Boolean(cardSelection[symbol]);
      if (shouldSelect && !isSelected) {
        onToggleCard(symbol);
      }
      if (!shouldSelect && isSelected) {
        onToggleCard(symbol);
      }
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 border-16px border-amber-950/90 relative overflow-hidden bg-cover bg-center shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]"
      style={{ backgroundImage: `url('${BASE}tabule.svg')` }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl bg-black/40 backdrop-blur-md p-6 md:p-10 rounded-4xl border-4 border-white/10 shadow-xl overflow-y-auto max-h-[92vh]">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-black italic text-white tracking-tight">VLASTNÍ OBTÍŽNOST</h1>
          <p className="text-slate-300 mt-2 text-sm md:text-base">
            Vyber, které karty budou v dobíracím balíčku a kolikrát se v něm mají vyskytovat.
          </p>
        </div>

        {gameMode === 'SHARED_GOAL' && (
          <div className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
            <label className="inline-flex items-center gap-3 text-sm md:text-base font-bold text-emerald-200">
              <input
                type="checkbox"
                checked={sharedGoalTurnsEnabled}
                onChange={(e) => onToggleSharedGoalTurns(e.target.checked)}
                className="h-4 w-4"
              />
              Vlastní počet tahů na hráče
            </label>
            {sharedGoalTurnsEnabled && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-200">Počet tahů</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={sharedGoalTurns}
                  onChange={(e) => onSharedGoalTurnsChange(Number(e.target.value))}
                  className="w-24 rounded-lg border border-emerald-300/50 bg-black/30 px-3 py-2 text-white"
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          {categories.map((category) => {
            const rows = category.rows;
            const categorySymbols = rows.map(({ symbol }) => symbol);
            const allInCategorySelected = categorySymbols.every((symbol) => Boolean(cardSelection[symbol]));
            return (
              <section key={category.key} className="rounded-xl border border-white/10 bg-black/30 p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-lg md:text-2xl font-black text-emerald-300">{category.title}</h2>
                  <label className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-emerald-200 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={allInCategorySelected}
                      onChange={(e) => handleCategorySelectionChange(categorySymbols, e.target.checked)}
                      className="h-4 w-4"
                    />
                    Vybrat vše
                  </label>
                </div>
                <div className="space-y-4">
                  {category.subcategories.map((subcategory) => {
                    const subcategorySymbols = subcategory.rows.map(({ symbol }) => symbol);
                    const allInSubcategorySelected = subcategorySymbols.every((symbol) => Boolean(cardSelection[symbol]));
                    return (
                    <div key={`${category.key}-${subcategory.key}`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-xs md:text-sm uppercase tracking-[0.2em] text-slate-300">{subcategory.title}</h3>
                        <label className="inline-flex items-center gap-2 text-[11px] md:text-xs font-bold text-slate-300 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={allInSubcategorySelected}
                            onChange={(e) => handleCategorySelectionChange(subcategorySymbols, e.target.checked)}
                            className="h-4 w-4"
                          />
                          Vybrat vše
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {subcategory.rows.map(({ symbol, label }) => (
                          <div key={symbol} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(cardSelection[symbol])}
                              onChange={() => onToggleCard(symbol)}
                              className="h-4 w-4"
                            />
                            <span className="font-bold text-white min-w-16">{label}</span>
                            <input
                              type="number"
                              min={0}
                              max={999}
                              value={cardCounts[symbol] ?? 0}
                              onChange={(e) => onCountChange(symbol, Number(e.target.value))}
                              className="ml-auto w-24 rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-300">Vybraných druhů karet: <span className="font-black text-white">{selectedCardCount}</span></p>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={onBack}>← ZPĚT</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black"
              onClick={onConfirm}
              disabled={selectedCardCount <= 0}
            >
              POKRAČOVAT NA VÝBĚR HRÁČŮ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- OBRAZOVKA PRAVIDEL ---
export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div 
      className="min-h-screen flex flex-col items-center p-4 md:p-12 border-16px border-amber-950/90 relative bg-cover bg-center shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]"
      style={{ backgroundImage: `url('${BASE}tabule.svg')` }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="w-full max-w-7xl relative z-10 flex flex-col h-full overflow-hidden">
        <div className="text-center mb-6 border-b-2 border-slate-500/30 pb-4">
          <h1 className="text-5xl md:text-6xl font-black italic text-slate-100" style={{ textShadow: '1px 1px 3px rgba(255,255,255,0.2)' }}>PRAVIDLA</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 md:pr-6 text-slate-200 font-mono scrollbar-thin scrollbar-thumb-slate-600">
          
          <div className="bg-black/40 backdrop-blur-sm border border-slate-500/30 p-4 md:p-6 rounded-xl mb-10 italic text-slate-300 text-sm md:text-base">
            <span className="text-emerald-400 font-bold uppercase">Upozornění:</span> Tento herní systém respektuje zavedená matematická pravidla, definice, věty, logické důsledky a veškeré axiomatické systémy. Mechanika hry neumožňuje subjektivní interpretaci; vyžaduje se konstrukce výrazu v souladu s formální logikou. Ověřování běží lokálně přes Nerdamer s numerickým fallbackem v Math.js.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16">
            <div className="space-y-12">
              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">1. Představení</h3>
              <p className="leading-relaxed">
                Math4fun je karetní herní systém zaměřený na skladbu matematických výrazů pro 2–8 hráčů. Hráči z lokálních karet staví levou stranu rovnice <span className="text-emerald-300 font-bold">L</span> a snaží se ji logicky dotáhnout na předepsaný cíl <span className="text-yellow-300 font-bold">R</span>.
              </p>
              </section>

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">2. Cíl hry</h3>
              <p className="mb-4">Konstrukce formálně správné rovnosti L = R.</p>
              <ul className="space-y-3 text-sm md:text-base">
                <li className="flex gap-2">
                  <span className="text-emerald-400 font-bold">L:</span> 
                  <span>Levá strana; řetězec čísel, proměnných a operátorů skládáný na vaší tabuli.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-400 font-bold">R:</span> 
                  <span>Pravá strana; cílová hodnota vygenerovaná na začátku hry podle obtížnosti.</span>
                </li>
              </ul>
              </section>

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">3. Typy karet a operace</h3>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-lg border border-blue-500/30">
                    <span className="text-blue-400 font-bold">Čísla a konstanty:</span> 0 až 9, π, e 
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-slate-500/30">
                    <span className="text-slate-500 font-bold">Proměnné:</span> x, y 
                  </div>
                </div>
                
                <div className="bg-emerald-900/10 p-4 rounded-lg border border-emerald-500/20">
                  <p className="text-emerald-400 font-bold mb-2 uppercase text-xs">ZŠ balíček</p>
                  <p className="text-slate-300">Základní operace (+, -, *, /, a^b, √), čísla 0-9 a proměnné x/y. Konstanty π a e se v ZŠ nevyskytují.</p>
                </div>

                <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                  <p className="text-blue-400 font-bold mb-2 uppercase text-xs">SŠ balíček</p>
                  <p className="text-slate-300">Rozšíření ZŠ o pokročilé operace (logaritmy, goniometrii, kombinace, determinant, skalar/vektor, absolutní hodnota) a konstanty π/e.</p>
                </div>

                <div className="bg-purple-900/10 p-4 rounded-lg border border-purple-500/20">
                  <p className="text-purple-400 font-bold mb-2 uppercase text-xs">VŠ a Vlastní</p>
                  <p className="text-slate-300">VŠ navíc pracuje se zamčenou kartou jedné analytické operace (d/dx, int, ∑, ∏, lim). Vlastní obtížnost umožní ručně vybrat karty i jejich počty.</p>
                </div>
              </div>
              </section>

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">4. Příprava hry</h3>
              <ol className="list-decimal list-inside space-y-3 text-sm md:text-base">
                <li>Každý obdrží 3 páry závorek ((), [], {"{}"}) a 1 operátor ekvivalence (=).</li>
                <li>Zvolí se režim (Klasický / Společný cíl) a obtížnost (Tutoriál, ZŠ, SŠ, VŠ, Vlastní).</li>
                <li>Určí se cílová hodnota R podle zvoleného režimu a obtížnosti.</li>
                <li>Hráči si doberou 5 počátečních karet ze společného balíčku.</li>
                <li>Zahajující hráč začíná dobráním šesté karty na začátku tahu.</li>
              </ol>
              </section>

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">5. Průběh tahu a Akce</h3>
              <p className="text-sm italic mb-4">Matematik může v jednom kole z ruky vyložit maximálně 2 karty: 1 kartu čísla/proměnné/hodnoty a 1 kartu operace.</p>
              <p className="text-xs md:text-sm text-emerald-200/90 mb-4">Výjimka: po aktivaci efektu <strong>Neomezené hraní</strong> (karty log, log2, log3) může hráč v daném tahu vyložit z ruky libovolný počet karet.</p>
              <div className="space-y-4 text-sm md:text-base">
                <div className="border-l-4 border-emerald-500 pl-4 bg-emerald-500/10 py-2">
                  <p className="font-bold text-emerald-200">Přidání výpočtu</p>
                  <p className="text-xs md:text-sm text-slate-300">Vložit kartu z ruky do tabule L nebo poskládat rovnici.</p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4 bg-yellow-500/10 py-2">
                  <p className="font-bold text-yellow-200">Vyplnění Okénka (Slotu)</p>
                  <p className="text-xs md:text-sm text-slate-300">Speciální VŠ operátory a Sumy/Integrály mají okénka. Do nich se karty vkládají přímo přetažením na ně.</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4 bg-blue-500/10 py-2">
                  <p className="font-bold text-blue-200">Odebrání / Přemístění</p>
                  <p className="text-xs md:text-sm text-slate-300">Odebrat kartu do odhozu (spolu se všemi vnořenými dětmi a okénky) nebo změnit pořadí na tabuli.</p>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm md:text-base text-slate-200 bg-black/30 p-4 border border-slate-700/50 rounded-xl">
                <p><strong>Co je počítáno jako tah:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Vyložení karty z ruky do tabule (max 1 hodnota/proměnná + 1 operace za tah).</li>
                  <li>Vložení karty z ruky do slotu/okénka (počítá se stejně jako vyložení do tabule).</li>
                  <li>Odhoz jedné karty z tabule do odhozu (včetně vnořených karet).</li>
                  <li>Reset tabule: vyhození celého výrazu do odhozu (max 1 odhoz/reset akce z tabule za tah).</li>
                </ul>
                <p className="pt-1"><strong>Co není počítáno jako tah:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Položení páru závorek se nepočítá do limitu 1 hodnota + 1 operace (stále platí max 1 pár závorek za tah).</li>
                  <li>Přeskládání už vyložených karet uvnitř vlastní tabule.</li>
                  <li>Odhazování z ruky po stisku Ukončit tah pro splnění limitu max 5 karet.</li>
                </ul>
                <div className="space-y-2 pt-1">
                  <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2">
                    <p><strong>Pořadí akcí:</strong> pokud nejdřív vyložíš kartu z ruky, už v tom tahu nemůžeš provést odhoz/reset z tabule. Pokud nejdřív provedeš odhoz/reset z tabule, už v tom tahu nemůžeš vykládat z ruky.</p>
                  </div>
                  <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2">
                    <p><strong>Speciální chování závorek:</strong> přetažení jedné závorky z aktivního páru do odhozu nebo zpět do prostoru závorek vrátí celý pár do sady závorek v pořadí ()[].</p>
                  </div>
                  <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2">
                    <p><strong>Konec tahu:</strong> po stisku tlačítka Ukončit tah se aktivuje režim odhazování z ruky; předat tah lze až s maximálně 5 kartami v ruce.</p>
                  </div>
                  <div className="rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2">
                    {/* <p><strong>Efektové karty:</strong> nabídnou volbu aktivovat efekt (a kartu odhodit), nebo kartu pasivně položit na tabuli.</p> */}
                    <p><strong>Efektové karty:</strong> při vyložení můžeš aktivovat jejich efekt.</p>
                  </div>
                </div>
              </div>
              </section>

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">6. Závorky a Implicitní Násobení</h3>
              <div className="space-y-3 text-sm md:text-base border-l-4 border-slate-500 pl-4">
                <p><strong>Závorky:</strong> Umísťují se ve 2 krocích: nejdřív levá, potom pravá.</p>
                <p><strong>Limit závorek:</strong> V jednom tahu lze uzavřít maximálně 1 pár závorek.</p>
                <p><strong>Implicitní násobení:</strong> Pokud položíte číslo a proměnnou (2 a x) beze znaménka, tabule automaticky znásobkuje `2*x`.</p>
              </div>
              </section>

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">7. Logika Okének (Slotů)</h3>
              <div className="space-y-3 text-sm md:text-base border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-500/10">
                <p>Okénka (např. meze u integrálů, mocnitelé apod.) přijímají <strong>čísla, proměnné a i základní operátory (+, -, *, /).</strong></p>
                <p>Do slotu lze nakládat více karet – tvoří pak komplexnější formuli. (Až 5 číslic!)</p>
              </div>
              </section>

              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">8. Ukončení a Q.E.D.</h3>
                <p className="mb-4">Při formální rovnosti stiskni tlačítko Q.E.D.</p>
                <div className="bg-black/40 border border-slate-700 p-4 rounded-xl space-y-3 text-sm">
                  <p>✅ <span className="text-emerald-400 font-bold">Správné řešení:</span> Engine (Nerdamer + Math.js fallback) potvrdí shodu L s R. Vítězíte.</p>
                  <p>❌ <span className="text-red-400 font-bold">Chybný důkaz:</span> Hráčovo L se liší. Penalizace – L je pohlceno odpadem a hráč tak ztratí svůj dosavadní pokrok.</p>
                </div>
              </section>

            </div>

            <div className="space-y-12">
              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">Herní režimy</h3>
                <div className="space-y-4 text-sm md:text-base">
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <p className="font-bold uppercase tracking-wide text-emerald-300">Klasický režim</p>
                    <p className="mt-2 text-slate-200">
                      Každý hráč má vlastní cíl R. Vyhrává ten, kdo první prokáže rovnost L = R pomocí Q.E.D.
                    </p>
                  </div>
                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4">
                    <p className="font-bold uppercase tracking-wide text-yellow-300">Režim Společný cíl</p>
                    <p className="mt-2 text-slate-200">
                      Všichni hráči sdílí stejné R. Každý hráč má vlastní odpočet tahů (výchozí 20). Po vyčerpání všech odpočtů vyhrává nejmenší odchylka od společného cíle.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">Obtížnosti podle režimu</h3>
                <div className="space-y-4 text-sm md:text-base">
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <p className="font-bold text-emerald-300 mb-2">Klasický režim</p>
                    <ul className="space-y-2 text-slate-200">
                      <li><strong>Tutoriál:</strong> krátká ukázková hra s pevně daným cílem R = 11 a řízenými kroky.</li>
                      <li><strong>ZŠ:</strong> výsledek je číslo z intervalu -99..99, nebo člen -9x..9x / -9y..9y (bez 0x a 0y).</li>
                      <li><strong>SŠ:</strong> výsledek je z množiny -99..99, -99x..99x, -99y..99y, -9e..9e, -9π..9π; navíc může být √2, 2√2 až 9√2, √2/3, √2/4 a obecný zlomek a/b v základním tvaru (a = 1..9, b = 2..9), případně (a/b)π.</li>
                      <li><strong>VŠ:</strong> výsledek je z množiny -99..99, -99x..99x, -99y..99y, -99e..99e, -99π..99π.</li>
                      <li><strong>Vlastní:</strong> výsledky i karty se řídí tím, co si hráč navolí v konfiguraci. Pokud je vybraná jedna VŠ zamčená karta (int, d/dx, ∑, ∏, lim), dostanou ji všichni; pokud je jich vybraných více, každý hráč dostane náhodně jednu z nich.</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4">
                    <p className="font-bold text-yellow-300 mb-2">Režim Společný cíl</p>
                    <ul className="space-y-2 text-slate-200">
                      <li><strong>ZŠ:</strong> společný výsledek je -99..99, -9x..9x, -9y..9y (bez 0x a 0y).</li>
                      <li><strong>SŠ:</strong> společný výsledek je -99..99, -99x..99x, -99y..99y, -9e..9e, -9π..9π; navíc může být √2, 2√2 až 9√2, √2/3, √2/4 a obecný zlomek a/b v základním tvaru (a = 1..9, b = 2..9), případně (a/b)π.</li>
                      <li><strong>VŠ:</strong> společný výsledek je z množiny -99..99, -99x..99x, -99y..99y, -99e..99e, -99π..99π.</li>
                      <li><strong>Vlastní:</strong> společný cíl i zamčené VŠ karty se řídí vlastní konfigurací. Lze nastavit vlastní počet tahů na hráče; při této volbě zůstává odpočtová lišta kol po celou hru zelená.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">Efekty karet a jejich zastoupení</h3>
                <div className="bg-black/30 p-5 rounded-2xl border border-slate-700/50 shadow-lg space-y-4 text-sm md:text-base">
                  <p className="text-slate-300 text-xs">
                    Přehled níže uvádí všechny efekty ve hře: co dělají, které karty je nesou, jakého jsou typu a kolikrát jsou ve hře zastoupené.
                    Celkový počet všech karet v databázi hry: <span className="font-bold text-white">{rulesEffectsCatalog.totalCards}</span>.
                  </p>

                  <div className="space-y-3">
                    {rulesEffectsCatalog.effects.map((effect) => (
                      <div key={effect.id} className="rounded-lg border border-slate-600/40 bg-slate-800/40 p-3">
                        <div className="flex flex-wrap items-center gap-2 justify-between mb-1">
                          <p className="font-bold text-cyan-200">
                            {effect.name}
                          </p>
                          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-200">
                            {effect.count}x ve hře
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mb-2">{effect.description}</p>
                        <p className="text-xs text-slate-200">
                          <span className="font-semibold text-slate-100">Karty:</span>{' '}
                          {effect.carriers.map((carrier, index) => (
                            <span key={`${effect.id}-${carrier.symbol}-${index}`}>
                              {index > 0 ? ', ' : ''}
                              <span className="text-white">{carrier.symbol}</span>
                            </span>
                          ))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="h-20" /> 
        </div>

        <div className="mt-4 flex justify-center pt-4 pb-4">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white text-xl font-bold"
            onClick={onBack}
          >
            ← ZPĚT DO MENU
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- OBRAZOVKA PRO MOBILY ---
export function MobileWarningScreen() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-8 bg-cover bg-center text-center relative"
      style={{ backgroundImage: `url('${BASE}tabule.svg')` }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      <div className="relative z-10 bg-black/40 backdrop-blur-md p-8 rounded-3xl border-4 border-slate-500/50 shadow-2xl max-w-sm">
        <div className="text-6xl mb-6">🖥️</div>
        <h1 className="text-4xl font-black italic text-emerald-400 mb-4">Příliš malá plocha!</h1>
        <p className="text-xl text-slate-200 leading-relaxed font-mono">
          Math4fun vyžaduje velkou tabuli. 
          <br /><br />
          Prosím, otevřete hru na PC, aby se vám na stůl vešly všechny rovnice.
        </p>
      </div>
    </div>
  );
}