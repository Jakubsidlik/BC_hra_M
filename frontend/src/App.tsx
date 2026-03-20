
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
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
  GameSummaryDialog,
  DeckPreviewDialog,
  ModuloDialog,
  TutorialOverlay,
  LeaveGameDialog
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
  if (state.gamePhase === 'PICK_MODE') return (
    <DifficultySelection
      onSelect={(m) => {
        if (m === 'TUTORIAL') {
          actions.handleStartTutorial();
          return;
        }
        actions.setDifficulty(m);
        actions.setGamePhase('SETUP');
      }}
      onBack={() => actions.setGamePhase('MENU')}
    />
  );
  if (state.gamePhase === 'SETUP') return <SetupScreen onStart={actions.handleStartGame} />;

  // 4. HLAVNÍ HRACÍ PLOCHA
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer) return null;

  const showEffectDebug = import.meta.env.DEV;
  const status = currentPlayer.status;
  const effectDebugRows: string[] = [];

  if ((status.extraDraw || 0) > 0) effectDebugRows.push(`extraDraw: ${status.extraDraw}`);
  if ((status.drawReduction || 0) > 0) effectDebugRows.push(`drawReduction: ${status.drawReduction}`);
  if (status.mustPlayOperation) effectDebugRows.push('mustPlayOperation: true');
  if (status.operationLock) effectDebugRows.push('operationLock: true');
  if (status.numberLock) effectDebugRows.push('numberLock: true');
  if (status.playLimit !== null && status.playLimit !== undefined) effectDebugRows.push(`playLimit: ${status.playLimit}`);
  if (status.infinitePlays) effectDebugRows.push('infinitePlays: true');
  if (status.frozen) effectDebugRows.push('frozen: true');
  if (status.playAnyAsZeroNextTurn) effectDebugRows.push('playAnyAsZeroNextTurn: true');
  if (status.playAnyAsPlusNextTurn) effectDebugRows.push('playAnyAsPlusNextTurn: true');
  if (status.playAnyAsZeroReady) effectDebugRows.push('playAnyAsZeroReady: true');
  if (status.playAnyAsPlusReady) effectDebugRows.push('playAnyAsPlusReady: true');
  if (status.mathModifiers?.length) effectDebugRows.push(`mathModifiers: ${status.mathModifiers.join(', ')}`);
  if (status.notifications?.length) effectDebugRows.push(`notifications: ${status.notifications.length}`);

  return (
    <DndContext onDragEnd={actions.handleDragEnd} sensors={sensors} modifiers={[snapCenterToCursor]}>
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
      <VictoryScreen
        winner={state.winner}
        onReset={actions.returnToModeSelect}
        onShowDetails={actions.openGameSummary}
      />
      <GameSummaryDialog
        open={state.gameSummaryOpen}
        stats={state.gameStats}
        onBack={actions.closeGameSummary}
      />
      <TutorialOverlay
        active={state.tutorialActive}
        step={state.tutorialStep}
        onNext={() => actions.setTutorialStep(state.tutorialStep + 1)}
      />
      <LeaveGameDialog
        open={state.leaveGameConfirmOpen}
        onConfirm={actions.confirmLeaveGame}
        onCancel={actions.closeLeaveGameConfirm}
      />
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
        onPick={(id: string) => actions.handleMinigamePick(id)} 
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
          showEffectDebug={showEffectDebug}
          debugEffectRows={effectDebugRows}
          actions={{
            checkMathEngine: actions.checkMathEngine,
            handleEndTurn: actions.handleEndTurn,
            handleDiscard: actions.handleDiscard,
            cancelBracketMode: actions.cancelBracketMode,
            resetTutorial: actions.resetTutorial,
            skipTutorial: actions.skipTutorial,
            openLeaveGameConfirm: actions.openLeaveGameConfirm,
            setIntegralVariable: actions.setIntegralVariable,
            setDerivativeVariable: actions.setDerivativeVariable,
            setSeriesVariable: actions.setSeriesVariable,
            setLimitVariable: actions.setLimitVariable,
          }}
          tutorialReferenceBoard={state.tutorialReferenceBoard}
        />
      ) : deviceType === 'tablet' ? (
        <TabletGameLayout
          currentPlayer={currentPlayer}
          state={state}
          showEffectDebug={showEffectDebug}
          debugEffectRows={effectDebugRows}
          actions={{
            checkMathEngine: actions.checkMathEngine,
            handleEndTurn: actions.handleEndTurn,
            handleDiscard: actions.handleDiscard,
            cancelBracketMode: actions.cancelBracketMode,
            resetTutorial: actions.resetTutorial,
            skipTutorial: actions.skipTutorial,
            openLeaveGameConfirm: actions.openLeaveGameConfirm,
            setIntegralVariable: actions.setIntegralVariable,
            setDerivativeVariable: actions.setDerivativeVariable,
            setSeriesVariable: actions.setSeriesVariable,
            setLimitVariable: actions.setLimitVariable,
          }}
          tutorialReferenceBoard={state.tutorialReferenceBoard}
        />
      ) : (
        <DesktopGameLayout
          currentPlayer={currentPlayer}
          state={state}
          showEffectDebug={showEffectDebug}
          debugEffectRows={effectDebugRows}
          actions={{
            checkMathEngine: actions.checkMathEngine,
            handleEndTurn: actions.handleEndTurn,
            handleDiscard: actions.handleDiscard,
            cancelBracketMode: actions.cancelBracketMode,
            resetTutorial: actions.resetTutorial,
            skipTutorial: actions.skipTutorial,
            openLeaveGameConfirm: actions.openLeaveGameConfirm,
            setIntegralVariable: actions.setIntegralVariable,
            setDerivativeVariable: actions.setDerivativeVariable,
            setSeriesVariable: actions.setSeriesVariable,
            setLimitVariable: actions.setLimitVariable,
          }}
          tutorialReferenceBoard={state.tutorialReferenceBoard}
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