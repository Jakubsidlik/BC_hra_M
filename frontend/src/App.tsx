
import { useMemo, useState } from 'react';
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, pointerWithin, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
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
import { MainMenu, RulesScreen, DifficultySelection, GameModeSelection, CustomDifficultySetupScreen } from '@/components/game/StartScreens';
import { IntegralSetupDialog } from '@/components/game/IntegralSetupDialog';
import { MobileGameLayout } from '@/components/game/MobileGameLayout';
import { TabletGameLayout } from '@/components/game/TabletGameLayout';
import { DesktopGameLayout } from '@/components/game/DesktopGameLayout';
import { AppIcon } from '@/components/ui/AppIcon';

const restrictToGameBoundary = ({
  transform,
  activeNodeRect,
}: {
  transform: { x: number; y: number; scaleX: number; scaleY: number };
  activeNodeRect: { left: number; right: number; top: number; bottom: number } | null;
}) => {
  if (!activeNodeRect || typeof document === 'undefined') {
    return transform;
  }

  const boundary = document.querySelector('[data-game-boundary="true"]') as HTMLElement | null;
  if (!boundary) {
    return transform;
  }

  const boundaryRect = boundary.getBoundingClientRect();
  const nextLeft = activeNodeRect.left + transform.x;
  const nextRight = activeNodeRect.right + transform.x;
  const nextTop = activeNodeRect.top + transform.y;
  const nextBottom = activeNodeRect.bottom + transform.y;

  let x = transform.x;
  let y = transform.y;

  if (nextLeft < boundaryRect.left) {
    x += boundaryRect.left - nextLeft;
  }
  if (nextRight > boundaryRect.right) {
    x -= nextRight - boundaryRect.right;
  }
  if (nextTop < boundaryRect.top) {
    y += boundaryRect.top - nextTop;
  }
  if (nextBottom > boundaryRect.bottom) {
    y -= nextBottom - boundaryRect.bottom;
  }

  return {
    ...transform,
    x,
    y,
  };
};

export default function App() {
  // 1. NAČTENÍ LOGIKY Z CUSTOM HOOKU
  const { state, actions } = useGameEngine();
  const deviceType = useDeviceType();
  const isIOS = deviceType === 'phone';

  // 2. SENZORY PRO DOTYK A MYŠ (Optimalizace pro mobil i PC)
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 6 } });
  const touchSensor = useSensor(
    TouchSensor,
    { activationConstraint: { delay: 0, tolerance: 2 } },
  );
  const sensors = useSensors(mouseSensor, touchSensor);
  const [isMouseDrag, setIsMouseDrag] = useState(false);
  const [tutorialOverlayHidden, setTutorialOverlayHidden] = useState(false);
  const activeModifiers = useMemo(
    () => (isMouseDrag ? [snapCenterToCursor, restrictToGameBoundary] : [restrictToGameBoundary]),
    [isMouseDrag]
  );

  const tutorialOverlayVisible = state.tutorialActive && !tutorialOverlayHidden;

  const tutorialToggleLabel = deviceType === 'phone'
    ? 'Instrukce'
    : (tutorialOverlayHidden ? 'Zobrazit instrukce' : 'Skrýt instrukce');

  const handleDragStart = (event: DragStartEvent) => {
    const activator = event.activatorEvent;
    const pointerType = 'pointerType' in activator ? activator.pointerType : undefined;
    const mouseDriven = pointerType === 'mouse' || activator instanceof MouseEvent;
    setIsMouseDrag(mouseDriven);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsMouseDrag(false);
    actions.handleDragEnd(event);
  };

  const handleDragCancel = () => {
    setIsMouseDrag(false);
  };

  // 3. VYKRESLOVÁNÍ OBRAZOVEK PODLE FÁZE HRY
  if (state.gamePhase === 'MENU') return <MainMenu onPlay={() => actions.setGamePhase('PICK_MODE')} onRules={() => actions.setGamePhase('RULES')} />;
  if (state.gamePhase === 'RULES') return <RulesScreen onBack={() => actions.setGamePhase('MENU')} />;
  if (state.gamePhase === 'PICK_MODE') return (
    <GameModeSelection
      onSelect={(mode) => {
        actions.setGameMode(mode);
        actions.setGamePhase('PICK_DIFFICULTY');
      }}
      onBack={() => actions.setGamePhase('MENU')}
    />
  );
  if (state.gamePhase === 'PICK_DIFFICULTY') return (
    <DifficultySelection
      onSelect={(m) => {
        if (m === 'TUTORIAL') {
          actions.handleStartTutorial();
          return;
        }
        if (m === 'CUSTOM') {
          actions.openCustomDifficultySetup();
          return;
        }
        actions.clearCustomDifficultyConfiguration();
        actions.setDifficulty(m);
        actions.setGamePhase('SETUP');
      }}
      onBack={() => actions.setGamePhase('PICK_MODE')}
    />
  );
  if (state.gamePhase === 'CUSTOM_DIFFICULTY') return (
    <CustomDifficultySetupScreen
      gameMode={state.gameMode}
      cardSelection={state.customCardSelection}
      cardCounts={state.customCardCounts}
      sharedGoalTurnsEnabled={state.customSharedGoalTurnsEnabled}
      sharedGoalTurns={state.customSharedGoalTurns}
      selectedCardCount={state.selectedCustomCardCount}
      onToggleCard={actions.toggleCustomCardSelection}
      onCountChange={actions.updateCustomCardCount}
      onToggleSharedGoalTurns={actions.setCustomSharedGoalTurnsEnabled}
      onSharedGoalTurnsChange={actions.setCustomSharedGoalTurns}
      onConfirm={actions.confirmCustomDifficultySetup}
      onBack={actions.closeCustomDifficultySetup}
    />
  );
  if (state.gamePhase === 'SETUP') return <SetupScreen onStart={actions.handleStartGame} onBack={() => actions.setGamePhase('MENU')} />;

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
  if (status.playAnyAsZeroReady) effectDebugRows.push('playAnyAsZeroReady: true');
  if (status.mathModifiers?.length) effectDebugRows.push(`mathModifiers: ${status.mathModifiers.join(', ')}`);
  if (status.notifications?.length) effectDebugRows.push(`notifications: ${status.notifications.length}`);

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      collisionDetection={pointerWithin}
      sensors={sensors}
      modifiers={activeModifiers}
    >
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
        winner={state.gameSummaryOpen ? null : state.winner}
        victoryReason={state.victoryReason}
        sharedGoalTotalTurns={state.sharedGoalTotalTurns}
        onReset={actions.returnToModeSelect}
        onShowDetails={actions.openGameSummary}
      />
      <GameSummaryDialog
        open={state.gameSummaryOpen}
        stats={state.gameStats}
        onBack={actions.closeGameSummary}
      />
      {state.tutorialActive && (
        <button
          type="button"
          onClick={() => setTutorialOverlayHidden(prev => !prev)}
          className="fixed left-1/2 top-4 z-130 -translate-x-1/2 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/85 px-3 py-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] text-slate-100 shadow-xl backdrop-blur-md transition-colors hover:bg-slate-900/90"
        >
          <AppIcon name="search" className="text-sm sm:text-base" />
          <span>{tutorialToggleLabel}</span>
        </button>
      )}
      <TutorialOverlay
        active={tutorialOverlayVisible}
        step={state.tutorialStep}
        onNext={() => actions.setTutorialStep(state.tutorialStep + 1)}
        gameMode={state.gameMode}
        sharedGoalTurnsRemaining={state.sharedGoalTurnsRemaining}
        sharedGoalTotalTurns={state.sharedGoalTotalTurns}
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
  currentPlayerId={currentPlayer.id}
  players={state.players} 
  handleBoardCardClick={(id: string) => {
    if (!state.targetingMode || !state.pendingEffect) return;

    if (state.targetingMode.effectId === 'EFF_002' && !state.targetingMode.sourceCardId) {
      actions.setTargetingMode({ ...state.targetingMode, sourceCardId: id });
      return;
    }

    actions.handleEffectChoice('ACTIVATE', state.targetingMode.targetPlayerId, id);
    
    actions.setTargetingMode(null);
  }} 
  onCancel={() => { actions.setTargetingMode(null); actions.setPendingEffect(null); }} 
/>

      {/* --- HLAVNÍ UI HRY --- */}
      <div data-game-boundary="true" className="relative">
        {deviceType === 'phone' ? (
          <MobileGameLayout
            currentPlayer={currentPlayer}
            state={state}
            showEffectDebug={showEffectDebug}
            debugEffectRows={effectDebugRows}
            isIOS={isIOS}
            actions={{
              checkMathEngine: actions.checkMathEngine,
              handleDiscardExpression: actions.handleDiscardExpression,
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
              handleDiscardExpression: actions.handleDiscardExpression,
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
              handleDiscardExpression: actions.handleDiscardExpression,
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
          const autoTargetEffects = ['EFF_004', 'EFF_005', 'EFF_006', 'EFF_010', 'EFF_011'];

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