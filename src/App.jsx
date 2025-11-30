import React, { Suspense, useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import LevelBuilder from './components/LevelBuilder';
import Player from './components/Player';
import HUD from './components/HUD';
import { GameProvider } from './contexts/GameContext';
import { NoiseProvider } from './contexts/NoiseContext';
import { ScannerProvider } from './contexts/ScannerContext';
import { AudioProvider } from './contexts/AudioContext';
import Minimap from './components/Minimap';
import LevelSelector from './components/LevelSelector';

import { useScanner } from './contexts/ScannerContext';
import { useControls } from 'leva';

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

function GameScene({ levelData }) {
  const playerRef = useRef();
  const enemyRef = useRef();
  const { lastPulseOrigin, lastPulseTime } = useScanner();
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
    const startNode = levelData.layout.flatMap((row, z) =>
      row.split('').map((char, x) => ({ char, x, z }))
    ).find(n => n.char === 'S');
    return startNode ? [startNode.x * GAME_CONFIG.CELL_SIZE, 2, startNode.z * GAME_CONFIG.CELL_SIZE] : [0, 5, 0];
  }, [levelData]);

  useFrame(() => {
    // Move light to pulse origin
    if (lightRef.current) {
      lightRef.current.position.set(lastPulseOrigin[0], lastPulseOrigin[1], lastPulseOrigin[2]);
    }
  });

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
      />

      {/* Ambient light for base visibility (very low) */}
      <ambientLight intensity={0.02} />

      <LevelBuilder levelData={levelData} playerRef={playerRef} enemyRef={enemyRef} lidarParams={lidarParams} />
      <Player startPosition={startPos} playerRef={playerRef} key={levelData.level_id} />
      {/* Key on Player forces remount on level change to reset position */}
      <Minimap levelData={levelData} playerRef={playerRef} enemyRef={enemyRef} />
    </>
  );
}

function App() {
  const [currentLevel, setCurrentLevel] = useState(allLevels[0]);

  return (
    <GameProvider>
      <NoiseProvider>
        <ScannerProvider>
          <AudioProvider>
            <div style={{ width: '100vw', height: '100vh' }}>
              <Canvas shadows camera={{ fov: 75 }}>
                <Suspense fallback={null}>
                  <Physics gravity={[0, -9.81, 0]}>
                    <GameScene levelData={currentLevel} />
                  </Physics>
                  <Stats />
                </Suspense>
              </Canvas>
              <div id="debug-ui" style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                color: 'white',
                fontFamily: 'monospace',
                pointerEvents: 'none'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: 'monospace',
                fontSize: '12px',
                pointerEvents: 'none'
              }}>
                Audio assets from Pixabay.com
              </div>
              <HUD />
              <LevelSelector
                levels={allLevels}
                currentLevelId={currentLevel?.level_id}
                onLevelSelect={setCurrentLevel}
              />
            </div>
          </AudioProvider>
        </ScannerProvider>
      </NoiseProvider>
    </GameProvider>
  );
}

export default App;
