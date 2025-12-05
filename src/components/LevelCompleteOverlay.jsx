import React from 'react';

const LevelCompleteOverlay = ({ currentLevel, nextLevel, isTestLevel = false }) => {
    // Determine the message based on context
    let subtitle = 'Loading next sector...';

    if (isTestLevel) {
        subtitle = 'Restarting test level...';
    } else if (!nextLevel) {
        subtitle = 'Game Complete! Returning to start...';
    } else if (nextLevel) {
        subtitle = `Loading ${nextLevel.name || nextLevel.level_id}...`;
    }

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            zIndex: 1000,
            pointerEvents: 'auto' // Block interactions during transition
        }}>
            <h1 style={{
                fontSize: '4rem',
                marginBottom: '20px',
                textShadow: '0 0 10px #00ff00',
                animation: 'pulse 1s ease-in-out infinite'
            }}>
                {isTestLevel ? 'TEST COMPLETE' : 'LEVEL COMPLETE'}
            </h1>
            {currentLevel && (
                <p style={{
                    fontSize: '1.2rem',
                    opacity: 0.6,
                    marginBottom: '10px'
                }}>
                    {currentLevel.name || currentLevel.level_id}
                </p>
            )}
            <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>
                {subtitle}
            </p>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            `}</style>
        </div>
    );
};

export default LevelCompleteOverlay;
