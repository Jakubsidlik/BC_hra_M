// @ts-nocheck
// ensure JSX intrinsic elements are recognized (workaround for language-server glitches)
import * as React from 'react';
import type { JSX } from 'react/jsx-runtime';

import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DifficultyMode } from '@/lib/gameHelpers';
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { Badge } from "@/components/ui/badge";

// Importy Hooku a dat
import { useGameEngine } from '@/hooks/useGameEngine';
import { cardsDatabase } from '@/data/cardsDB';

// Importy Komponent
import { HandCard, BoardArea } from '@/components/game/Cards';
import { 
  EffectDialog, 
  TargetingOverlay, 
  HandoffScreen, 
  MinigameDialog, 
  VictoryScreen, 
  BracketOverlay 
} from '@/components/game/GameUI';
import { SetupScreen } from '@/components/game/SetupScreen';
import { MainMenu, RulesScreen, DifficultySelection } from '@/components/game/StartScreens';
import { IntegralSetupDialog } from '@/components/game/IntegralSetupDialog';
import { DiscardZone } from '@/components/game/DiscardZone';

export default function App() {
  // 1. NAČTENÍ LOGIKY Z CUSTOM HOOKU
  const { state, actions } = useGameEngine();

  // 2. SENZORY PRO DOTYK A MYŠ (Optimalizace pro mobil i PC)
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  // 3. VYKRESLOVÁNÍ OBRAZOVEK PODLE FÁZE HRY
  if (state.gamePhase === 'MENU') return <MainMenu onPlay={() => actions.setGamePhase('PICK_MODE')} onRules={() => actions.setGamePhase('RULES')} />;
  if (state.gamePhase === 'RULES') return <RulesScreen onBack={() => actions.setGamePhase('MENU')} />;
  if (state.gamePhase === 'PICK_MODE') return <DifficultySelection onSelect={(m) => { actions.setDifficulty(m); actions.setGamePhase('SETUP'); }} onBack={() => actions.setGamePhase('MENU')} />;
  if (state.gamePhase === 'SETUP') return <SetupScreen onStart={actions.handleStartGame} />;

  // 4. HLAVNÍ HRACÍ PLOCHA
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) return null;

  return (
    // @ts-ignore
    <DndContext onDragEnd={actions.handleDragEnd} sensors={sensors}>
      <Toaster position="top-center" richColors />
      
      {/* --- OVERLAY VRSTVY (Vítězství, Předání, Minihry) --- */}
      <VictoryScreen winner={state.winner} onReset={() => window.location.reload()} />
      <HandoffScreen 
        isHandoff={state.isHandoff} 
        players={state.players} 
        nextIndex={(state.currentPlayerIndex + state.playDirection + state.players.length) % state.players.length} 
        onReveal={actions.nextTurn} 
      />

      {state.integralSetup && (
        <IntegralSetupDialog 
          open={!!state.integralSetup} 
          handCards={currentPlayer.hand}
          onSubmit={actions.handleIntegralSubmit}
          onCancel={() => actions.setIntegralSetup(null)}
        />
      )}

      <MinigameDialog 
        minigameMode={state.minigameMode} 
        onPick={(id: string) => {
          if (!state.minigameMode || !state.pendingEffect) return;
          if (id !== 'CANCEL') {
            const card = state.minigameMode.cards.find(c => c.id === id);
            if (card) {
               actions.setPlayers(prev => {
                 const p = JSON.parse(JSON.stringify(prev));
                 p[state.currentPlayerIndex].hand.push({
                    ...card, id: `mini-${card.symbol}-${Date.now()}-${Math.random().toString(36).substring(2,6)}`
                 });
                 return p;
               });
            }
          }
          actions.addCardToGameState(state.pendingEffect.card, state.pendingEffect.targetId);
          actions.setMinigameMode(null);
        }} 
      />

      <BracketOverlay 
        bracketMode={state.bracketMode} 
        players={state.players} 
        currentPlayerId={currentPlayer.id} 
        handleBracketClick={actions.handleBracketClick} 
        onCancel={() => actions.setBracketMode(null)} 
      />
      
      <TargetingOverlay 
  targetingMode={state.targetingMode} 
  pendingEffect={state.pendingEffect} 
  players={state.players} 
  handleBoardCardClick={(id: string) => { // 'id' už nebude svítit, protože ho použijeme níže
    if (!state.targetingMode || !state.pendingEffect) return;

    // PŘIDÁNO 'id' JAKO TŘETÍ PARAMETR
    actions.handleEffectChoice('ACTIVATE', state.targetingMode.targetPlayerId, id);
    
    actions.setTargetingMode(null);
  }} 
  onCancel={() => { actions.setTargetingMode(null); actions.setPendingEffect(null); }} 
/>

      {/* --- HLAVNÍ UI HRY --- */}
      <div className={`min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 transition-colors duration-700 ${currentPlayer.theme} overflow-x-hidden relative`}>
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        
        <div className="max-w-8xl mx-auto relative z-10">
          
          {/* HLAVIČKA */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-3 md:gap-4 lg:gap-6 mb-4 md:mb-8 lg:mb-12">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black italic mix-blend-difference text-white tracking-tighter uppercase font-chalk drop-shadow-lg">
                Teorie křídy
              </h1>
              <div className="flex gap-3 items-center mt-1 md:mt-2 justify-center lg:justify-start">
                <Badge variant="outline" className="text-emerald-400 border-emerald-400/50 uppercase text-[8px] md:text-[10px] tracking-widest">
                  {state.difficulty}
                </Badge>
                <p className="text-white/70 font-mono italic text-xs md:text-sm">Matematik: {currentPlayer.name}</p>
              </div>
            </div>
            
            <div className="flex gap-2 md:gap-4 w-full lg:w-auto">
              <Button 
                size="lg" 
                className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-500 font-bold h-10 md:h-14 lg:h-16 px-4 md:px-8 lg:px-10 text-sm md:text-lg lg:text-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] border-b-4 border-emerald-800" 
                onClick={actions.checkMathEngine}
                disabled={state.hasModifiedBoardThisTurn}
              >
                Q.E.D.
              </Button>
              <Button 
                size="lg" 
                variant="secondary" 
                className="flex-1 lg:flex-none h-10 md:h-14 lg:h-16 px-4 md:px-8 lg:px-10 font-bold text-sm md:text-lg lg:text-xl border-b-4 border-slate-400" 
                onClick={actions.handleEndTurn}
              >
                {state.isDiscarding ? "HOTOVO" : "UKONČIT TAH"}
              </Button>
            </div>
          </div>

          {/* HERNÍ PLOCHA A SYNTAX BAR */}
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-10 mb-36 md:mb-44 lg:mb-52">
            <div className="bg-black/40 backdrop-blur-md rounded-3xl lg:rounded-[2.5rem] p-4 md:p-6 lg:p-8 flex flex-row lg:flex-col items-center justify-center gap-3 md:gap-4 lg:gap-6 border-2 border-white/10 shadow-[inset_0_2px_20px_rgba(0,0,0,0.4)] min-h-[120px] md:min-h-[160px] lg:min-h-[200px]">
              {currentPlayer.syntax.map(c => (
                <div key={c.id} className="relative shrink-0 w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40">
                </div>
              ))}
            </div>
            
            <div className="flex-1">
               <BoardArea 
                 id="main-board" 
                 cards={currentPlayer.board} 
                 targetR={currentPlayer.targetR} 
                 playerTheme={currentPlayer.theme} 
                 absoluteValue={currentPlayer.status?.absoluteValue} 
               />
            </div>
          </div>

          {/* RUKA HRÁČE A HŘBITOV */}
          <div 
            key={`hand-container-p-${state.currentPlayerIndex}`} 
            className="fixed bottom-0 left-0 w-full lg:bottom-6 xl:bottom-10 lg:left-1/2 lg:-translate-x-1/2 lg:w-auto flex items-end gap-2 md:gap-3 lg:gap-4 bg-black/85 backdrop-blur-xl p-2 sm:p-3 md:p-5 lg:p-8 lg:rounded-3xl xl:rounded-[3.5rem] border-t-2 lg:border-2 border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] z-40 overflow-x-auto scrollbar-hide"
          >
            <DiscardZone 
              discardCount={state.discardPile.length} 
              deckCount={state.deck.length} 
              isDiscarding={state.isDiscarding} 
            />
            
            <div className="flex h-32 sm:h-36 md:h-42 lg:h-48 items-center flex-1 px-2 md:px-3 min-w-[320px]">
              <div className={`flex -space-x-6 sm:-space-x-8 md:-space-x-10 lg:-space-x-12 hover:space-x-2 md:hover:space-x-3 transition-all duration-500 items-end ${state.isDiscarding ? 'p-2 ring-1 ring-red-500/20 rounded-xl' : ''}`}>
                {currentPlayer.hand.map((c, i) => (
                  <HandCard 
                    key={c.id} 
                    card={c} 
                    index={i} 
                    total={currentPlayer.hand.length} 
                    isDiscarding={state.isDiscarding} 
                    onDiscard={actions.handleDiscard} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIALOG PRO VÝBĚR EFEKTU */}
      <EffectDialog 
        open={!!state.pendingEffect && !state.targetingMode && !state.minigameMode} 
        effectStep={state.effectStep} 
        pendingEffect={state.pendingEffect} 
        players={state.players} 
        currentPlayerId={currentPlayer.id} 
        handleEffectClick={() => {
          if (!state.pendingEffect) return;
          const effect = cardsDatabase[state.pendingEffect.card.symbol]?.effects?.optionA;
          
          if (effect?.target === 'OPPONENT' || effect?.target === 'ANY') { 
            actions.setChosenEffectChoice('ACTIVATE'); 
            actions.setEffectStep('CHOOSE_TARGET'); 
          } else {
            actions.handleEffectChoice('ACTIVATE');
          }
        }} 
        handleEffectChoice={actions.handleEffectChoice} 
        setEffectStep={actions.setEffectStep} 
        onClose={() => { 
          actions.setPendingEffect(null); 
          actions.setEffectStep('CHOOSE_EFFECT'); 
          actions.setChosenEffectChoice(null);
        }} 
      />

    </DndContext>
  );
}