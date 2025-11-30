import React from 'react';
import { useGame } from '../contexts/GameContext';
import { useNoise } from '../contexts/NoiseContext';
import { useScanner } from '../contexts/ScannerContext';

const HUD = () => {
    const { gameState, hasKey, canRestart, restartGame, debugLights } = useGame();
    const { noiseLevel } = useNoise();
    const { cooldownRemaining, cooldownDuration } = useScanner();

    return (
        <>
            {/* Instructions */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                color: 'white',
                fontFamily: 'monospace',
                fontSize: '14px',
                pointerEvents: 'none',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            }}>
                <div>Click to play | WASD: Move | Shift: Crouch | Ctrl: Sprint | SPACE: Clap | L: Lights</div>
                <div id="debug-pos">Pos: 0, 0, 0</div>
                <div style={{ marginTop: '10px' }}>
                    Noise: {Math.round(noiseLevel)}% | Key: {hasKey ? '✓' : '✗'} | Lights: {debugLights ? 'ON' : 'OFF'}
                </div>
            </div>

            {/* Noise Meter */}
            <div style={{
                position: 'absolute',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '300px',
                height: '20px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                border: '2px solid white',
                borderRadius: '10px',
                overflow: 'hidden',
                pointerEvents: 'none',
            }}>
                <div style={{
                    width: `${noiseLevel}%`,
                    height: '100%',
                    backgroundColor: noiseLevel > 80 ? '#ff0000' : noiseLevel > 50 ? '#ffaa00' : '#00ff00',
                    transition: 'width 0.1s, background-color 0.3s',
                }} />
            </div>

            {/* Scanner Cooldown Indicator */}
            <div style={{
                position: 'absolute',
                bottom: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '200px',
                height: '15px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                border: '2px solid cyan',
                borderRadius: '8px',
                overflow: 'hidden',
                pointerEvents: 'none',
            }}>
                <div style={{
                    width: `${((cooldownDuration - cooldownRemaining) / cooldownDuration) * 100}%`,
                    height: '100%',
                    backgroundColor: '#00ffff',
                    transition: 'width 0.1s',
                }} />
            </div>
            {cooldownRemaining > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'cyan',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                }}>
                    Scanner Cooldown: {cooldownRemaining.toFixed(1)}s
                </div>
            )}

            {/* Game Over Screen */}
            {gameState === 'lost' && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    padding: '40px',
                    borderRadius: '10px',
                    border: '3px solid #ff0000',
                    color: 'white',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    pointerEvents: 'auto',
                }}>
                    <h1 style={{ fontSize: '48px', margin: '0 0 20px 0', color: '#ff0000' }}>YOU DIED</h1>
                    <p style={{ fontSize: '18px', marginBottom: '30px' }}>The entity caught you...</p>
                    {canRestart && (
                        <button
                            onClick={restartGame}
                            style={{
                                padding: '15px 30px',
                                fontSize: '18px',
                                backgroundColor: '#ff0000',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                            }}
                        >
                            Restart
                        </button>
                    )}
                </div>
            )}

            {/* Win Screen */}
            {gameState === 'won' && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    padding: '40px',
                    borderRadius: '10px',
                    border: '3px solid #00ff00',
                    color: 'white',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    pointerEvents: 'auto',
                }}>
                    <h1 style={{ fontSize: '48px', margin: '0 0 20px 0', color: '#00ff00' }}>ESCAPED!</h1>
                    <p style={{ fontSize: '18px', marginBottom: '30px' }}>You survived the darkness...</p>
                    {canRestart && (
                        <button
                            onClick={restartGame}
                            style={{
                                padding: '15px 30px',
                                fontSize: '18px',
                                backgroundColor: '#00ff00',
                                color: 'black',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                            }}
                        >
                            Play Again
                        </button>
                    )}
                </div>
            )}
        </>
    );
};

export default HUD;
