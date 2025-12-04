import React, { useState } from 'react';

const LevelSelector = ({ levels, currentLevelId, onLevelSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
        }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: '1px solid #444',
                    borderRadius: '5px',
                    padding: '5px 10px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    marginBottom: '5px'
                }}
            >
                {isOpen ? 'Hide Levels' : 'Select Level'}
            </button>

            {isOpen && (
                <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: '10px',
                    borderRadius: '5px',
                    color: 'white',
                    fontFamily: 'monospace',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    width: '200px'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {levels.map((level) => (
                            <button
                                key={level.level_id}
                                onClick={() => {
                                    onLevelSelect(level);
                                    setIsOpen(false);
                                }}
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
            )}
        </div>
    );
};

export default LevelSelector;
