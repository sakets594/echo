import React from 'react';
import { useGame } from '../contexts/GameContext';
import { UI_TEXT, COLORS } from '../constants/GameConstants';

const StartScreen = ({ onContinue, hasSavedProgress, onDebug }) => {
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
            fontFamily: 'monospace',
            padding: '10px',
            boxSizing: 'border-box',
            overflowY: 'auto',
            overflowX: 'hidden'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: window.innerWidth < 900 ? 'column' : 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: '1000px',
                gap: window.innerWidth < 900 ? '20px' : '40px',
                height: '100%'
            }}>
                {/* Left Column: Title & Actions */}
                <div style={{
                    flex: window.innerWidth < 900 ? '0 0 auto' : '1 1 300px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <h1 style={{
                        fontSize: window.innerWidth < 900 ? 'clamp(2.5rem, 10vw, 4rem)' : 'clamp(3rem, 8vw, 5rem)',
                        marginBottom: '5px',
                        textShadow: '0 0 20px #fff',
                        textAlign: 'center',
                        lineHeight: 1
                    }}>
                        {UI_TEXT.TITLE}
                    </h1>
                    <h2 style={{
                        fontSize: window.innerWidth < 900 ? 'clamp(0.9rem, 3vw, 1rem)' : 'clamp(1rem, 3vw, 1.2rem)',
                        marginBottom: window.innerWidth < 900 ? '15px' : '30px',
                        color: '#888',
                        textAlign: 'center'
                    }}>
                        {UI_TEXT.SUBTITLE}
                    </h2>

                    <div style={{
                        display: 'flex',
                        gap: '15px',
                        marginBottom: window.innerWidth < 900 ? '10px' : '20px',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={startGame}
                            style={{
                                padding: window.innerWidth < 900 ? '10px 20px' : '12px 24px',
                                fontSize: window.innerWidth < 900 ? '0.9rem' : '1.1rem',
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
                                    padding: window.innerWidth < 900 ? '10px 20px' : '12px 24px',
                                    fontSize: window.innerWidth < 900 ? '0.9rem' : '1.1rem',
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

                    {!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) && (
                        <button
                            onClick={onDebug}
                            style={{
                                marginBottom: '20px',
                                padding: '8px 16px',
                                fontSize: '0.9rem',
                                backgroundColor: '#333',
                                color: '#aaa',
                                border: '1px solid #555',
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                            }}
                        >
                            DEBUG MODE (AI TEST)
                        </button>
                    )}
                </div>

                {/* Right Column: Info - Hide on very small mobile screens */}
                {window.innerWidth >= 600 && (
                    <div style={{
                        flex: window.innerWidth < 900 ? '0 0 auto' : '1 1 400px',
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: window.innerWidth < 900 ? '15px' : '30px',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        padding: window.innerWidth < 900 ? '10px' : '20px',
                        borderRadius: '10px',
                        maxHeight: window.innerWidth < 900 ? '50vh' : '80vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ flex: '1 1 180px' }}>
                            <h3 style={{
                                borderBottom: '1px solid #444',
                                paddingBottom: '5px',
                                fontSize: window.innerWidth < 900 ? '0.9rem' : '1rem',
                                marginBottom: '10px'
                            }}>OBJECTIVES</h3>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: window.innerWidth < 900 ? '0.75rem' : '0.85rem' }}>
                                {UI_TEXT.OBJECTIVES.map((obj, i) => (
                                    <li key={i} style={{ marginBottom: '6px', color: '#ccc' }}>{obj}</li>
                                ))}
                            </ul>

                            <h3 style={{
                                borderBottom: '1px solid #444',
                                paddingBottom: '5px',
                                marginTop: '15px',
                                fontSize: window.innerWidth < 900 ? '0.9rem' : '1rem',
                                marginBottom: '10px'
                            }}>LEGEND</h3>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: window.innerWidth < 900 ? '0.75rem' : '0.85rem' }}>
                                {UI_TEXT.LEGEND.map((item, i) => (
                                    <li key={i} style={{ marginBottom: '6px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '10px',
                                            height: '10px',
                                            backgroundColor: item.color,
                                            borderRadius: '2px',
                                            boxShadow: `0 0 5px ${item.color}`
                                        }}></div>
                                        <span>{item.label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ flex: '1 1 180px' }}>
                            <h3 style={{
                                borderBottom: '1px solid #444',
                                paddingBottom: '5px',
                                fontSize: window.innerWidth < 900 ? '0.9rem' : '1rem',
                                marginBottom: '10px'
                            }}>CONTROLS</h3>
                            <ul style={{ listStyle: 'none', padding: 0, fontSize: window.innerWidth < 900 ? '0.75rem' : '0.85rem' }}>
                                {UI_TEXT.CONTROLS.map((ctrl, i) => (
                                    <li key={i} style={{ marginBottom: '6px', color: '#ccc' }}>
                                        <span style={{ color: '#fff', fontWeight: 'bold' }}>{ctrl.key}</span> : {ctrl.action}
                                    </li>
                                ))}
                            </ul>

                            <div style={{
                                marginTop: '20px',
                                fontSize: window.innerWidth < 900 ? '0.7rem' : '0.8rem',
                                color: '#666',
                                textAlign: 'center',
                                borderTop: '1px solid #333',
                                paddingTop: '10px'
                            }}>
                                Use your <span style={{ color: '#fff' }}>Minimap</span> to survive.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StartScreen;
