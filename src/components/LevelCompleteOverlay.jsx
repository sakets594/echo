import React from 'react';

const LevelCompleteOverlay = () => {
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
            pointerEvents: 'none' // Allow clicks to pass through if needed, though usually we want to block
        }}>
            <h1 style={{
                fontSize: '4rem',
                marginBottom: '20px',
                textShadow: '0 0 10px #00ff00'
            }}>
                LEVEL COMPLETE
            </h1>
            <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>
                Loading next sector...
            </p>
        </div>
    );
};

export default LevelCompleteOverlay;
