import React from 'react';

const LevelSelector = ({ levels, currentLevelId, onLevelSelect }) => {
    return (
        <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '10px',
            borderRadius: '5px',
            color: 'white',
            fontFamily: 'monospace',
            zIndex: 1000,
            maxHeight: '80vh',
            overflowY: 'auto'
        }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Select Level</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {levels.map((level) => (
                    <button
                        key={level.level_id}
                        onClick={() => onLevelSelect(level)}
                        style={{
                            padding: '5px 10px',
                            backgroundColor: currentLevelId === level.level_id ? '#4CAF50' : '#333',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '12px'
                        }}
                    >
                        {level.level_id.replace('level_', '').replace(/_/g, ' ').toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LevelSelector;
