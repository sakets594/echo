import React from 'react';
import { useGame } from '../contexts/GameContext';
import { useNoise } from '../contexts/NoiseContext';
import { useScanner } from '../contexts/ScannerContext';

const HUD = () => {
    const { gameState, hasKey, canRestart, restartGame, debugLights, pauseGame, toggleDebugLights } = useGame();
    const { noiseLevel } = useNoise();
    const { cooldownRemaining, cooldownDuration } = useScanner();

    const isMobile = window.innerWidth < 900;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>

            {/* Status Bars - Top Left */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '8px' : '10px',
                pointerEvents: 'none',
                zIndex: 1500,
                fontSize: isMobile ? '9px' : '11px',
                fontFamily: 'monospace',
                width: isMobile ? '120px' : '150px'
            }}>
                {/* Noise Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: 'white', minWidth: '45px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>NOISE:</span>
                    <div style={{
                        width: window.innerWidth < 900 ? '100px' : '150px',
                        height: window.innerWidth < 900 ? '10px' : '12px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        border: '1px solid white',
                        borderRadius: '3px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${noiseLevel}%`,
                            height: '100%',
                            backgroundColor: noiseLevel > 80 ? '#ff0000' : noiseLevel > 50 ? '#ffaa00' : '#00ff00',
                            transition: 'width 0.1s, background-color 0.3s',
                        }} />
                    </div>
                </div>

                {/* Sonar Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: 'cyan', minWidth: '45px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>SONAR:</span>
                    <div style={{
                        width: window.innerWidth < 900 ? '100px' : '150px',
                        height: window.innerWidth < 900 ? '10px' : '12px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        border: '1px solid cyan',
                        borderRadius: '3px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${((cooldownDuration - cooldownRemaining) / cooldownDuration) * 100}%`,
                            height: '100%',
                            backgroundColor: '#00ffff',
                            transition: 'width 0.1s',
                        }} />
                    </div>
                </div>

                {/* Stamina Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: 'yellow', minWidth: '45px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>ENERGY:</span>
                    <div style={{
                        width: window.innerWidth < 900 ? '100px' : '150px',
                        height: window.innerWidth < 900 ? '10px' : '12px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        border: '1px solid yellow',
                        borderRadius: '3px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `100%`,
                            height: '100%',
                            backgroundColor: '#ffff00',
                            transition: 'width 0.1s',
                        }} />
                    </div>
                </div>

                {/* Key Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                    <span style={{ color: 'white', minWidth: '45px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>KEYS:</span>
                    <span style={{
                        color: hasKey ? '#00ff00' : '#888',
                        fontWeight: 'bold',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                    }}>
                        {hasKey ? '1' : '0'} / 1
                    </span>
                </div>
            </div>

            {/* Mobile Action Buttons (Pause & Light) - Only show during gameplay */}
            {gameState === 'playing' && (
                <div style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '15px',
                    pointerEvents: 'auto',
                    zIndex: 1500
                }}>
                    <button
                        onPointerDown={(e) => {
                            e.preventDefault();
                            console.log('[HUD] Pause pointerdown');
                            pauseGame();
                        }}
                        style={{
                            background: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid white',
                            color: 'white',
                            borderRadius: '50%',
                            width: '35px',
                            height: '35px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            touchAction: 'none',
                            WebkitTapHighlightColor: 'transparent',
                            userSelect: 'none'
                        }}
                    >
                        ⏸
                    </button>

                    {/* Light button - Development Only */}
                    {import.meta.env.DEV && (
                        <button
                            onPointerDown={(e) => {
                                e.preventDefault();
                                console.log('[HUD] Light pointerdown');
                                toggleDebugLights();
                            }}
                            style={{
                                background: debugLights ? 'rgba(255, 255, 0, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                                border: '1px solid white',
                                color: 'white',
                                borderRadius: '50%',
                                width: '35px',
                                height: '35px',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'auto',
                                touchAction: 'none',
                                WebkitTapHighlightColor: 'transparent',
                                userSelect: 'none'
                            }}
                        >
                            💡
                        </button>
                    )}
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
        </div>
    );
};

export default HUD;
