import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { MapControls, OrthographicCamera, Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Vector3, Raycaster, Vector2 } from 'three';
import { useControls, button } from 'leva';
import LevelBuilder from '../LevelBuilder';
import Enemy from '../Enemy';
import testLevelData from '../../levels/test_ai_arena.json';
import { GAME_CONFIG } from '../../constants/GameConstants';

// Mock Contexts for isolated testing
import { GameProvider, useGame } from '../../contexts/GameContext';
import { NoiseProvider } from '../../contexts/NoiseContext';
import { ScannerProvider } from '../../contexts/ScannerContext';
import { AudioProvider } from '../../contexts/AudioContext';

const { CELL_SIZE } = GAME_CONFIG;

const InteractionPlane = ({ onInteract }) => {
    const { camera, raycaster, scene } = useThree();

    const handleClick = (e) => {
        // We use the event point directly from r3f
        onInteract(e.point);
    };

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onClick={handleClick}>
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial visible={false} />
        </mesh>
    );
};

const ArenaScene = ({ mode, setLog }) => {
    const { setGameState, debugLights, toggleDebugLights } = useGame();
    const [targetOverride, setTargetOverride] = useState(null);
    const [aiTarget, setAiTarget] = useState(null);
    const [stimulusQueue, setStimulusQueue] = useState([]);

    // Virtual Player Position (for AI distance checks)
    // Default to far away so AI doesn't detect it unless we move it
    const [virtualPlayerPos, setVirtualPlayerPos] = useState(new Vector3(100, 0, 100));

    // Force Game State to Playing and Debug Lights ON
    useEffect(() => {
        setGameState('playing');
        setLog(prev => [`[SYS] Game State set to PLAYING`, ...prev]);

        // Force Debug Lights ON
        setDebugLights(true);
        setLog(prev => [`[SYS] Debug Lights Enabled`, ...prev]);

        return () => {
            // Force Debug Lights OFF on exit
            console.log('[AITestArena] Unmounting. Forcing Debug Lights OFF.');
            setDebugLights(false);
        };
    }, [setGameState, setLog, setDebugLights]);

    const handleInteract = (point) => {
        const pos = new Vector3(point.x, 1, point.z);

        if (mode === 'SET_TARGET') {
            setLog(prev => [`[CMD] Set Target: ${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}`, ...prev]);
            setTargetOverride(pos);
        } else if (mode === 'TRIGGER_SOUND') {
            setLog(prev => [`[CMD] Trigger Sound at ${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}`, ...prev]);
            setStimulusQueue(prev => [...prev, { type: 'TREMOR_LOUD', pos: pos }]);
        } else if (mode === 'TRIGGER_LIDAR') {
            setLog(prev => [`[CMD] Trigger Lidar at ${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}`, ...prev]);
            setStimulusQueue(prev => [...prev, { type: 'LIDAR', pos: pos }]);
        }
    };

    const handleAIEvent = (event) => {
        const time = (performance.now() / 1000).toFixed(1);
        setLog(prev => [`[${time}s] ${event}`, ...prev]);

        if (event === 'PathComplete' || event === 'PathStuck' || event === 'PathUnreachable') {
            if (targetOverride) {
                setLog(prev => [`[SYS] Target ${event.replace('Path', '')}. Resuming Patrol.`, ...prev]);
                setTargetOverride(null);
            }
        }
    };

    // Find spawn pos
    const spawnPos = useMemo(() => {
        let pos = [0, 2, 0];
        testLevelData.layout.forEach((row, z) => {
            row.split('').forEach((char, x) => {
                if (char === 'E') {
                    pos = [x * CELL_SIZE, 2, z * CELL_SIZE];
                }
            });
        });
        return pos;
    }, []);

    return (
        <>
            <ambientLight intensity={2.0} />
            <pointLight position={[10, 20, 10]} intensity={2} castShadow />

            <LevelBuilder
                levelData={testLevelData}
                playerRef={null}
                enemyRef={null}
                hideCeiling={true}
                highContrast={true}
                spawnEnemies={false}
            />

            <Enemy
                spawnPosition={spawnPos}
                playerRef={{ current: { translation: () => virtualPlayerPos, linvel: () => ({ x: 0, y: 0, z: 0 }), userData: {} } }}
                levelData={testLevelData}
                targetOverride={targetOverride}
                stimulusQueue={stimulusQueue}
                onAIEvent={handleAIEvent}
                onUpdateTarget={setAiTarget}
                aiConfig={{ showDebug: true }} // Force debug on
            />

            <InteractionPlane onInteract={handleInteract} />

            {/* Visual marker for manual target override */}
            {targetOverride && (
                <mesh position={[targetOverride.x, 0.5, targetOverride.z]}>
                    <sphereGeometry args={[0.3, 16, 16]} />
                    <meshBasicMaterial color="red" wireframe />
                </mesh>
            )}

            {/* Visual marker for AI's current target */}
            {aiTarget && (
                <mesh position={[aiTarget.x, 0.5, aiTarget.z]}>
                    <sphereGeometry args={[0.4, 16, 16]} />
                    <meshBasicMaterial color="#00ff00" wireframe />
                    <mesh position={[0, 1, 0]}>
                        <cylinderGeometry args={[0.05, 0.05, 2]} />
                        <meshBasicMaterial color="#00ff00" />
                    </mesh>
                </mesh>
            )}
        </>
    );
};

const AITestArena = () => {
    const [mode, setMode] = useState('SET_TARGET'); // SET_TARGET, TRIGGER_SOUND, TRIGGER_LIDAR
    const [log, setLog] = useState([]);
    const [timeScale, setTimeScale] = useState(1);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === '1') setMode('SET_TARGET');
            if (e.key === '2') setMode('TRIGGER_SOUND');
            if (e.key === '3') setMode('TRIGGER_LIDAR');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
            {/* UI Overlay */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 100,
                color: 'white',
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.8)',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #444'
            }}>
                <h2 style={{ margin: '0 0 10px 0', color: '#0f0' }}>AI TEST ARENA</h2>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ color: '#888', marginBottom: '5px' }}>INTERACTION MODE (Keys 1-3)</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            style={{
                                background: mode === 'SET_TARGET' ? '#0f0' : '#333',
                                color: mode === 'SET_TARGET' ? '#000' : '#fff',
                                border: 'none', padding: '5px 10px', cursor: 'pointer'
                            }}
                            onClick={() => setMode('SET_TARGET')}
                        >
                            1. SET TARGET
                        </button>
                        <button
                            style={{
                                background: mode === 'TRIGGER_SOUND' ? '#0f0' : '#333',
                                color: mode === 'TRIGGER_SOUND' ? '#000' : '#fff',
                                border: 'none', padding: '5px 10px', cursor: 'pointer'
                            }}
                            onClick={() => setMode('TRIGGER_SOUND')}
                        >
                            2. SOUND
                        </button>
                        <button
                            style={{
                                background: mode === 'TRIGGER_LIDAR' ? '#0f0' : '#333',
                                color: mode === 'TRIGGER_LIDAR' ? '#000' : '#fff',
                                border: 'none', padding: '5px 10px', cursor: 'pointer'
                            }}
                            onClick={() => setMode('TRIGGER_LIDAR')}
                        >
                            3. LIDAR
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ color: '#888', marginBottom: '5px' }}>TIME SCALE: {timeScale.toFixed(1)}x</div>
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={timeScale}
                        onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{ color: '#888', marginBottom: '5px' }}>EVENT LOG</div>
                <div style={{
                    height: '200px',
                    overflowY: 'auto',
                    background: '#000',
                    border: '1px solid #333',
                    padding: '5px',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                }}>
                    {log.map((entry, i) => (
                        <div key={i} style={{ marginBottom: '2px', color: entry.includes('[CMD]') ? '#aaa' : '#fff' }}>
                            {entry}
                        </div>
                    ))}
                </div>
            </div>

            <Canvas shadows>
                <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={20} near={-50} far={200} />
                <MapControls enableRotate={false} />
                <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60 * timeScale}>
                    <ArenaScene mode={mode} setLog={setLog} />
                </Physics>
                <Stats />
            </Canvas>
        </div>
    );
};

export default AITestArena;
