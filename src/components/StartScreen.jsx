import React from 'react';
import { useGame } from '../contexts/GameContext';
import { UI_TEXT, COLORS } from '../constants/GameConstants';

const StartScreen = ({ onContinue, hasSavedProgress }) => {
    const { startGame } = useGame();

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            fontFamily: 'monospace'
        }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '10px', textShadow: '0 0 20px #fff' }}>
                {UI_TEXT.TITLE}
            </h1>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '40px', color: '#888' }}>
                {UI_TEXT.SUBTITLE}
            </h2>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                <button
                    onClick={startGame}
                    style={{
                        padding: '15px 30px',
                        fontSize: '1.2rem',
                        backgroundColor: '#fff',
                        color: '#000',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                    }}
                >
                    NEW GAME
                </button>
                {hasSavedProgress && (
                    <button
                        onClick={onContinue}
                        style={{
                            padding: '15px 30px',
                            fontSize: '1.2rem',
                            backgroundColor: 'transparent',
                            color: '#fff',
                            border: '1px solid #fff',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontWeight: 'bold'
                        }}
                    >
                        CONTINUE
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: '60px', textAlign: 'left' }}>
                <div>
                    <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>OBJECTIVES</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {UI_TEXT.OBJECTIVES.map((obj, i) => (
                            <li key={i} style={{ marginBottom: '10px', color: '#ccc' }}>{obj}</li>
                        ))}
                    </ul>

                    <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginTop: '20px' }}>LEGEND</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {UI_TEXT.LEGEND.map((item, i) => (
                            <li key={i} style={{ marginBottom: '10px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '15px',
                                    height: '15px',
                                    backgroundColor: item.color,
                                    borderRadius: '3px',
                                    boxShadow: `0 0 5px ${item.color}`
                                }}></div>
                                <span>{item.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>CONTROLS</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {UI_TEXT.CONTROLS.map((ctrl, i) => (
                            <li key={i} style={{ marginBottom: '10px', color: '#ccc' }}>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>{ctrl.key}</span> : {ctrl.action}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div style={{ marginTop: '40px', fontSize: '0.9rem', color: '#666' }}>
                Use your <span style={{ color: '#fff' }}>Minimap</span> to survive.
            </div>
        </div>
    );
};

export default StartScreen;
