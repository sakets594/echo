import React, { Suspense, useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import LevelBuilder from './components/LevelBuilder';
import Player from './components/Player';
import HUD from './components/HUD';
import { GameProvider, useGame } from './contexts/GameContext';
import { NoiseProvider } from './contexts/NoiseContext';
import { ScannerProvider } from './contexts/ScannerContext';
import { AudioProvider } from './contexts/AudioContext';
import Minimap from './components/Minimap';
import LevelSelector from './components/LevelSelector';

import { useScanner } from './contexts/ScannerContext';
import { useNoise } from './contexts/NoiseContext';
import { useControls, Leva } from 'leva';

import { LIDAR_DEFAULTS } from './constants/LidarConstants';

import { GAME_CONFIG } from './constants/GameConstants';

// Load all levels dynamically
const levelModules = import.meta.glob('./levels/*.json', { eager: true });
const allLevels = Object.values(levelModules).map(m => m.default || m).sort((a, b) => {
  // Sort by level ID number if possible
  const numA = parseInt(a.level_id.match(/\d+/)?.[0] || 0);
  const numB = parseInt(b.level_id.match(/\d+/)?.[0] || 0);
  return numA - numB;
});

import LevelCompleteOverlay from './components/LevelCompleteOverlay';

function GameScene({ levelData, onLevelComplete }) {
  const playerRef = useRef();
  const enemyRef = useRef();
  const { lastPulseOrigin, lastPulseTime } = useScanner();
  const { gameState } = useGame();
  const lightRef = useRef();

  const lidarParams = useControls('Lidar Pulse', {
    waveSpeed: { value: LIDAR_DEFAULTS.WAVE_SPEED, min: 5.0, max: 50.0 },
    fadeDuration: { value: LIDAR_DEFAULTS.FADE_DURATION, min: 0.05, max: 5.0 },
    maxDistance: { value: LIDAR_DEFAULTS.MAX_DISTANCE, min: 10.0, max: 100.0 },
    occlusion: { value: LIDAR_DEFAULTS.OCCLUSION_ENABLED },
  });

  // Calculate start position when level changes
  const startPos = useMemo(() => {
    if (!levelData) return [0, 5, 0];
    console.log(`[App] Loading Level: ${levelData.level_id}`);
    const startNode = levelData.layout.flatMap((row, z) =>
      row.split('').map((char, x) => ({ char, x, z }))
    ).find(n => n.char === 'S');

    const pos = startNode ? [startNode.x * GAME_CONFIG.CELL_SIZE, 3, startNode.z * GAME_CONFIG.CELL_SIZE] : [0, 5, 0];
    console.log(`[App] Start Node:`, startNode);
    console.log(`[App] Calculated Start Position:`, pos);
    return pos;
  }, [levelData]);

  useFrame(() => {
    // Move light to pulse origin
    if (lightRef.current) {
      lightRef.current.position.set(lastPulseOrigin[0], lastPulseOrigin[1], lastPulseOrigin[2]);
    }
  });

  // Watch for win state
  useEffect(() => {
    if (gameState === 'won') {
      onLevelComplete();
    }
  }, [gameState, onLevelComplete]);

  if (!levelData) return null;

  return (
    <>
      {/* Pulse Light for Shadows */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        intensity={10.0}
        distance={lidarParams.maxDistance}
        decay={0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.001}
        shadow-camera-near={0.1}
        shadow-camera-far={lidarParams.maxDistance}
      />

      {/* Ambient light for base visibility (very low) */}
      <ambientLight intensity={0.02} />

      <LevelBuilder levelData={levelData} playerRef={playerRef} enemyRef={enemyRef} lidarParams={lidarParams} />
      <Player startPosition={startPos} playerRef={playerRef} key={levelData.level_id} />
      {/* Key on Player forces remount on level change to reset position */}
      <Minimap levelData={levelData} playerRef={playerRef} enemyRef={enemyRef} />
      <HeartbeatSystem playerRef={playerRef} enemyRef={enemyRef} />
    </>
  );
}

function DebugPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div style={{
      position: 'absolute',
      bottom: '10px',
      left: '10px',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      pointerEvents: 'none'
    }}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          pointerEvents: 'auto',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: '1px solid #444',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '12px',
          cursor: 'pointer',
          marginBottom: '5px',
          fontFamily: 'monospace'
        }}
      >
        {isCollapsed ? 'Show Debug' : 'Hide Debug'}
      </button>

      <div style={{
        display: isCollapsed ? 'none' : 'block',
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '5px',
        borderRadius: '4px',
        pointerEvents: 'none'
      }}>
        <div id="enemy-debug-ui" style={{
          color: '#ff4444',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          fontSize: '14px',
          textShadow: '1px 1px 2px black',
          marginBottom: '5px',
          whiteSpace: 'pre-wrap'
        }}></div>
        <div id="debug-ui" style={{
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '14px',
          textShadow: '1px 1px 2px black',
          whiteSpace: 'pre-wrap'
        }}></div>
      </div>
    </div>
  );
}

function App() {
  const [currentLevel, setCurrentLevel] = useState(allLevels[0]);

  // We need access to context functions, but App is outside the providers.
  // So we create a wrapper or move the logic inside a child component.
  // For simplicity, let's create a GameContent component.
  return (
    <GameProvider>
      <NoiseProvider>
        <ScannerProvider>
          <AudioProvider>
            <GameContent
              currentLevel={currentLevel}
              setCurrentLevel={setCurrentLevel}
              allLevels={allLevels}
            />
          </AudioProvider>
        </ScannerProvider>
      </NoiseProvider>
    </GameProvider>
  );
}

import StartScreen from './components/StartScreen';
import PauseScreen from './components/PauseScreen';
import HeartbeatSystem from './components/HeartbeatSystem';

function GameContent({ currentLevel, setCurrentLevel, allLevels }) {
  const { gameState, setGameState, resetGameState, saveProgress, loadProgress, startGame, pauseGame, resumeGame } = useGame();
  const { resetNoise } = useNoise();

  // Handle Esc key for pausing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Escape') {
        if (gameState === 'playing') {
          pauseGame();
        } else if (gameState === 'paused') {
          resumeGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, pauseGame, resumeGame]);

  const handleLevelComplete = useCallback(() => {
    console.log("Level Complete! Transitioning...");
    setGameState('level_transition');

    // Skip auto-progression for test levels
    const isTestLevel = currentLevel.level_id.startsWith('test_');

    if (isTestLevel) {
      console.log("Test level - skipping auto-progression");
      setTimeout(() => {
        // Just reset the current level instead of progressing
        resetGameState();
        resetNoise();
      }, 3000);
      return;
    }

    saveProgress(currentLevel.level_id);

    setTimeout(() => {
      const currentIndex = allLevels.findIndex(l => l.level_id === currentLevel.level_id);
      const nextLevel = allLevels[currentIndex + 1];

      if (nextLevel) {
        console.log("Loading next level:", nextLevel.level_id);
        setCurrentLevel(nextLevel);
        resetGameState();
        resetNoise();
      } else {
        console.log("Game Complete!");
        // Handle Game Complete (maybe loop back to 1 or show credits)
        // For now, just reset to level 1
        setCurrentLevel(allLevels[0]);
        resetGameState();
        resetNoise();
      }
    }, 3000); // 3 seconds delay
  }, [currentLevel, allLevels, setGameState, saveProgress, resetGameState, resetNoise, setCurrentLevel]);

  const handleContinue = useCallback(() => {
    const savedLevelId = loadProgress();
    const savedLevel = allLevels.find(l => parseInt(l.level_id.match(/\d+/)?.[0] || 0) === savedLevelId);
    if (savedLevel) {
      setCurrentLevel(savedLevel);
    }
    startGame();
  }, [allLevels, loadProgress, setCurrentLevel, startGame]);

  const handleRestart = useCallback(() => {
    resetGameState();
    resetNoise();
    // Force re-render of level by toggling key or similar, but since we reset state, 
    // passing a key prop to GameScene or Player usually handles it.
    // Actually, resetGameState sets 'playing', so we just need to ensure components reset.
    // The easiest way is to just call startGame() again which sets 'playing'.
    // But to fully reset physics, we might need to remount.
    // Let's try just resetting state first.
    startGame();
  }, [resetGameState, resetNoise, startGame]);

  const handleQuit = useCallback(() => {
    setGameState('start');
    resetGameState();
    resetNoise();
  }, [setGameState, resetGameState, resetNoise]);

  const hasSavedProgress = useMemo(() => {
    const saved = loadProgress();
    return saved > 1;
  }, [loadProgress]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {gameState === 'start' && (
        <StartScreen
          onContinue={handleContinue}
          hasSavedProgress={hasSavedProgress}
        />
      )}
      {gameState === 'paused' && (
        <PauseScreen
          onRestart={handleRestart}
          onQuit={handleQuit}
        />
      )}
      <Canvas shadows camera={{ fov: 75 }}>
        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <GameScene levelData={currentLevel} onLevelComplete={handleLevelComplete} />
          </Physics>
          <Stats />
        </Suspense>
      </Canvas>
      <DebugPanel />
      <Leva collapsed />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'monospace',
        fontSize: '12px',
        pointerEvents: 'none'
      }}>
        Audio assets from Pixabay.com<br />
        Heartbeat sound from l4rzy/semicute on GitHub
      </div>
      <HUD />
      {gameState === 'level_transition' && <LevelCompleteOverlay />}
      <LevelSelector
        levels={allLevels}
        currentLevelId={currentLevel?.level_id}
        onLevelSelect={setCurrentLevel}
      />
      <div id="heartbeat-vignette" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
        opacity: 0,
        transition: 'opacity 0.1s ease-out'
      }}></div>
    </div>
  );
}

export default App;
