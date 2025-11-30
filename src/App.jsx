import React, { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
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

// Find start position from level data
const startNode = level1Data.layout.flatMap((row, z) =>
  row.split('').map((char, x) => ({ char, x, z }))
).find(n => n.char === 'S');

const startPos = startNode
  ? [startNode.x * 3, 5, startNode.z * 3]
  : [0, 5, 0];

function GameScene() {
  const playerRef = useRef();
  const enemyRef = useRef();

  return (
    <>
      {/* Removed ambient and directional lights for darkness mode */}
      {/* Geometry is now only visible via the scanner shader */}

      <LevelBuilder levelData={level1Data} playerRef={playerRef} enemyRef={enemyRef} />
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
              <Canvas>
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
