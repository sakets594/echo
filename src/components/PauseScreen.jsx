import React from 'react';
import { useGame } from '../contexts/GameContext';
import { UI_TEXT } from '../constants/GameConstants';

const PauseScreen = ({ onRestart, onQuit }) => {
    const { resumeGame } = useGame();

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
