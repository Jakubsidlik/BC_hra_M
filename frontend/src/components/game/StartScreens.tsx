import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

// Použití BASE_URL pro správné načítání na GitHub Pages
const BASE = import.meta.env.BASE_URL;

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

// --- VÝBĚR REŽIMU ---
export function DifficultySelection({ onSelect, onBack }: { onSelect: (mode: 'TUTORIAL' | 'ZŠ' | 'SŠ' | 'VŠ') => void, onBack: () => void }) {
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
          <div className="hidden md:flex flex-row justify-center gap-5 w-full">
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
                Math4fun je karetní herní systém zaměřený na skladbu matematických výrazů pro 2–8 hráčů. Hráči z karet staví levou stranu rovnice L a snaží se ji dostat na předepsaný cíl R.
              </p>
              </section>

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">2. Cíl hry</h3>
              <p className="mb-4">Konstrukce formálně správné rovnosti L = R.</p>
              <ul className="space-y-3 text-sm md:text-base">
                <li className="flex gap-2">
                  <span className="text-emerald-400 font-bold">L:</span> 
                  <span>Levá strana; řetězec čísel, proměnných a operátorů skládáný na tabuli.</span>
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
                  <p className="text-emerald-400 font-bold mb-2 uppercase text-xs">Aritmetické operátory ZŠ</p>
                  <p className="text-slate-300">Součet (+), Rozdíl (-), Součin (*), Podíl (:).</p>
                </div>

                <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                  <p className="text-blue-400 font-bold mb-2 uppercase text-xs">Pokročilé funkce SŠ</p>
                  <p className="text-slate-300">Mocnina (a^b), Odmocnina, Logaritmy (log2, log3, log10), Faktoriál (n!), Goniometrie (sin, cos, tan, cot), Kombinatorika.</p>
                </div>

                <div className="bg-purple-900/10 p-4 rounded-lg border border-purple-500/20">
                  <p className="text-purple-400 font-bold mb-2 uppercase text-xs">Analytické operátory VŠ</p>
                  <p className="text-slate-300">Derivace, Integrál, Diskrétní sumace, Sekvenční produkt, Limita, Determinant.</p>
                </div>
                <div className="bg-black/30 p-4 rounded-lg border border-white/10">
                  <p className="text-slate-300">
                    Některé karty mají herní efekty (bonusy, blokace, výměny). Efekty VŠ karet Integrál, Derivace, Sumace a Sekvenční produkt jsou vypnuté a slouží jen jako operátory.
                  </p>
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

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">5. Příprava hry</h3>
              <ol className="list-decimal list-inside space-y-3 text-sm md:text-base">
                <li>Každý obdrží 3 páry závorek ((), [], {"{}"}) a 1 operátor ekvivalence (=).</li>
                <li>Určí se hodnota R dle zvolené obtížnosti (ZŠ, SŠ, VŠ).</li>
                <li>Každý si dobere 5 počátečních karet.</li>
                <li>Zahajující hráč začíná dobráním šesté karty.</li>
                <li>Ve VŠ režimu dostane každý hráč na tabuli jednu speciální kartu (Integrál, Derivace, Sumace nebo Sekvenční produkt), která nejde odhodit.</li>
              </ol>
              </section>

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">6. Průběh tahu</h3>
              <p className="text-sm italic mb-4">Matematik má v každém kole možnost provést jednu akci (pokud efekt neříká jinak):</p>
              <div className="space-y-4 text-sm md:text-base">
                <div className="border-l-4 border-emerald-500 pl-4">
                  <p className="font-bold text-white">Přidání</p>
                  <p className="text-xs md:text-sm">Vložit kartu z ruky do tabule L a poskládat výraz.</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <p className="font-bold text-white">Odebrání / Výměna</p>
                  <p className="text-xs md:text-sm">Odebrat vlastní kartu z tabule do odhozu nebo přeskládat pořadí na tabuli.</p>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <p className="font-bold text-white">Restart</p>
                  <p className="text-xs md:text-sm">Vyhodit celý výraz L a začít v příštím kole znovu (VŠ speciální karta zůstává).</p>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm md:text-base">
                <p>Na konci tahu musí mít hráč v ruce maximálně 5 karet, jinak přechází do režimu odhazování.</p>
                <p>Většina karet s efektem nabídne volbu: aktivovat efekt, nebo kartu položit na tabuli.</p>
              </div>
              </section>

              <section>
              <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">7. Závorky, exponenty a speciální sloty</h3>
              <div className="space-y-3 text-sm md:text-base">
                <p>Závorky se umísťují ve dvou krocích: nejdřív levá, potom pravá. Uvnitř musí být alespoň jedno číslo nebo proměnná.</p>
                <p>Některé karty umožňují exponent (např. a^b, odmocnina). Exponent lze přidat jen číslem nebo proměnnou.</p>
                <p>Speciální VŠ karty mají okénka pro doplnění. Do okének lze vkládat pouze čísla.</p>
              </div>
              </section>

              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">8. Ukončení a Q.E.D.</h3>
                <p className="mb-4">Při dosažení rovnosti L = R použij tlačítko Q.E.D. pro ověření.</p>
                <div className="bg-black/20 p-4 rounded-xl space-y-3 text-sm">
                  <p>✅ <span className="text-emerald-400 font-bold">Správné řešení:</span> Hráč se stává vítězem a hra končí.</p>
                  <p>❌ <span className="text-red-400 font-bold">Chybný důkaz:</span> Hráč odstraní všechny karty ze své plochy L a hra pokračuje.</p>
                </div>
              </section>

              <div className="bg-emerald-900/40 backdrop-blur-sm p-6 border border-emerald-500/30 rounded-2xl text-center">
                <h4 className="font-bold mb-2 text-emerald-300 uppercase text-xs tracking-widest">Poznámka</h4>
                <p className="text-[10px] md:text-xs text-slate-300">
                  Pravidla odpovídají aktuální implementaci hry v aplikaci.
                </p>
              </div>
            </div>

            <div className="space-y-12">
              <section>
                <h3 className="text-3xl font-bold text-emerald-400 border-b border-emerald-400/30 pb-2 mb-4 italic">Efekty karet</h3>
              <div className="bg-black/20 p-4 rounded-xl space-y-4 text-sm md:text-base">
                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">Čísla 0–9</p>
                  <p>Dobrání 1 karty navíc v příštím tahu.</p>
                </div>
                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">π</p>
                  <p>Výměna 1 karty z tvé plochy L za vybranou kartu z L oponenta.</p>
                </div>
                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">e</p>
                  <p>Okamžité nahrazení cíle R libovolného hráče novým losem.</p>
                </div>
                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">y</p>
                  <p>Následující hráč odhodí všechny číslice z ruky.</p>
                </div>
                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">x</p>
                  <p>Následující hráč odhodí všechny operace z ruky.</p>
                </div>

                <div>
                  <p className="text-emerald-400 font-bold uppercase text-xs">+</p>
                  <p>Následující hráč musí v příštím tahu použít operaci.</p>
                </div>
                <div>
                  <p className="text-emerald-400 font-bold uppercase text-xs">-</p>
                  <p>Odebere náhodnou kartu z ruky vybraného oponenta.</p>
                </div>
                <div>
                  <p className="text-emerald-400 font-bold uppercase text-xs">*</p>
                  <p>V příštím tahu dobíráš o 2 karty navíc.</p>
                </div>
                <div>
                  <p className="text-emerald-400 font-bold uppercase text-xs">/</p>
                  <p>Vidíš 3 vrchní karty balíčku a přerovnáš jejich pořadí.</p>
                </div>

                <div>
                  <p className="text-blue-400 font-bold uppercase text-xs">a^b</p>
                  <p>Následující hráč přeskakuje svůj tah.</p>
                </div>
                <div>
                  <p className="text-blue-400 font-bold uppercase text-xs">sqrt</p>
                  <p>Vybraný oponent odhodí celou ruku a dobere stejný počet karet.</p>
                </div>
                <div>
                  <p className="text-blue-400 font-bold uppercase text-xs">mod</p>
                  <p>R cílového hráče se změní na R mod vybrané číslo z ruky.</p>
                </div>
                <div>
                  <p className="text-blue-400 font-bold uppercase text-xs">n!</p>
                  <p>Omezení: následující hráč smí v příštím tahu vyložit max 1 kartu.</p>
                </div>

                <div>
                  <p className="text-purple-400 font-bold uppercase text-xs">d/dx</p>
                  <p>Efekt je vypnutý; karta slouží pouze jako operátor.</p>
                </div>
                <div>
                  <p className="text-purple-400 font-bold uppercase text-xs">int</p>
                  <p>Efekt je vypnutý; karta slouží pouze jako operátor.</p>
                </div>
                <div>
                  <p className="text-purple-400 font-bold uppercase text-xs">∑</p>
                  <p>Efekt je vypnutý; karta slouží pouze jako operátor.</p>
                </div>
                <div>
                  <p className="text-purple-400 font-bold uppercase text-xs">∏</p>
                  <p>Efekt je vypnutý; karta slouží pouze jako operátor.</p>
                </div>
                <div>
                  <p className="text-purple-400 font-bold uppercase text-xs">lim</p>
                  <p>Efekt je vypnutý; karta slouží pouze jako operátor.</p>
                </div>
                <div>
                  <p className="text-purple-400 font-bold uppercase text-xs">det</p>
                  <p>Zruší všechny aktivní efekty u všech hráčů.</p>
                </div>

                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">log2</p>
                  <p>Můžeš v tomto tahu vyložit libovolný počet karet.</p>
                </div>
                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">nCk</p>
                  <p>Prohodí cifry v R cílového oponenta.</p>
                </div>

                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">sin</p>
                  <p>
                    Předání po směru: sin(2π), sin(π/2), sin(π), sin(3π/2).
                    Ztráta dobírání: sin(π/6), sin(π/4), sin(π/3) — všichni soupeři doberou o 1 kartu méně v příštím tahu.
                  </p>
                </div>
                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">cos</p>
                  <p>
                    Předání proti směru: cos(2π), cos(π/2), cos(π), cos(3π/2).
                    Ztráta dobírání: cos(π/6), cos(π/4), cos(π/3) — všichni soupeři doberou o 1 kartu méně v příštím tahu.
                  </p>
                </div>
                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">tg</p>
                  <p>
                    Předání po směru: tg(π/4), tg(π).
                    Ztráta dobírání: tg(π/6), tg(π/3) — všichni soupeři doberou o 1 kartu méně v příštím tahu.
                  </p>
                </div>
                <div>
                  <p className="text-emerald-300 font-bold uppercase text-xs">cotg</p>
                  <p>
                    Předání proti směru: cotg(π/4), cotg(π/2).
                    Ztráta dobírání: cotg(π/6), cotg(π/3) — všichni soupeři doberou o 1 kartu méně v příštím tahu.
                  </p>
                </div>
              </div>
              </section>
            </div>
          </div>

          <div className="h-20" /> 
        </div>

        <div className="mt-4 flex justify-center pt-4 pb-2">
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