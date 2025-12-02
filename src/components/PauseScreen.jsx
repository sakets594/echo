import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { UI_TEXT } from '../constants/GameConstants';

const PauseScreen = ({ onRestart, onQuit }) => {
    const { resumeGame } = useGame();
    const [showGuide, setShowGuide] = useState(false);

    if (showGuide) {
        return (
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2001,
                fontFamily: 'monospace',
                padding: '20px'
            }}>
                <h2 style={{ color: '#ff0000', fontSize: '2rem', marginBottom: '20px' }}>SURVIVAL GUIDE</h2>

                <div style={{ maxWidth: '600px', textAlign: 'left', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: '#ff8800' }}>1. TREMORS (Movement)</h3>
                        <p><strong>Sprinting</strong> creates earthquakes. The Entity can track you through walls instantly.</p>
                        <p><strong>Walking</strong> creates whispers. It will investigate, but won't chase immediately.</p>
                        <p><strong>Crouching</strong> is silent. You disappear from its radar.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: '#00ffff' }}>2. LIDAR (Vision)</h3>
                        <p>The pulse <strong>hurts</strong> the Entity. If you scan while it is nearby, it will scream and attack.</p>
                        <p><strong>Warning:</strong> You cannot "aim" the pulse away. It is a sphere.</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: '#ff00ff' }}>3. BREATH (Proximity)</h3>
                        <p>Even if silent, the Entity can hear your heartbeat within <strong>2 meters</strong>.</p>
                        <p><strong>Panting:</strong> After sprinting, you are loud. Your breath radius triples.</p>
                        <p><strong>Hiding:</strong> Walls block this sense. Hide behind pillars to survive close encounters.</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowGuide(false)}
                    style={{
                        marginTop: '30px',
                        padding: '10px 30px',
                        fontSize: '1.2rem',
                        backgroundColor: '#fff',
                        color: '#000',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}
                >
                    BACK
                </button>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            fontFamily: 'monospace'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '40px', textShadow: '0 0 10px #fff' }}>
                PAUSED
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '300px' }}>
                <button
                    onClick={resumeGame}
                    style={{
                        padding: '15px',
                        fontSize: '1.2rem',
                        backgroundColor: '#fff',
                        color: '#000',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}
                >
                    RESUME
                </button>
                <button
                    onClick={() => setShowGuide(true)}
                    style={{
                        padding: '15px',
                        fontSize: '1.2rem',
                        backgroundColor: '#333',
                        color: '#fff',
                        border: '1px solid #fff',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}
                >
                    SURVIVAL GUIDE
                </button>
                <button
                    onClick={onRestart}
                    style={{
                        padding: '15px',
                        fontSize: '1.2rem',
                        backgroundColor: 'transparent',
                        color: '#fff',
                        border: '1px solid #fff',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}
                >
                    RESTART LEVEL
                </button>
                <button
                    onClick={onQuit}
                    style={{
                        padding: '15px',
                        fontSize: '1.2rem',
                        backgroundColor: 'transparent',
                        color: '#888',
                        border: '1px solid #888',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}
                >
                    QUIT TO MENU
                </button>
            </div>

            <div style={{ marginTop: '40px', textAlign: 'center' }}>
                <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '10px' }}>CONTROLS</h3>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
                    {UI_TEXT.CONTROLS.map((ctrl, i) => (
                        <li key={i} style={{ marginBottom: '5px', color: '#ccc' }}>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{ctrl.key}</span> : {ctrl.action}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default PauseScreen;
