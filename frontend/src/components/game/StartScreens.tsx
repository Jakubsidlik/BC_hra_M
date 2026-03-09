import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL;

// --- HLAVNÍ MENU ---
export function MainMenu({ onPlay, onRules }: { onPlay: () => void, onRules: () => void }) {
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
          Teorie křídy
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
    </div>
  );
}

// --- VÝBĚR REŽIMU ---
export function DifficultySelection({ onSelect, onBack }: { onSelect: (mode: 'ZŠ' | 'SŠ' | 'VŠ') => void, onBack: () => void }) {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-8 border-16px border-amber-950/90 relative overflow-hidden bg-cover bg-center shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]"
      style={{ backgroundImage: `url('${BASE}tabule.svg')` }}
    >
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
        <h2 className="text-5xl md:text-7xl font-black italic text-slate-100 mb-12 opacity-95 text-center">
          Vyber režim...
        </h2>

        <div className="flex flex-col md:flex-row gap-8 w-full max-w-3xl mb-16">
          {(['ZŠ', 'SŠ', 'VŠ'] as const).map((mode) => (
            <Button 
              key={mode}
              size="lg" 
              className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-100 font-black text-5xl py-20 rounded-3xl border-4 border-emerald-400/50 hover:border-emerald-400 transition-all shadow-xl" 
              onClick={() => onSelect(mode)}
            >
              {mode}
            </Button>
          ))}
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
            <span className="text-emerald-400 font-bold uppercase">Upozornění:</span> Tento herní systém respektuje zavedená matematická pravidla, definice, věty, logické důsledky a veškeré axiomatické systémy. Mechanika hry neumožňuje subjektivní interpretaci; vyžaduje se konstrukce výrazu v souladu s formální logikou.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16">
            
            <div className="space-y-12">
              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">1. Představení</h3>
                <p className="leading-relaxed">
                  Teorie křídy je karetní herní systém zaměřený na skladbu matematických výrazů pro 2–8 hráčů. Matematika je zde vyobrazena jako živý, nekonečně variabilní a otevřený systém.
                </p>
              </section>

              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">2. Cíl hry</h3>
                <p className="mb-4">Konstrukce formálně správné rovnosti L = R.</p>
                <ul className="space-y-3 text-sm md:text-base">
                  <li className="flex gap-2">
                    <span className="text-emerald-400 font-bold">L:</span> 
                    <span>Levá strana; dynamický řetězec čísel, operátorů a proměnných.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-400 font-bold">R:</span> 
                    <span>Pravá strana; cílový parametr pevně stanovený na začátku hry.</span>
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">3. Typy karet a operace</h3>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3 rounded-lg border border-blue-500/30">
                      <span className="text-blue-400 font-bold">Čísla a konstanty:</span> 0 až 9, Ludolfovo číslo π, Eulerovo číslo e 
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-slate-500/30">
                      <span className="text-slate-500 font-bold">Proměnné:</span> x, y 
                    </div>
                  </div>
                  
                  <div className="bg-emerald-900/10 p-4 rounded-lg border border-emerald-500/20">
                    <p className="text-emerald-400 font-bold mb-2 uppercase text-xs">Aritmetické operátory ZŠ</p>
                    <p className="text-slate-300">Součet (+), Rozdíl (-), Součin (*), Podíl (:).</p>
                  </div>

                  <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                    <p className="text-blue-400 font-bold mb-2 uppercase text-xs">Pokročilé funkce SŠ</p>
                    <p className="text-slate-300">Mocnina (a^b), Odmocnina, Logaritmy, Faktoriál (n!), Goniometrie (sin, cos, tan, cot), Kombinatorika.</p>
                  </div>

                  <div className="bg-purple-900/10 p-4 rounded-lg border border-purple-500/20">
                    <p className="text-purple-400 font-bold mb-2 uppercase text-xs">Analytické operátory VŠ</p>
                    <p className="text-slate-300">Derivace, Určitý integrál, Modulo, Diskrétní sumace, Sekvenční produkt, Limita, Determinant.</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">4. Vizuál a Ikony</h3>
                <div className="space-y-3 bg-black/20 p-5 rounded-xl text-sm md:text-base">
                  <p className="text-xs text-slate-400 mb-2 italic text-center">Barva okraje: Modrá-číslo, Oranžová-operace, Černá-závorka, Šedá-proměnná.</p>
                  <p>👤 <span className="text-white font-bold">Hlava:</span> Platí pro hráče samotného.</p>
                  <p>➔👤 <span className="text-white font-bold">Postava:</span> Cílí na následujícího hráče.</p>
                  <p>✨👤 <span className="text-white font-bold">Postava:</span> Cílí na libovolného hráče.</p>
                  <p>👥 <span className="text-white font-bold">Více postav:</span> Všichni kromě aktivního hráče.</p>
                </div>
              </section>
            </div>

            <div className="space-y-12">
              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">5. Příprava hry</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm md:text-base">
                  <li>Každý obdrží 3 páry závorek ((), [], {"{}"}) a 1 operátor ekvivalence (=).</li>
                  <li>Určí se hodnota R dle zvolené obtížnosti (ZŠ, SŠ, VŠ).</li>
                  <li>Každý si dobere 5 počátečních karet.</li>
                  <li>Zahajující hráč začíná dobráním šesté karty.</li>
                </ol>
              </section>

              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">6. Průběh tahu</h3>
                <p className="text-sm italic mb-4">Matematik má v každém kole možnost provést jednu operaci:</p>
                <div className="space-y-4 text-sm md:text-base">
                  <div className="border-l-4 border-emerald-500 pl-4">
                    <p className="font-bold text-white">Přidání</p>
                    <p className="text-xs md:text-sm">Vložit kartu a přeskládat dosavadní výraz L tak, aby dával smysl.</p>
                  </div>
                  <div className="border-l-4 border-blue-400 pl-4">
                    <p className="font-bold text-white">Odebrání / Výměna</p>
                    <p className="text-xs md:text-sm">Vzít kartu zpět do ruky nebo ji nahradit jinou z ruky.</p>
                  </div>
                  <div className="border-l-4 border-red-500 pl-4">
                    <p className="font-bold text-white">Restart</p>
                    <p className="text-xs md:text-sm">Vyhodit celý výraz L a začít v příštím kole znovu.</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">7. Ukončení a Q.E.D.</h3>
                <p className="mb-4">Při dosažení rovnosti L = R vyslovte Quod Erat Demonstrandum.</p>
                <div className="bg-black/20 p-4 rounded-xl space-y-3 text-sm">
                  <p>✅ <span className="text-emerald-400 font-bold">Správné řešení:</span> Hráč se stává vítězem a hra končí.</p>
                  <p>❌ <span className="text-red-400 font-bold">Chybný důkaz:</span> Hráč odstraní všechny karty ze své plochy L a hra pokračuje.</p>
                </div>
              </section>

              <div className="bg-emerald-900/40 backdrop-blur-sm p-6 border border-emerald-500/30 rounded-2xl text-center">
                <h4 className="font-bold mb-2 text-emerald-300 uppercase text-xs tracking-widest">Obsah balení</h4>
                <p className="text-[10px] md:text-xs text-slate-300">
                  Celkem 444 karet  | 230 Číslic a konstant  | 124 Operací  | 56 Fixních karet 
                </p>
              </div>
            </div>
          </div>

          <div className="h-20" /> 
        </div>

        <div className="mt-4 flex justify-center pt-4 border-t-4 border-slate-500/30 bg-black/20 backdrop-blur-sm rounded-t-3xl pb-2">
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
          Teorie křídy vyžaduje velkou tabuli. 
          <br /><br />
          Prosím, otevřete hru na PC, aby se vám na stůl vešly všechny rovnice.
        </p>
      </div>
    </div>
  );
}