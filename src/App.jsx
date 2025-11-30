import React, { Suspense, useRef } from 'react';
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
import level1Data from './levels/level1.json';

import { useScanner } from './contexts/ScannerContext';
import { useControls } from 'leva';

import { LIDAR_DEFAULTS } from './constants/LidarConstants';

// Find start position from level data
const startNode = level1Data.layout.flatMap((row, z) =>
  row.split('').map((char, x) => ({ char, x, z }))
).find(n => n.char === 'S');

const startPos = startNode
  ? [startNode.x * 5, 2, startNode.z * 5]
  : [0, 5, 0];

function GameScene() {
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

  useFrame(() => {
    // Move light to pulse origin
    if (lightRef.current) {
      lightRef.current.position.set(lastPulseOrigin[0], lastPulseOrigin[1], lastPulseOrigin[2]);

      // Optional: Fade light intensity based on pulse time?
      // Actually, for shadow mapping, we need the light to be "on" to cast shadows.
      // But we don't want it to illuminate the scene normally if we want pitch black.
      // However, our LidarMaterial uses the light intensity to mask the Lidar effect.
      // So we DO want it to be on.
      // We can set decay to match Lidar range.
    }
  });

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

      <LevelBuilder levelData={level1Data} playerRef={playerRef} enemyRef={enemyRef} lidarParams={lidarParams} />
      <Player startPosition={startPos} playerRef={playerRef} />
      <Minimap levelData={level1Data} playerRef={playerRef} enemyRef={enemyRef} />
    </>
  );
}

function App() {
  return (
    <GameProvider>
      <NoiseProvider>
        <ScannerProvider>
          <AudioProvider>
            <div style={{ width: '100vw', height: '100vh' }}>
              <Canvas shadows camera={{ fov: 75 }}>
                <Suspense fallback={null}>
                  <Physics gravity={[0, -9.81, 0]}>
                    <GameScene />
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
            </div>
          </AudioProvider>
        </ScannerProvider>
      </NoiseProvider>
    </GameProvider>
  );
}

export default App;
