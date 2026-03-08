import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { GameCard } from '@/lib/effects';

interface IntegralSetupDialogProps {
  open: boolean;
  handCards: GameCard[];
  onSubmit: (lower: number | null, upper: number | null, usedCardIds: string[]) => void;
  onCancel: () => void;
}

export function IntegralSetupDialog({ open, handCards, onSubmit, onCancel }: IntegralSetupDialogProps) {
  const [lower, setLower] = useState<number | null>(null);
  const [upper, setUpper] = useState<number | null>(null);
  const [usedIds, setUsedIds] = useState<string[]>([]);

  const numberCards = handCards.filter(c => !isNaN(Number(c.symbol)));

  const handlePick = (card: GameCard) => {
    const val = Number(card.symbol);
    if (lower === null) {
      setLower(val);
      setUsedIds([...usedIds, card.id]);
    } else if (upper === null) {
      setUpper(val);
      setUsedIds([...usedIds, card.id]);
    } else {
      toast.warning("Obě meze už jsou obsazené!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="bg-slate-900 text-white border-2 border-slate-700 max-w-xs sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-emerald-400 font-chalk text-center">Nastavení Integrálu</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex items-center gap-4 text-3xl font-chalk">
            <div className="flex flex-col gap-2 items-center">
               <div className="w-16 h-16 border-2 border-dashed border-slate-500 flex items-center justify-center rounded-lg text-yellow-400 bg-black/50">
                 {upper !== null ? upper : '?'}
               </div>
               <div className="text-7xl text-center py-2 text-emerald-500">∫</div>
               <div className="w-16 h-16 border-2 border-dashed border-slate-500 flex items-center justify-center rounded-lg text-blue-400 bg-black/50">
                 {lower !== null ? lower : '?'}
               </div>
            </div>
          </div>
          
          <div className="text-sm text-slate-400 text-center px-4">
            Klikni na číslo z ruky pro vložení (první dolní, pak horní mez).<br/>
            Nebo nech prázdné a počítač doplní zbytek.
          </div>

          <div className="flex gap-2 overflow-x-auto max-w-full p-2 w-full justify-center">
            {numberCards.filter(c => !usedIds.includes(c.id)).map(c => (
              <Button key={c.id} variant="outline" className="w-14 h-16 text-2xl font-bold border-emerald-500/50 hover:bg-emerald-900/50" onClick={() => handlePick(c)}>
                {c.symbol}
              </Button>
            ))}
            {numberCards.length === 0 && <span className="text-slate-500 italic">Nemáš žádná čísla</span>}
          </div>

          <Button className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-500 font-bold" onClick={() => onSubmit(lower, upper, usedIds)}>
            Dokončit (Auto-doplnit)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}