
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { Toaster } from "sonner";

// Importy Hooku a dat
import { useGameEngine } from '@/hooks/useGameEngine';
import { cardsDatabase } from '@/data/cardsDB';
import { useDeviceType } from '@/hooks/useDeviceType';

// Importy Komponent
import { 
  EffectDialog, 
  TargetingOverlay, 
  HandoffScreen, 
  MinigameDialog, 
  VictoryScreen,
  DeckPreviewDialog,
  ModuloDialog
} from '@/components/game/GameUI';
import { SetupScreen } from '@/components/game/SetupScreen';
import { MainMenu, RulesScreen, DifficultySelection } from '@/components/game/StartScreens';
import { IntegralSetupDialog } from '@/components/game/IntegralSetupDialog';
import { MobileGameLayout } from '@/components/game/MobileGameLayout';
import { TabletGameLayout } from '@/components/game/TabletGameLayout';
import { DesktopGameLayout } from '@/components/game/DesktopGameLayout';

export default function App() {
  // 1. NAČTENÍ LOGIKY Z CUSTOM HOOKU
  const { state, actions } = useGameEngine();
  const deviceType = useDeviceType();

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
    <DndContext onDragEnd={actions.handleDragEnd} sensors={sensors}>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "'Merienda', cursive",
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.2)',
          },
          classNames: {
            toast:    'text-white',
            error:    '!bg-red-600',
            success:  '!bg-emerald-600',
            info:     '!bg-blue-600',
            warning:  '!bg-red-600',
            icon:     'text-white',
          },
        }}
      />
      
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


      <DeckPreviewDialog
        open={!!state.deckPreviewMode}
        deck={state.deck}
        onConfirm={actions.handleDeckPreviewConfirm}
        onCancel={() => actions.setDeckPreviewMode(null)}
      />

      <ModuloDialog
        open={!!state.moduloMode}
        hand={currentPlayer.hand}
        onSelect={actions.handleModuloSelect}
        onCancel={() => actions.setModuloMode(null)}
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
      {deviceType === 'phone' ? (
        <MobileGameLayout
          currentPlayer={currentPlayer}
          state={state}
          actions={{
            checkMathEngine: actions.checkMathEngine,
            handleEndTurn: actions.handleEndTurn,
            handleDiscard: actions.handleDiscard,
            cancelBracketMode: actions.cancelBracketMode,
          }}
        />
      ) : deviceType === 'tablet' ? (
        <TabletGameLayout
          currentPlayer={currentPlayer}
          state={state}
          actions={{
            checkMathEngine: actions.checkMathEngine,
            handleEndTurn: actions.handleEndTurn,
            handleDiscard: actions.handleDiscard,
            cancelBracketMode: actions.cancelBracketMode,
          }}
        />
      ) : (
        <DesktopGameLayout
          currentPlayer={currentPlayer}
          state={state}
          actions={{
            checkMathEngine: actions.checkMathEngine,
            handleEndTurn: actions.handleEndTurn,
            handleDiscard: actions.handleDiscard,
            cancelBracketMode: actions.cancelBracketMode,
          }}
        />
      )}

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
          const autoTargetEffects = ['EFF_004', 'EFF_005', 'EFF_006', 'EFF_010', 'EFF_011', 'EFF_013'];

          if ((effect?.target === 'OPPONENT' || effect?.target === 'ANY') && !autoTargetEffects.includes(effect?.id || '')) { 
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