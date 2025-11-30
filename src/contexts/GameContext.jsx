import React, { createContext, useContext, useState, useCallback } from 'react';

const GameContext = createContext();

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within GameProvider');
    }
    return context;
};

export const GameProvider = ({ children }) => {
    const [gameState, setGameState] = useState('playing'); // 'playing', 'won', 'lost'
    const [hasKey, setHasKey] = useState(false);
    const [canRestart, setCanRestart] = useState(false);
    const [debugLights, setDebugLights] = useState(false);

    const collectKey = useCallback(() => {
        setHasKey(true);
        console.log('Key collected!');
    }, []);

    const toggleDebugLights = useCallback(() => {
        console.log('debug lights toggled!');
        setDebugLights(prev => !prev);
    }, []);

    const winGame = useCallback(() => {
        setGameState('won');
        setCanRestart(true);
        console.log('You won!');
    }, []);

    const loseGame = useCallback(() => {
        setGameState('lost');
        setCanRestart(true);
        console.log('You died!');
    }, []);

    const restartGame = useCallback(() => {
        setGameState('playing');
        setHasKey(false);
        setCanRestart(false);
        // Force page reload to reset everything
        window.location.reload();
    }, []);

    const value = {
        gameState,
        hasKey,
        canRestart,
        debugLights,
        collectKey,
        winGame,
        loseGame,
        restartGame,
        toggleDebugLights
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
