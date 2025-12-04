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
    const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'won', 'lost', 'level_transition'
    const [hasKey, setHasKey] = useState(false);
    const [canRestart, setCanRestart] = useState(false);
    const [debugLights, setDebugLights] = useState(false);

    const startGame = useCallback(() => {
        setGameState('playing');
    }, []);

    const pauseGame = useCallback(() => {
        if (gameState === 'playing') {
            setGameState('paused');
        }
    }, [gameState]);

    const resumeGame = useCallback(() => {
        if (gameState === 'paused') {
            setGameState('playing');
        }
    }, [gameState]);

    const collectKey = useCallback(() => {
        setHasKey(true);
        console.log('Key collected!');
    }, []);

    const toggleDebugLights = useCallback(() => {
        console.log('debug lights toggled!');
        setDebugLights(prev => !prev);
    }, []);

    const winGame = useCallback(() => {
        console.log('Game Won!');
        setGameState('won');
        setCanRestart(true);
    }, []);

    const loseGame = useCallback(() => {
        console.log('Game Lost!');
        // Note: defeat sound plays from Enemy.jsx on attack
        setGameState('lost');
        setCanRestart(true);
    }, []);

    const restartGame = useCallback(() => {
        setGameState('playing');
        setHasKey(false);
        setCanRestart(false);
        // Force page reload to reset everything
        window.location.reload();
    }, []);

    const resetGameState = useCallback(() => {
        setGameState('playing');
        setHasKey(false);
        setCanRestart(false);
        setDebugLights(false);
    }, []);

    const saveProgress = useCallback((levelId) => {
        try {
            const currentMax = parseInt(localStorage.getItem('echo_max_level') || '1');
            const newLevel = parseInt(levelId.match(/\d+/)?.[0] || 1);
            if (newLevel > currentMax) {
                localStorage.setItem('echo_max_level', newLevel.toString());
            }
        } catch (e) {
            console.warn('Failed to save progress:', e);
        }
    }, []);

    const loadProgress = useCallback(() => {
        try {
            return parseInt(localStorage.getItem('echo_max_level') || '1');
        } catch (e) {
            console.warn('Failed to load progress:', e);
            return 1;
        }
    }, []);

    const value = {
        gameState,
        setGameState, // Export setGameState for transitions
        startGame,
        pauseGame,
        resumeGame,
        hasKey,
        canRestart,
        debugLights,
        collectKey,
        winGame,
        loseGame,
        restartGame,
        toggleDebugLights,
        setDebugLights, // Expose direct setter for safety
        resetGameState,
        saveProgress,
        loadProgress
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
